import sys
import json
sys.path.insert(0, 'c:/Users/Mridul/Desktop/NET_SCAN/backend/app')

from mapping import analyzer, graph_gen

# Load demo data
with open('c:/Users/Mridul/Desktop/NET_SCAN/backend/app/scanner/data/demo_scan.json') as f:
    scan_data = json.load(f)

print("=" * 60)
print("TESTING ANALYZER & GRAPH GENERATION")
print("=" * 60)

# Test 1: Analyze
print("\n[1] Running analyzer.analyze_scan_results()...")
analyzed_data = analyzer.analyze_scan_results(scan_data)
print(json.dumps(analyzed_data, indent=2))

# Test 2: Attack chains
print("\n[2] Running analyzer.calculate_attack_chains()...")
attack_chains = analyzer.calculate_attack_chains(analyzed_data)
print(f"Total chains found: {attack_chains.get('total_chains', 0)}")
print(json.dumps(attack_chains, indent=2))

# Test 3: Graph generation
print("\n[3] Running graph_gen.generate_attack_graph()...")
graph_data = graph_gen.generate_attack_graph(analyzed_data, attack_chains)
print(f"Graph nodes: {len(graph_data.get('nodes', []))}")
print(f"Graph edges: {len(graph_data.get('edges', []))}")
print(json.dumps(graph_data, indent=2))

# Test 4: Exposure
print("\n[4] Running graph_gen.calculate_network_exposure()...")
exposure = graph_gen.calculate_network_exposure(graph_data)
print(json.dumps(exposure, indent=2))

print("\n" + "=" * 60)
print("✓ TEST COMPLETE")
print("=" * 60)
