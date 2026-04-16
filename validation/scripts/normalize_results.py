"""
normalize_results.py — Converts outputs from NET_SCAN, Nmap (XML), and Nuclei (JSON)
into a unified CSV format for comparison.

Usage:
    python normalize_results.py \
        --netscan  ../results/run_1/netscan/pipeline_output.json \
        --nmap     ../results/run_1/nmap_results.xml \
        --nuclei   ../results/run_1/nuclei_results.json \
        --output   ../analysis/normalized_findings.csv
"""

import json
import csv
import argparse
import xml.etree.ElementTree as ET
import os


def normalize_netscan(filepath):
    """Parse NET_SCAN pipeline_output.json into normalized findings."""
    with open(filepath) as f:
        data = json.load(f)

    findings = []
    for target, result in data.items():
        open_ports = result.get("open_ports", {})
        for port_str, port_info in open_ports.items():
            if isinstance(port_info, dict) and port_info.get("status") == "open":
                vulns = port_info.get("vulnerabilities", [])
                findings.append({
                    "scanner": "NET_SCAN",
                    "host": target,
                    "port": int(port_str),
                    "protocol": "tcp",
                    "service": port_info.get("service", "Unknown"),
                    "version": "",  # NET_SCAN stores version in service field via banner
                    "vulnerability_count": len(vulns),
                    "vulnerabilities": "; ".join(vulns) if vulns else "",
                    "severity": "",  # Populated later from analysis
                    "status": "open"
                })

        # Enrich with analysis risk levels
        analysis = result.get("analysis", {}).get("analysis", [])
        risk_map = {str(a["port"]): a.get("risk_level", "") for a in analysis}
        for f in findings:
            if f["host"] == target:
                f["severity"] = risk_map.get(str(f["port"]), "")

    return findings


def normalize_nmap_xml(filepath):
    """Parse Nmap XML output into normalized findings."""
    if not os.path.exists(filepath):
        print(f"[!] Nmap file not found: {filepath}")
        return []

    tree = ET.parse(filepath)
    root = tree.getroot()
    findings = []

    for host in root.findall('.//host'):
        addr_el = host.find('.//address[@addrtype="ipv4"]')
        if addr_el is None:
            continue
        ip_addr = addr_el.get('addr')

        for port_el in host.findall('.//port'):
            port_num = int(port_el.get('portid'))
            protocol = port_el.get('protocol', 'tcp')

            state_el = port_el.find('state')
            state = state_el.get('state', 'unknown') if state_el is not None else 'unknown'

            svc = port_el.find('service')
            service_name = svc.get('name', 'unknown') if svc is not None else 'unknown'
            version = svc.get('version', '') if svc is not None else ''
            product = svc.get('product', '') if svc is not None else ''

            vulns = []
            for script in port_el.findall('.//script'):
                script_id = script.get('id', '')
                if 'vuln' in script_id.lower():
                    output = script.get('output', '')
                    # Extract CVE IDs from script output
                    for word in output.split():
                        if word.startswith('CVE-'):
                            vulns.append(word.strip(',.:;'))
                    if not vulns:
                        vulns.append(script_id)

            findings.append({
                "scanner": "Nmap",
                "host": ip_addr,
                "port": port_num,
                "protocol": protocol,
                "service": f"{product} {service_name}".strip(),
                "version": version,
                "vulnerability_count": len(vulns),
                "vulnerabilities": "; ".join(vulns) if vulns else "",
                "severity": "",
                "status": state
            })

    return findings


def normalize_nuclei_json(filepath):
    """Parse Nuclei JSONL output into normalized findings."""
    if not os.path.exists(filepath):
        print(f"[!] Nuclei file not found: {filepath}")
        return []

    findings = []
    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            host = entry.get("host", "")
            # Extract IP from URL if needed
            if "://" in host:
                host = host.split("://")[1].split("/")[0].split(":")[0]

            port = entry.get("port", 0)
            if not port and ":" in entry.get("host", ""):
                try:
                    port = int(entry["host"].rsplit(":", 1)[1])
                except (ValueError, IndexError):
                    port = 0

            template_id = entry.get("template-id", "")
            matched_at = entry.get("matched-at", "")
            severity = entry.get("info", {}).get("severity", "")
            name = entry.get("info", {}).get("name", "")
            cve_id = ""
            classification = entry.get("info", {}).get("classification", {})
            if classification:
                cve_ids = classification.get("cve-id", [])
                if cve_ids:
                    cve_id = "; ".join(cve_ids) if isinstance(cve_ids, list) else str(cve_ids)

            findings.append({
                "scanner": "Nuclei",
                "host": host,
                "port": port,
                "protocol": "tcp",
                "service": name,
                "version": "",
                "vulnerability_count": 1,
                "vulnerabilities": cve_id if cve_id else template_id,
                "severity": severity,
                "status": "open"
            })

    return findings


def write_csv(findings, output_path):
    """Write normalized findings to CSV."""
    if not findings:
        print("[!] No findings to write.")
        return

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    fieldnames = [
        "scanner", "host", "port", "protocol", "service",
        "version", "vulnerability_count", "vulnerabilities",
        "severity", "status"
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(findings)

    print(f"[✓] Wrote {len(findings)} findings to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Normalize scanner results to unified CSV")
    parser.add_argument("--netscan", help="Path to NET_SCAN pipeline_output.json")
    parser.add_argument("--nmap", help="Path to Nmap XML output")
    parser.add_argument("--nuclei", help="Path to Nuclei JSONL output")
    parser.add_argument("--output", default="normalized_findings.csv",
                        help="Output CSV path")
    args = parser.parse_args()

    all_findings = []

    if args.netscan:
        print(f"[*] Parsing NET_SCAN: {args.netscan}")
        all_findings.extend(normalize_netscan(args.netscan))

    if args.nmap:
        print(f"[*] Parsing Nmap: {args.nmap}")
        all_findings.extend(normalize_nmap_xml(args.nmap))

    if args.nuclei:
        print(f"[*] Parsing Nuclei: {args.nuclei}")
        all_findings.extend(normalize_nuclei_json(args.nuclei))

    print(f"\n[*] Total findings across all scanners: {len(all_findings)}")
    write_csv(all_findings, args.output)


if __name__ == "__main__":
    main()
