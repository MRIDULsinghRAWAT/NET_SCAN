from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import json
import os

from scanner import engine
from scanner import streamer
import threading
import time

app = Flask(__name__)
CORS(app)

# main.py ke andar
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# path where engine.save_results writes the output
DATA_PATH = os.path.join(BASE_DIR, 'scanner', 'data', 'scan_output.json')


scan_thread = None
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
    # GET: just return existing file if present
    if request.method == 'GET':
        print(f">>> Flask is looking for file at: {DATA_PATH}")
        try:
            if not os.path.exists(DATA_PATH):
                return jsonify({"error": f"File not found at {DATA_PATH}"}), 404
            with open(DATA_PATH, 'r') as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    # POST: run scan with provided params
    try:
        payload = request.get_json(force=True)
        target = payload.get('target') or payload.get('ip')
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

        # If a scan is already running, reject concurrent starts
        global scan_thread, scan_state
        if scan_state["running"]:
            return jsonify({"status": "error", "message": "A scan is already running", "target": scan_state.get("target")}), 409
        # create an event stream for this target so clients can subscribe
        try:
            streamer.create_stream(target)
        except Exception:
            pass

        def _background_scan(tgt, s, e, th):
            try:
                scan_state["running"] = True
                scan_state["target"] = tgt
                scan_state["started_at"] = time.time()
                engine.run_scanner(tgt, s, e, th)
            finally:
                scan_state["running"] = False

        scan_thread = threading.Thread(target=_background_scan, args=(target, start, end, threads), daemon=True)
        scan_thread.start()

        # Immediately return accepted — frontend can poll /api/scan-status and GET the results
        return jsonify({"status": "started", "target": target}), 202
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/scan-status', methods=['GET'])
def scan_status():
    global scan_state
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