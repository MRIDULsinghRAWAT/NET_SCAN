#!/usr/bin/env python3
"""
DIAGNOSTIC TOOL - Debug lateral movement issue
"""
import sys
import json
sys.path.insert(0, 'c:/Users/Mridul/Desktop/NET_SCAN/backend/app')

from mapping import analyzer, graph_gen

print("\n" + "="*80)
print("NET_SCAN DIAGNOSTIC TOOL - Lateral Movement Debug")
print("="*80)

# Test with demo data
demo_data = {
    "target": "127.0.0.1",
    "scan_summary": {
        "total_ports_scanned": 1024,
        "open_ports": 5,
        "closed_ports": 1019,
        "filtered_ports": 0
    },
    "open_ports": {
        "22": {"port": 22, "status": "open", "service": "SSH", "vulnerabilities": ["Brute force"]},
        "80": {"port": 80, "status": "open", "service": "HTTP", "vulnerabilities": ["Unencrypted"]},
        "3000": {"port": 3000, "status": "open", "service": "Node.js/HTTP", "vulnerabilities": ["Debug"]},
        "5000": {"port": 5000, "status": "open", "service": "Flask/HTTP", "vulnerabilities": ["Debug mode"]},
        "3389": {"port": 3389, "status": "open", "service": "RDP", "vulnerabilities": ["Brute force", "CVE-2019-0708"]}
    },
    "discovered_services": {
        "22": "SSH",
        "80": "HTTP",
        "3000": "Node.js/HTTP",
        "5000": "Flask/HTTP",
        "3389": "RDP"
    }
}

print("\n[STEP 1] Input Data Review")
print("-" * 80)
print(f"Target: {demo_data.get('target')}")
print(f"Open Ports: {list(demo_data.get('open_ports', {}).keys())}")
print(f"Services found: {len(demo_data.get('discovered_services', {}))}")

# ANALYZE
print("\n[STEP 2] Risk Analysis")
print("-" * 80)
analyzed_data = analyzer.analyze_scan_results(demo_data)
print(json.dumps(analyzed_data, indent=2))

analysis = analyzed_data.get("analysis", [])
print("\n[ANALYSIS BREAKDOWN]")
for service in analysis:
    print(f"  Port {service['port']:5} → {service['service']:20} = {service['risk_level']}")

vuln_ports = analyzed_data.get("vulnerable_ports", {})
print(f"\nVulnerable Ports: Critical={vuln_ports.get('critical')}, High={vuln_ports.get('high')}, Medium={vuln_ports.get('medium')}")

# ATTACK CHAINS
print("\n[STEP 3] Attack Chain Detection")
print("-" * 80)

# Manual check
critical_services = [s for s in analysis if s["risk_level"] == "Critical"]
high_services = [s for s in analysis if s["risk_level"] == "High"]
medium_services = [s for s in analysis if s["risk_level"] == "Medium"]

print(f"Critical Services: {len(critical_services)}")
for s in critical_services:
    print(f"  - Port {s['port']} ({s['service']})")

print(f"\nHigh Services: {len(high_services)}")
for s in high_services:
    print(f"  - Port {s['port']} ({s['service']})")

print(f"\nMedium Services: {len(medium_services)}")
for s in medium_services:
    print(f"  - Port {s['port']} ({s['service']})")

# Calculate chains
attack_chains = analyzer.calculate_attack_chains(analyzed_data)
print(f"\n>>> CHAINS DETECTED: {attack_chains.get('total_chains', 0)}")

if attack_chains.get('total_chains', 0) > 0:
    print("\n[CHAIN DETAILS]")
    for i, chain in enumerate(attack_chains.get('chains', []), 1):
        print(f"  Chain {i}: {chain['from']} → {chain['to']}")
        print(f"           Type: {chain['type']}, Risk: {chain['risk_score']}")
else:
    print("\n⚠️  NO CHAINS GENERATED - THIS IS THE PROBLEM!")
    print("\nDEBUGGING:")
    if len(critical_services) == 0 and len(high_services) == 0:
        print("  ❌ NO CRITICAL OR HIGH SERVICES DETECTED!")
        print("  → Problem: All ports are LOW/MEDIUM risk")
        print("  → Solution: Check DEFAULT_RISK_LEVELS in analyzer.py")
    elif len(critical_services) > 0 and len(high_services) == 0:
        print("  ❌ HAVE CRITICAL BUT NO HIGH SERVICES")
        print("  → Problem: No High-risk services to create chains with")
    elif len(high_services) == 1:
        print("  ❌ ONLY 1 HIGH SERVICE (need at least 2)")
        print("  → Problem: Can't make High->High chains")

# GRAPH
print("\n[STEP 4] Graph Generation")
print("-" * 80)
graph_data = graph_gen.generate_attack_graph(analyzed_data, attack_chains)
stats = graph_data.get("statistics", {})

print(f"Nodes: {stats.get('total_nodes', 0)}")
print(f"Edges: {stats.get('total_edges', 0)}")
print(f"Lateral Movement Paths: {stats.get('lateral_movement_paths', 0)}")
print(f"Horizontal Movement Paths: {stats.get('horizontal_movement_paths', 0)}")

# EXPOSURE
print("\n[STEP 5] Network Exposure")
print("-" * 80)
exposure = graph_gen.calculate_network_exposure(graph_data)
print(f"Exposure Score: {exposure.get('exposure_score', 0)}/100")
print(f"Severity: {exposure.get('severity', 'UNKNOWN')}")
print(f"Reasoning: {json.dumps(exposure.get('reasoning', {}), indent=2)}")

print("\n" + "="*80)
print("DIAGNOSTIC COMPLETE")
print("="*80 + "\n")
