from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from flasgger import Flasgger
import json
import os

from scanner import engine
from scanner import streamer
from mapping import analyzer
from mapping import graph_gen
from mapping import cve_lookup
from reporting.pdf_generator import generate_pdf_report
import threading
import time

app = Flask(__name__)
CORS(app)
Flasgger(app)

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


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Railway"""
    return jsonify({"status": "ok", "message": "NET_SCAN backend is running"}), 200


@app.route('/api/start-scan', methods=['GET', 'POST'])
def start_scan():
    """
    Start a network scan or retrieve previous scan results
    ---
    get:
      summary: Get last scan results
      description: Retrieve previously saved scan results for a target
      parameters:
        - name: target
          in: query
          type: string
          required: false
          description: IP address or CIDR range (e.g., 192.168.1.0/24)
      responses:
        200:
          description: Scan results found
          schema:
            type: object
            properties:
              target:
                type: string
              discovered_services:
                type: object
        404:
          description: No scan results found
        500:
          description: Server error
    post:
      summary: Start new network scan
      description: Begin a new network scan with specified parameters
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
            required:
              - target
            properties:
              target:
                type: string
                description: IP address or CIDR range to scan
              start:
                type: integer
                default: 1
                description: Starting port number
              end:
                type: integer
                default: 1024
                description: Ending port number
              threads:
                type: integer
                default: 100
                description: Number of scanning threads
      responses:
        202:
          description: Scan started successfully
          schema:
            type: object
            properties:
              status:
                type: string
              target:
                type: string
        400:
          description: Missing required parameters
        500:
          description: Server error
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

                    # 2E: CVE Database Lookup (NVD API)
                    print(f">>> [2E] Querying NVD for CVEs...")
                    cve_data = {}
                    try:
                        cve_data = cve_lookup.lookup_cves_for_scan(analyzed_data, max_per_service=3)
                        print(f">>> CVE Lookup: {cve_data.get('total_cves', 0)} CVEs found")
                    except Exception as cve_err:
                        print(f">>> CVE Lookup failed (non-fatal): {cve_err}")
                        cve_data = {'total_cves': 0, 'critical_cves': 0, 'high_cves': 0, 'services': {}, 'all_cves': []}

                    # Push complete intelligence package to frontend
                    try:
                        streamer.push_event(tgt, {
                            "type": "graph",
                            "target": tgt,
                            "graph": graph_data,
                            "exposure_score": exposure,
                            "attack_chains": attack_chains,
                            "cve_data": cve_data,
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
    """
    Get current scan status
    ---
    get:
      summary: Check if scan is running
      description: Returns current scan status and metadata
      responses:
        200:
          description: Status retrieved successfully
          schema:
            type: object
            properties:
              running:
                type: boolean
              target:
                type: string
              started_at:
                type: number
    """
    with scan_lock:
        return jsonify({
            "running": bool(scan_state.get("running", False)),
            "target": scan_state.get("target"),
            "started_at": scan_state.get("started_at")
        })


@app.route('/api/scan-stream', methods=['GET'])
def scan_stream():
    """
    Real-time scan results stream (Server-Sent Events)
    ---
    get:
      summary: Stream scan results in real-time
      description: SSE endpoint for real-time scan analysis, graph generation, and CVE data
      parameters:
        - name: target
          in: query
          type: string
          required: true
          description: Target IP address to stream results for
      responses:
        200:
          description: Event stream established
          schema:
            type: object
            properties:
              type:
                type: string
                enum: [analysis, graph, complete]
              target:
                type: string
              timestamp:
                type: number
        400:
          description: Missing target parameter
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


@app.route('/api/what-if', methods=['POST'])
def what_if():
    """
    What-if analysis: simulate port removal impact
    ---
    post:
      summary: Simulate removing a port and calculate impact
      description: Analyze how removing a specific port/service affects the attack surface
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
            required:
              - port
              - graph_data
            properties:
              port:
                type: string
                description: Port number to simulate removing (e.g., "445")
              graph_data:
                type: object
                description: Current graph data from scan results
      responses:
        200:
          description: What-if analysis completed
          schema:
            type: object
            properties:
              original_exposure:
                type: number
              new_exposure:
                type: number
              impact:
                type: string
              removed_paths:
                type: integer
              affected_nodes:
                type: integer
        400:
          description: Missing parameters
        500:
          description: Processing error
    """
    try:
        payload = request.get_json(force=True)
        port = payload.get('port')
        graph_data = payload.get('graph_data')

        if not port or not graph_data:
            return jsonify({"error": "Missing 'port' or 'graph_data'"}), 400

        result = graph_gen.what_if_remove_port(graph_data, port)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
#  REPORTING ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@app.route('/api/download-report', methods=['GET'])
def download_report():
    """
    Download professional PDF report
    ---
    get:
      summary: Generate and download PDF report
      description: Creates a professional PDF report of the latest scan
      responses:
        200:
          description: PDF report ready for download
          schema:
            type: file
        404:
          description: No scan data available
        500:
          description: Report generation failed
    """
    from flask import send_file
    try:
        data_dir = os.path.join(BASE_DIR, 'scanner', 'data')
        scan_file = os.path.join(data_dir, 'scan_output.json')
        
        if not os.path.exists(scan_file):
            return jsonify({"error": "No scan data found to generate report."}), 404
            
        pdf_path = generate_pdf_report(scan_file)
        
        return send_file(
            pdf_path, 
            as_attachment=True, 
            download_name=os.path.basename(pdf_path),
            mimetype='application/pdf'
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate report: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)