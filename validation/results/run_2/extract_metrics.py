import json
import glob
import os

files = glob.glob(r"C:\Users\Mridul\Desktop\NET_SCAN\validation\results\run_2\netscan\scan_output_*.json")
res = []
for f in files:
    with open(f, 'r') as file:
        data = json.load(file)
        nes = data.get("exposure_score", "N/A")
        ip = data.get("target_ip", os.path.basename(f))
        
        # In case the structure is different, let's explore it
        stats = {}
        if "metrics" in data:
            stats = data["metrics"]
            
        nodes = len(data.get("nodes", []))
        edges = len(data.get("edges", []))
        
        res.append(f"File: {os.path.basename(f)}, IP: {ip}, NES: {nes}, Nodes: {nodes}, Edges: {edges}")

print("\n".join(res))
