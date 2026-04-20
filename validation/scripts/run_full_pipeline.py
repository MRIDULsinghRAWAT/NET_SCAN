"""
run_full_pipeline.py — Runs NET_SCAN against all lab hosts and collects
analysis, attack chains, CVE enrichment, and graph data in one JSON file.

Usage:
    cd NET_SCAN/backend
    python ../validation/scripts/run_full_pipeline.py

Outputs:
    validation/results/run_N/netscan/scan_output_<IP>.json   (per-host raw scans)
    validation/results/run_N/netscan/pipeline_output.json    (consolidated analysis)
"""

import json
import os
import sys
import time
import shutil

# Adjust path so we can import the backend modules
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
sys.path.insert(0, BACKEND_DIR)

from app.scanner.engine import run_scanner
from app.mapping.analyzer import analyze_scan_results, calculate_attack_chains
from app.mapping.cve_lookup import lookup_cves_for_scan
from app.mapping.graph_gen import generate_attack_graph, calculate_network_exposure

# ── Configuration ──────────────────────────────────────────────────────
TARGETS = [
    "192.168.56.10",  # Metasploitable 2
    "192.168.56.20",  # Metasploitable 3 (Linux)
    "192.168.56.30",  # Metasploitable 3 (Windows)
    "192.168.56.40",  # DVWA / Mutillidae
    "192.168.56.50",  # Clean Baseline
]

START_PORT = 1
END_PORT = 1024
THREAD_COUNT = 100
CVE_PER_SERVICE = 5

# ── Determine run directory ───────────────────────────────────────────
VALIDATION_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RESULTS_DIR = os.path.join(VALIDATION_DIR, "results")

# Find next run number
existing_runs = [
    d for d in os.listdir(RESULTS_DIR)
    if os.path.isdir(os.path.join(RESULTS_DIR, d)) and d.startswith("run_")
] if os.path.isdir(RESULTS_DIR) else []

run_numbers = [int(d.split("_")[1]) for d in existing_runs if d.split("_")[1].isdigit()]
next_run = max(run_numbers, default=0) + 1

RUN_DIR = os.path.join(RESULTS_DIR, f"run_{next_run}", "netscan")
os.makedirs(RUN_DIR, exist_ok=True)

print(f"===================================================")
print(f"  NET_SCAN Validation Pipeline — Run #{next_run}")
print(f"  Targets: {len(TARGETS)} hosts")
print(f"  Port range: {START_PORT}–{END_PORT}")
print(f"  Output: {RUN_DIR}")
print(f"===================================================\n")


# ── Run pipeline ──────────────────────────────────────────────────────
all_results = {}
scan_log = []

for target in TARGETS:
    print(f"\n{'-'*50}")
    print(f"  Scanning: {target}")
    print(f"{'-'*50}")

    t_start = time.time()

    # Step 1: Port Scan
    run_scanner(target, START_PORT, END_PORT, THREAD_COUNT)
    t_scan = time.time() - t_start

    # Step 2: Load scan output
    scan_data_path = os.path.join(
        BACKEND_DIR, "app", "scanner", "data", f"scan_output_{target}.json"
    )
    if not os.path.exists(scan_data_path):
        print(f"  [!] Scan output not found for {target}, skipping.")
        continue

    with open(scan_data_path) as f:
        scan_data = json.load(f)

    # Copy raw scan output to validation results
    dest = os.path.join(RUN_DIR, f"scan_output_{target}.json")
    shutil.copy2(scan_data_path, dest)

    # Step 3: Analyze
    analysis = analyze_scan_results(scan_data)
    chains = calculate_attack_chains(analysis)

    # Step 4: CVE Enrichment (may take time due to NVD rate limits)
    print(f"  [CVE] Starting NVD enrichment for {target}...")
    cve_data = lookup_cves_for_scan(analysis, max_per_service=CVE_PER_SERVICE)

    # Step 5: Attack Graph + NES
    graph = generate_attack_graph(analysis, chains)
    exposure = calculate_network_exposure(graph)

    t_total = time.time() - t_start

    all_results[target] = {
        "scan_data_summary": scan_data.get("scan_summary", {}),
        "open_ports": scan_data.get("open_ports", {}),
        "analysis": analysis,
        "attack_chains": chains,
        "cves": cve_data,
        "graph_statistics": graph.get("statistics", {}),
        "exposure": exposure,
        "kill_chain_classification": graph.get("mitre_summary", {}),
        "timing": {
            "scan_seconds": round(t_scan, 2),
            "total_seconds": round(t_total, 2),
        }
    }

    scan_log.append({
        "target": target,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "scan_seconds": round(t_scan, 2),
        "total_seconds": round(t_total, 2),
        "open_ports_found": scan_data.get("scan_summary", {}).get("open_ports", 0),
    })

    print(f"  [+] {target} complete in {t_total:.1f}s | "
          f"Open ports: {scan_data.get('scan_summary', {}).get('open_ports', 0)} | "
          f"NES: {exposure.get('severity', 'N/A')}")


# ── Save consolidated output ─────────────────────────────────────────
output_path = os.path.join(RUN_DIR, "pipeline_output.json")
with open(output_path, "w") as f:
    json.dump(all_results, f, indent=2)

log_path = os.path.join(RUN_DIR, "scan_log.json")
with open(log_path, "w") as f:
    json.dump(scan_log, f, indent=2)

print(f"\n{'='*50}")
print(f"  Pipeline complete. Run #{next_run}")
print(f"  Results: {output_path}")
print(f"  Log:     {log_path}")
print(f"{'='*50}")
