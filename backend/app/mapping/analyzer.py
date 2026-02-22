import json
import os

# Paths setup
# Updated Paths (According to your actual structure)
INPUT_FILE = "../scanner/data/scan_output.json" # Scanner folder ke andar data dhoondhega
OUTPUT_FILE = "../scanner/data/risk_report.json" # Wahin results save karega

def load_scan_data():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found!")
        return None
    with open(INPUT_FILE, 'r') as f:
        return json.load(f)

def analyze_risk(scan_data):
    results = scan_data.get("discovered_services", {})
    analyzed_report = []

    for port, service in results.items():
        # Simple Logic: Assign risk based on common dangerous ports
        risk = "Medium"
        if port in ["445", "3306"]:
            risk = "High"
        elif service == "Unknown Service":
            risk = "High"
        
        analyzed_report.append({
            "port": port,
            "service": service,
            "risk_level": risk
        })
    
    return analyzed_report

def save_report(report_data, target):
    final_output = {
        "target": target,
        "total_risks": len(report_data),
        "analysis": report_data
    }
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(final_output, f, indent=4)
    print(f"[!] Intelligence Report saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    data = load_scan_data()
    if data:
        report = analyze_risk(data)
        save_report(report, data.get("target"))
        