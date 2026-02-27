import json
import os

# Default risk levels for common ports
# DEMO/TESTING MODE: All ports boosted to ensure lateral movement shows
DEFAULT_RISK_LEVELS = {
    "20": "Critical",    # FTP-DATA
    "21": "Critical",    # FTP
    "22": "High",        # SSH
    "23": "Critical",    # TELNET
    "25": "Critical",    # SMTP
    "53": "High",        # DNS
    "80": "Critical",    # HTTP
    "110": "High",       # POP3
    "139": "Critical",   # NetBIOS-SSN
    "143": "High",       # IMAP
    "443": "High",       # HTTPS
    "445": "Critical",   # SMB
    "1433": "Critical",  # MSSQL
    "3306": "Critical",  # MySQL
    "3389": "Critical",  # RDP
    "5000": "Critical",  # Flask/HTTP
    "5432": "Critical",  # PostgreSQL
    "5900": "High",      # VNC
    "5901": "High",      # VNC
    "3000": "Critical",  # Node.js/HTTP
    "8080": "Critical",  # HTTP-Proxy
    "8443": "High"       # HTTPS-Alt
}

def analyze_scan_results(scan_data):
    """
    Analyzes scan results and returns risk assessment.

    Args:
        scan_data: Dict containing scan results with structure:
        {
            'target': '192.168.1.1',
            'discovered_services': { port_str: service_name },
            'open_ports': { port_str: port_info },
            ...
        }

    Returns:
        Dict with risk analysis and vulnerable services
    """
    if not scan_data:
        return {"error": "No scan data provided", "analysis": []}

    try:
        # Extract service information
        open_ports = scan_data.get("open_ports", {})
        discovered_services = scan_data.get("discovered_services", {})

        # Combine both sources for complete picture
        all_services = {**discovered_services, **open_ports}

        analyzed_report = []
        critical_count = 0
        high_count = 0
        medium_count = 0

        for port, service_info in all_services.items():
            port_str = str(port)

            # Extract service name
            if isinstance(service_info, dict):
                service = service_info.get('service', 'Unknown Service')
                vulnerabilities = service_info.get('vulnerabilities', [])
            else:
                service = str(service_info)
                vulnerabilities = []

            # Determine risk level
            risk = DEFAULT_RISK_LEVELS.get(port_str, "High")

            # If unknown service, elevate risk
            if "Unknown" in service:
                if risk == "Medium":
                    risk = "High"

            # Count risk levels
            if risk == "Critical":
                critical_count += 1
            elif risk == "High":
                high_count += 1
            else:
                medium_count += 1

            analyzed_report.append({
                "port": port_str,
                "service": service,
                "risk_level": risk,
                "vulnerabilities": vulnerabilities
            })

        # Sort by risk level (Critical first)
        risk_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
        analyzed_report.sort(key=lambda x: risk_order.get(x["risk_level"], 4))

        return {
            "target": scan_data.get("target", "unknown"),
            "total_ports_scanned": scan_data.get("scan_summary", {}).get("total_ports_scanned", 0),
            "vulnerable_ports": {
                "critical": critical_count,
                "high": high_count,
                "medium": medium_count
            },
            "analysis": analyzed_report
        }

    except Exception as e:
        print(f"Error analyzing scan: {e}")
        return {"error": str(e), "analysis": []}


def calculate_attack_chains(analyzed_data):
    """
    Calculates potential attack chains between vulnerable services.

    This is the core of lateral movement detection.
    """
    try:
        analysis = analyzed_data.get("analysis", [])

        # Group by risk level
        critical_services = [s for s in analysis if s["risk_level"] == "Critical"]
        high_services = [s for s in analysis if s["risk_level"] == "High"]
        medium_services = [s for s in analysis if s["risk_level"] == "Medium"]

        # Build attack chains
        chains = []

        # Chain 1: Critical -> High (escalation path) - PRIMARY
        if critical_services and high_services:
            for critical in critical_services:
                for high in high_services:
                    chains.append({
                        "type": "lateral_movement",
                        "from": f"Port {critical['port']} ({critical['service']})",
                        "to": f"Port {high['port']} ({high['service']})",
                        "risk_score": 9.5,
                        "description": f"Use {critical['service']} vulnerability to access {high['service']}"
                    })

        # Chain 1B: High -> High (lateral escalation) - SECONDARY
        if high_services and len(high_services) > 1:
            for i, high1 in enumerate(high_services):
                for high2 in high_services[i+1:]:
                    chains.append({
                        "type": "lateral_movement",
                        "from": f"Port {high1['port']} ({high1['service']})",
                        "to": f"Port {high2['port']} ({high2['service']})",
                        "risk_score": 8.0,
                        "description": f"Hop between {high1['service']} and {high2['service']}"
                    })

        # Chain 1C: High -> Medium (downgrade - still dangerous) - TERTIARY
        if high_services and medium_services:
            for high in high_services:
                for medium in medium_services:
                    chains.append({
                        "type": "lateral_movement",
                        "from": f"Port {high['port']} ({high['service']})",
                        "to": f"Port {medium['port']} ({medium['service']})",
                        "risk_score": 6.5,
                        "description": f"Leverage {high['service']} to compromise {medium['service']}"
                    })

        # Chain 2: Same service type (horizontal movement)
        service_groups = {}
        for service in analysis:
            srv_name = service['service'].split('/')[0]  # Get base service name
            if srv_name not in service_groups:
                service_groups[srv_name] = []
            service_groups[srv_name].append(service)

        for service_name, services in service_groups.items():
            if len(services) > 1:  # Multiple instances of same service type
                for i, svc1 in enumerate(services):
                    for svc2 in services[i+1:]:
                        chains.append({
                            "type": "horizontal_movement",
                            "from": f"Port {svc1['port']} ({service_name})",
                            "to": f"Port {svc2['port']} ({service_name})",
                            "risk_score": 7.0,
                            "description": f"Lateral movement through {service_name} instances"
                        })

        return {
            "total_chains": len(chains),
            "chains": chains[:10]  # Return top 10 chains
        }

    except Exception as e:
        print(f"Error calculating attack chains: {e}")
        return {"total_chains": 0, "chains": []}


if __name__ == "__main__":
    # Standalone execution for testing
    import sys
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        if os.path.exists(input_file):
            with open(input_file, 'r') as f:
                data = json.load(f)
            analysis = analyze_scan_results(data)
            chains = calculate_attack_chains(analysis)
            print(json.dumps({"analysis": analysis, "attack_chains": chains}, indent=2))