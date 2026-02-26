import json
import os
import time

def run_network_scan():
    # Scan simulation logic
    results = {
        "status": "completed",
        "timestamp": time.ctime(),
        "vulnerabilities": [
            {"ip": "192.168.1.1", "issue": "Open Port 80", "risk": "High"},
            {"ip": "10.0.0.12", "issue": "No Firewall", "risk": "Critical"}
        ]
    }

    # Data folder scanner folder ke andar hi banayega
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    output_path = os.path.join(DATA_DIR, "scan_output.json")

    # Write a normalized output format that the frontend expects while
    # preserving the legacy "vulnerabilities" payload under 'raw'.
    normalized = {
        "target": "simulated-scan",
        "discovered_services": {},
        "raw": results
    }

    with open(output_path, 'w') as f:
        json.dump(normalized, f, indent=4)
    print(f">>> Results saved successfully at: {output_path}")

if __name__ == "__main__":
    run_network_scan()