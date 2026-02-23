from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

from scanner import engine

app = Flask(__name__)
CORS(app)

# main.py ke andar
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# path where engine.save_results writes the output
DATA_PATH = os.path.join(BASE_DIR, 'scanner', 'data', 'scan_output.json')


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

        # run scanner (this call is blocking until scan completes)
        engine.run_scanner(target, start, end, threads)

        # read back saved results
        if not os.path.exists(DATA_PATH):
            return jsonify({"status": "error", "message": "Scan completed but output file missing"}), 500

        with open(DATA_PATH, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)