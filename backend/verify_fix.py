#!/usr/bin/env python3
"""
VERIFY FIX - Confirm analyzer.py now generates lateral movement chains
"""
import sys
import json
sys.path.insert(0, 'c:/Users/Mridul/Desktop/NET_SCAN/backend/app')

from mapping import analyzer

# Test with mixed port types (some known, some unknown)
test_data = {
    "target": "127.0.0.1",
    "scan_summary": {"total_ports_scanned": 1024},
    "open_ports": {
        "22": {"service": "SSH", "vulnerabilities": ["Brute force"]},
        "80": {"service": "HTTP", "vulnerabilities": ["Unencrypted"]},
        "443": {"service": "HTTPS", "vulnerabilities": ["Weak SSL"]},
        "8888": {"service": "Unknown Service", "vulnerabilities": ["?"]},  # Unknown port
        "9999": {"service": "Mystery Service", "vulnerabilities": ["?"]}  # Unknown port
    },
    "discovered_services": {
        "22": "SSH", "80": "HTTP", "443": "HTTPS", "8888": "Unknown", "9999": "Unknown"
    }
}

print("\n" + "="*70)
print("VERIFY FIX: Default Risk Level Changed")
print("="*70)

# Analyze
analyzed = analyzer.analyze_scan_results(test_data)

print("\n[RISK ANALYSIS RESULTS]")
print(f"Total services: {len(analyzed.get('analysis', []))}")

critical = [s for s in analyzed['analysis'] if s['risk_level'] == 'Critical']
high = [s for s in analyzed['analysis'] if s['risk_level'] == 'High']
medium = [s for s in analyzed['analysis'] if s['risk_level'] == 'Medium']

print(f"  Critical: {len(critical)}")
for s in critical:
    print(f"    - Port {s['port']} ({s['service']})")

print(f"  High: {len(high)}")
for s in high:
    print(f"    - Port {s['port']} ({s['service']})")

print(f"  Medium: {len(medium)}")
for s in medium:
    print(f"    - Port {s['port']} ({s['service']})")

# Calculate chains
chains = analyzer.calculate_attack_chains(analyzed)
total = chains.get('total_chains', 0)

print(f"\n[ATTACK CHAINS]")
print(f"✓ Total chains detected: {total}")

if total > 0:
    print("\n[CHAIN DETAILS]")
    for i, chain in enumerate(chains.get('chains', [])[:5], 1):
        print(f"  {i}. {chain['from']} → {chain['to']}")
        print(f"     Type: {chain['type']}, Risk Score: {chain['risk_score']}")

print("\n" + "="*70)
if total > 0:
    print("✓ SUCCESS: Fix is working! Lateral movement chains are being generated!")
else:
    print("✗ PROBLEM: Still no chains detected")
print("="*70 + "\n")
