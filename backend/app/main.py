from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import json
import os

from scanner import engine
from scanner import streamer
from mapping import analyzer
from mapping import graph_gen
import threading
import time

app = Flask(__name__)
CORS(app)

# main.py ke andar
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# path where engine.save_results writes the output
DATA_PATH = os.path.join(BASE_DIR, 'scanner', 'data', 'scan_output.json')


scan_thread = None
scan_lock = threading.Lock()  # protects scan_thread and scan_state
scan_state = {
    "running": False,
    "target": None,
    "started_at": None
}


@app.route('/api/start-scan', methods=['GET', 'POST'])
def start_scan():
    """
    Supports GET (returns last saved scan_output.json) and
    POST (accepts JSON: { target, start, end, threads }) to run a new scan.
    """
    # Ensure we refer to module-level scan state/thread variables
    global scan_thread, scan_state

    # GET: return existing file if present — normalize older formats
    if request.method == 'GET':
        # Allow callers to request per-target results: /api/start-scan?target=1.2.3.4
        req_target = request.args.get('target')
        try:
            if req_target:
                # attempt to open per-target file
                safe = str(req_target).replace(':', '_').replace('/', '_').replace(' ', '_')
                per_target_file = os.path.join(os.path.dirname(DATA_PATH), f"scan_output_{safe}.json")
                print(f">>> Flask: looking for per-target file at: {per_target_file}")
                if os.path.exists(per_target_file):
                    with open(per_target_file, 'r') as f:
                        return jsonify(json.load(f))
                # If not found, fall back to the generic file below

            print(f">>> Flask is looking for file at: {DATA_PATH}")
            if not os.path.exists(DATA_PATH):
                return jsonify({"error": f"File not found at {DATA_PATH}"}), 404
            with open(DATA_PATH, 'r') as f:
                data = json.load(f)

            # Normalize legacy scan_output formats so frontend always sees
            # { target: ..., discovered_services: { port: service } }
            if isinstance(data, dict) and 'target' in data and 'discovered_services' in data:
                return jsonify(data)

            # Legacy scanner_script produced a 'vulnerabilities' list — wrap it
            if isinstance(data, dict) and 'vulnerabilities' in data:
                tgt = scan_state.get('target') or data.get('target') or 'unknown'
                normalized = {
                    'target': tgt,
                    'discovered_services': {},
                    'raw': data
                }
                return jsonify(normalized)

            # Fallback: return object with raw data included so UI doesn't break
            return jsonify({'target': scan_state.get('target') or 'unknown', 'discovered_services': {}, 'raw': data})
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    # POST: run scan with provided params
    try:
        payload = request.get_json(force=True)
        # Accept either 'target' or 'ip' keys; ensure it's a clean string
        target = payload.get('target') or payload.get('ip')
        if target is not None:
            target = str(target).strip()
        start = int(payload.get('start', 1))
        end = int(payload.get('end', 1024))
        threads = int(payload.get('threads', 100))

        if not target:
            return jsonify({"status": "error", "message": "Missing 'target' (ip) parameter"}), 400

        # sanitize ranges
        if start < 1:
            start = 1
        if end < start:
            end = start

        print(f">>> Received scan request: {target} {start}-{end} threads={threads}")

        # If a scan is already running, cancel it first so the new one can start
        with scan_lock:
            if scan_state["running"]:
                print(f">>> Cancelling previous scan on {scan_state.get('target')}...")
                engine.cancel_active_scan()
                # Give old thread a moment to clean up
                old_thread = scan_thread
                if old_thread and old_thread.is_alive():
                    old_thread.join(timeout=3)
                scan_state["running"] = False
                scan_thread = None

        # create an event stream for this target so clients can subscribe
        try:
            streamer.create_stream(target)
        except Exception:
            pass

        def _background_scan(tgt, s, e, th):
            try:
                with scan_lock:
                    scan_state["running"] = True
                    scan_state["target"] = tgt
                    scan_state["started_at"] = time.time()

                # STEP 1: Run the Port Scanner
                engine.run_scanner(tgt, s, e, th)

                # STEP 2: Intelligence Pipeline - After scan completes
                print(f"\n>>> ========== INTELLIGENCE PIPELINE START ==========")
                print(f">>> Analyzing scan results for {tgt}...")

                # Read the scan results that were just saved
                safe_target = tgt.replace(':', '_').replace('/', '_').replace(' ', '_')
                per_target_file = os.path.join(os.path.dirname(DATA_PATH), f"scan_output_{safe_target}.json")

                if os.path.exists(per_target_file):
                    with open(per_target_file, 'r') as f:
                        scan_data = json.load(f)

                    # 2A: Risk Analysis
                    print(f">>> [2A] Analyzing risk levels...")
                    analyzed_data = analyzer.analyze_scan_results(scan_data)
                    vuln_summary = analyzed_data.get('vulnerable_ports', {})
                    print(f">>> Found {vuln_summary.get('critical', 0)} Critical, {vuln_summary.get('high', 0)} High, {vuln_summary.get('medium', 0)} Medium vulnerabilities")

                    # Push risk analysis to frontend
                    try:
                        streamer.push_event(tgt, {
                            "type": "analysis",
                            "target": tgt,
                            "analysis": analyzed_data,
                            "timestamp": time.time()
                        })
                    except Exception as e:
                        print(f">>> Error pushing analysis: {e}")

                    # 2B: Attack Chain Detection
                    print(f">>> [2B] Detecting attack chains...")
                    attack_chains = analyzer.calculate_attack_chains(analyzed_data)
                    print(f">>> Found {attack_chains.get('total_chains', 0)} potential attack chains")

                    # 2C: Graph Generation
                    print(f">>> [2C] Generating attack path graph...")
                    graph_data = graph_gen.generate_attack_graph(analyzed_data, attack_chains)
                    graph_stats = graph_data.get('statistics', {})
                    print(f">>> Graph: {graph_stats.get('total_nodes', 0)} nodes, {graph_stats.get('total_edges', 0)} edges")

                    # 2D: Network Exposure Calculation
                    print(f">>> [2D] Calculating network exposure...")
                    exposure = graph_gen.calculate_network_exposure(graph_data)
                    print(f">>> Network Exposure Score: {exposure.get('exposure_score', 0)}/100 [{exposure.get('severity', 'UNKNOWN')}]")

                    # Push complete intelligence package to frontend
                    try:
                        streamer.push_event(tgt, {
                            "type": "graph",
                            "target": tgt,
                            "graph": graph_data,
                            "exposure_score": exposure,
                            "attack_chains": attack_chains,
                            "timestamp": time.time()
                        })
                    except Exception as e:
                        print(f">>> Error pushing graph: {e}")

                    print(f">>> ========== INTELLIGENCE PIPELINE COMPLETE ==========\n")
                else:
                    print(f">>> ERROR: Could not find scan output at {per_target_file}")

            except Exception as ex:
                print(f">>> CRITICAL SCAN ERROR: {ex}")
                import traceback
                traceback.print_exc()
                # Ensure streamer sends a complete event even on error
                try:
                    streamer.push_event(tgt, {
                        "type": "complete",
                        "target": tgt,
                        "discovered_services": {},
                        "error": str(ex),
                        "timestamp": time.time()
                    })
                    streamer.close_stream(tgt)
                except Exception:
                    pass
            finally:
                with scan_lock:
                    scan_state["running"] = False
                    scan_state["target"] = None

        with scan_lock:
            scan_thread = threading.Thread(target=_background_scan, args=(target, start, end, threads), daemon=True)
            scan_thread.start()

        # Immediately return accepted — frontend can poll /api/scan-status and GET the results
        return jsonify({"status": "started", "target": target}), 202
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/scan-status', methods=['GET'])
def scan_status():
    with scan_lock:
        return jsonify({
            "running": bool(scan_state.get("running", False)),
            "target": scan_state.get("target"),
            "started_at": scan_state.get("started_at")
        })


@app.route('/api/scan-stream', methods=['GET'])
def scan_stream():
    """SSE endpoint that streams partial scan results for a target.
    Client should call: /api/scan-stream?target=1.2.3.4
    """
    target = request.args.get('target')
    if not target:
        return jsonify({"status": "error", "message": "Missing 'target' query parameter"}), 400

    q = streamer.get_event_queue(target)

    def event_stream():
        while True:
            item = q.get()
            if item is None:
                break
            try:
                yield f"data: {json.dumps(item)}\n\n"
            except Exception:
                # ignore serialization issues and continue
                pass

    return Response(stream_with_context(event_stream()), mimetype='text/event-stream')


if __name__ == '__main__':
    app.run(debug=True, port=5000)