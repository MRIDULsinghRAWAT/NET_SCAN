import json
import os
import csv

# Paths setup
INPUT_FILE = "../scanner/data/scan_output.json" # Raw scan data
OUTPUT_FILE = "../scanner/data/risk_report.json" # Analyzed intelligence
VULN_DB = "vuln_db.csv" # Tera 1000 parameters wala database

def load_vuln_db():
    """CSV database se Port aur Risk Level ki mapping load karta hai."""
    db = {}
    if not os.path.exists(VULN_DB):
        print(f"Warning: {VULN_DB} not found! Using default risk levels.")
        return db
    
    with open(VULN_DB, mode='r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Port ko key aur Risk_Level ko value banata hai
            db[str(row['Port'])] = row['Risk_Level']
    return db

def load_scan_data():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found!")
        return None
    with open(INPUT_FILE, 'r') as f:
        return json.load(f)

def analyze_risk(scan_data, vuln_mapping):
    results = scan_data.get("discovered_services", {})
    analyzed_report = []

    for port, service in results.items():
        # Step 1: Pehle CSV mein dhoondo, agar nahi hai toh 'Medium' assign karo
        risk = vuln_mapping.get(str(port), "Medium")
        
        # Step 2: Special Logic - Agar service Unknown hai toh use High maan lo (Security first)
        if service == "Unknown Service" and risk == "Medium":
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
    # 1. Scanner data load karo
    data = load_scan_data()
    # 2. Intelligence database (CSV) load karo
    vuln_db = load_vuln_db()
    
    if data:
        # 3. Dono ko match karke analysis generate karo
        report = analyze_risk(data, vuln_db)
        save_report(report, data.get("target"))