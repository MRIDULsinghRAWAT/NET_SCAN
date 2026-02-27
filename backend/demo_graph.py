#!/usr/bin/env python3
"""
DEMO: Show what the graph looks like for visualization
"""
import sys
import json
sys.path.insert(0, 'c:/Users/Mridul/Desktop/NET_SCAN/backend/app')

from mapping import analyzer, graph_gen

# Demo scan data
demo_data = {
    "target": "127.0.0.1",
    "scan_summary": {"total_ports_scanned": 1024},
    "open_ports": {
        "22": {"service": "SSH", "vulnerabilities": ["Brute force"]},
        "80": {"service": "HTTP", "vulnerabilities": ["Unencrypted"]},
        "3000": {"service": "Node.js", "vulnerabilities": ["Debug"]},
        "5000": {"service": "Flask", "vulnerabilities": ["Debug mode"]},
        "3389": {"service": "RDP", "vulnerabilities": ["Brute force", "CVE-2019-0708"]}
    },
    "discovered_services": {
        "22": "SSH", "80": "HTTP", "3000": "Node.js", "5000": "Flask", "3389": "RDP"
    }
}

print("\n" + "="*80)
print("LATERAL MOVEMENT DIAGRAM - What You'll See")
print("="*80)

# Analyze and generate chains
analyzed = analyzer.analyze_scan_results(demo_data)
chains = analyzer.calculate_attack_chains(analyzed)
graph = graph_gen.generate_attack_graph(analyzed, chains)
exposure = graph_gen.calculate_network_exposure(graph)

# Print graph structure for visualization
print("\n[NODES - Services in the Network]")
print("-" * 80)
for node in graph['nodes']:
    color_name = {
        "#dc2626": "[RED-CRITICAL]",
        "#ea580c": "[ORANGE-HIGH]",
        "#eab308": "[YEL-MEDIUM]",
        "#22c55e": "[GREEN-LOW]"
    }.get(node['color'], "[UNKNOWN]")

    print(f"{color_name} Port {node['port']:4} | {node['service']:15} | Risk: {node['risk']:8} | Size: {node['size']}")

print("\n[EDGES - Attack Paths / Lateral Movement]")
print("-" * 80)
for i, edge in enumerate(graph['edges'], 1):
    from_port = edge['from'].split('_')[1]
    to_port = edge['to'].split('_')[1]
    print(f"{i}. Port {from_port} -> Port {to_port} | Type: {edge['type']:20} | Risk: {edge['risk_score']}")

print("\n[EXPOSURE SCORE]")
print("-" * 80)
print(f"Score: {exposure['exposure_score']}/100")
print(f"Severity: {exposure['severity']}")
print(f"Formula: {exposure['reasoning']['formula']}")

print("\n[STATISTICS]")
print("-" * 80)
stats = graph['statistics']
print(f"Total Services (Nodes): {stats['total_nodes']}")
print(f"Total Attack Paths (Edges): {stats['total_edges']}")
print(f"  - Lateral Movement Paths: {stats['lateral_movement_paths']}")
print(f"  - Horizontal Movement Paths: {stats['horizontal_movement_paths']}")
print(f"Critical Services: {stats['critical_services']}")
print(f"High Risk Services: {stats['high_risk_services']}")
print(f"Total Vulnerabilities: {stats['total_vulnerabilities']}")

print("\n[ASCII DIAGRAM]")
print("-" * 80)
print("""
        🔴 RDP (3389)
           |
    [LATERAL] CRITICAL
    [PATHS]  SERVICE
           |
        🟠 SSH (22) ← Can exploit via RDP
           |
           |--- To → 🟡 Medium services
           |
        🔴 HTTP (80)
        🔴 Flask (5000)
        🔴 Node.js (3000)

        (All connected with attack paths)
""")

print("\n" + "="*80)
print("In the GRAPH TAB, you'll see:")
print("  • Red circles connected with red arrows = Critical→High lateral movement")
print("  • Orange circles = High-risk services")
print("  • Arrows show which services can be exploited to reach others")
print("  • Hover over nodes to see vulnerabilities")
print("  • Bottom shows all attack chains")
print("="*80 + "\n")

print("\n[RAW GRAPH JSON - Sent to Frontend]")
print(json.dumps({
    "nodes": graph['nodes'][:2],  # Show first 2
    "edges": graph['edges'][:2],  # Show first 2
    "statistics": stats
}, indent=2))
