"""
classify_and_score.py — Classifies scanner findings as TP / FP / FN,
calculates precision, recall, F1, and FPR, and outputs results per-scanner
and per-host.

Usage:
    python classify_and_score.py \
        --ground-truth ../ground_truth/ground_truth.csv \
        --findings     ../analysis/normalized_findings.csv \
        --output-dir   ../analysis/

Outputs:
    classified_results.csv   — Every finding tagged TP / FP / FN
    metrics_summary.json     — Aggregate + per-host + per-scanner metrics
    metrics_summary.txt      — Human-readable summary
"""

import csv
import json
import argparse
import os
from collections import defaultdict


def load_ground_truth(filepath):
    """
    Load ground truth CSV.
    Expected columns: Host, Port, Protocol, Service, Version, Known_Vuln, CVE_ID, Category
    """
    gt = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            gt.append({
                "host": row.get("Host", "").strip(),
                "port": int(row.get("Port", 0)),
                "service": row.get("Service", "").strip(),
                "version": row.get("Version", "").strip(),
                "known_vuln": row.get("Known_Vuln", "").strip(),
                "cve_id": row.get("CVE_ID", "").strip(),
                "category": row.get("Category", "").strip(),
            })
    return gt


def load_findings(filepath):
    """Load normalized findings CSV."""
    findings = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            findings.append({
                "scanner": row.get("scanner", "").strip(),
                "host": row.get("host", "").strip(),
                "port": int(row.get("port", 0)),
                "service": row.get("service", "").strip(),
                "version": row.get("version", "").strip(),
                "vulnerabilities": row.get("vulnerabilities", "").strip(),
                "severity": row.get("severity", "").strip(),
                "status": row.get("status", "").strip(),
            })
    return findings


def classify(ground_truth, findings, scanner_name):
    """
    Classify findings for a specific scanner as TP, FP, or FN.

    Detection is evaluated at the (host, port) level:
      - TP: scanner found an open port that IS in the ground truth
      - FP: scanner found an open port that is NOT in the ground truth
      - FN: ground truth port that the scanner did NOT detect
    """
    # Filter to only this scanner's findings (open ports only)
    scanner_findings = [
        f for f in findings
        if f["scanner"] == scanner_name and f["status"] == "open"
    ]

    # Build lookup sets
    scanner_set = {(f["host"], f["port"]) for f in scanner_findings}
    gt_set = {(g["host"], g["port"]) for g in ground_truth}

    results = []

    # True Positives: in both GT and scanner
    tp_keys = scanner_set & gt_set
    for key in tp_keys:
        gt_entry = next(g for g in ground_truth if (g["host"], g["port"]) == key)
        sc_entry = next(f for f in scanner_findings if (f["host"], f["port"]) == key)
        results.append({
            "scanner": scanner_name,
            "classification": "TP",
            "host": key[0],
            "port": key[1],
            "gt_service": gt_entry["service"],
            "gt_vuln": gt_entry["known_vuln"],
            "gt_cve": gt_entry["cve_id"],
            "scanner_service": sc_entry["service"],
            "scanner_vulns": sc_entry["vulnerabilities"],
        })

    # False Positives: in scanner but NOT in GT
    fp_keys = scanner_set - gt_set
    for key in fp_keys:
        sc_entry = next(f for f in scanner_findings if (f["host"], f["port"]) == key)
        results.append({
            "scanner": scanner_name,
            "classification": "FP",
            "host": key[0],
            "port": key[1],
            "gt_service": "—",
            "gt_vuln": "—",
            "gt_cve": "—",
            "scanner_service": sc_entry["service"],
            "scanner_vulns": sc_entry["vulnerabilities"],
        })

    # False Negatives: in GT but NOT in scanner
    fn_keys = gt_set - scanner_set
    for key in fn_keys:
        gt_entry = next(g for g in ground_truth if (g["host"], g["port"]) == key)
        results.append({
            "scanner": scanner_name,
            "classification": "FN",
            "host": key[0],
            "port": key[1],
            "gt_service": gt_entry["service"],
            "gt_vuln": gt_entry["known_vuln"],
            "gt_cve": gt_entry["cve_id"],
            "scanner_service": "—",
            "scanner_vulns": "—",
        })

    return results


def compute_metrics(classified_results):
    """Compute precision, recall, F1, and FPR from classified results."""
    tp = sum(1 for r in classified_results if r["classification"] == "TP")
    fp = sum(1 for r in classified_results if r["classification"] == "FP")
    fn = sum(1 for r in classified_results if r["classification"] == "FN")

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tp) if (fp + tp) > 0 else 0.0

    return {
        "TP": tp, "FP": fp, "FN": fn,
        "Precision": round(precision, 4),
        "Recall": round(recall, 4),
        "F1_Score": round(f1, 4),
        "FPR": round(fpr, 4),
        "Total_Findings": tp + fp,
    }


def main():
    parser = argparse.ArgumentParser(description="Classify findings and compute metrics")
    parser.add_argument("--ground-truth", required=True, help="Path to ground_truth.csv")
    parser.add_argument("--findings", required=True, help="Path to normalized_findings.csv")
    parser.add_argument("--output-dir", default=".", help="Output directory for results")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    # Load data
    gt = load_ground_truth(args.ground_truth)
    findings = load_findings(args.findings)

    print(f"[*] Ground truth entries: {len(gt)}")
    print(f"[*] Total findings: {len(findings)}")

    # Discover scanners
    scanners = sorted(set(f["scanner"] for f in findings))
    print(f"[*] Scanners detected: {scanners}")

    # Classify per scanner
    all_classified = []
    metrics_by_scanner = {}

    for scanner in scanners:
        classified = classify(gt, findings, scanner)
        all_classified.extend(classified)
        metrics = compute_metrics(classified)
        metrics_by_scanner[scanner] = metrics

        print(f"\n  {scanner}:")
        print(f"    TP={metrics['TP']}  FP={metrics['FP']}  FN={metrics['FN']}")
        print(f"    Precision={metrics['Precision']}  Recall={metrics['Recall']}  F1={metrics['F1_Score']}")

    # Per-host metrics for each scanner
    hosts = sorted(set(g["host"] for g in gt))
    per_host = {}
    for host in hosts:
        per_host[host] = {}
        host_gt = [g for g in gt if g["host"] == host]

        for scanner in scanners:
            host_classified = [
                r for r in all_classified
                if r["scanner"] == scanner and r["host"] == host
            ]
            per_host[host][scanner] = compute_metrics(host_classified)

    # ── Write outputs ────────────────────────────────────────────────
    # 1. Classified results CSV
    csv_path = os.path.join(args.output_dir, "classified_results.csv")
    fieldnames = [
        "scanner", "classification", "host", "port",
        "gt_service", "gt_vuln", "gt_cve",
        "scanner_service", "scanner_vulns"
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_classified)
    print(f"\n[✓] Classified results: {csv_path}")

    # 2. Metrics JSON
    metrics_output = {
        "aggregate": metrics_by_scanner,
        "per_host": per_host,
    }
    json_path = os.path.join(args.output_dir, "metrics_summary.json")
    with open(json_path, "w") as f:
        json.dump(metrics_output, f, indent=2)
    print(f"[✓] Metrics JSON: {json_path}")

    # 3. Human-readable summary
    txt_path = os.path.join(args.output_dir, "metrics_summary.txt")
    with open(txt_path, "w") as f:
        f.write("=" * 60 + "\n")
        f.write("  NET_SCAN Validation — Metrics Summary\n")
        f.write("=" * 60 + "\n\n")

        f.write("AGGREGATE RESULTS\n")
        f.write("-" * 60 + "\n")
        f.write(f"{'Scanner':<15} {'TP':>5} {'FP':>5} {'FN':>5} {'Prec':>8} {'Recall':>8} {'F1':>8}\n")
        f.write("-" * 60 + "\n")
        for scanner, m in metrics_by_scanner.items():
            f.write(f"{scanner:<15} {m['TP']:>5} {m['FP']:>5} {m['FN']:>5} "
                    f"{m['Precision']:>8.4f} {m['Recall']:>8.4f} {m['F1_Score']:>8.4f}\n")

        f.write("\n\nPER-HOST BREAKDOWN (NET_SCAN)\n")
        f.write("-" * 60 + "\n")
        if "NET_SCAN" in scanners:
            for host in hosts:
                m = per_host[host].get("NET_SCAN", {})
                f.write(f"  {host:<20} TP={m.get('TP', 0):>3}  FP={m.get('FP', 0):>3}  "
                        f"FN={m.get('FN', 0):>3}  Recall={m.get('Recall', 0):.4f}\n")

    print(f"[✓] Summary text: {txt_path}")


if __name__ == "__main__":
    main()
