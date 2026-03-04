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
    Calculates realistic attack chains using a Kill Chain model.

    Instead of connecting every port to every other port (full mesh),
    this engine classifies ports into their real-world attack roles
    and only creates edges that represent plausible attack paths.

    Kill Chain Phases:
        1. ENTRY   - Initial access vectors (web servers, FTP, RDP, VNC)
        2. PIVOT   - Lateral movement tools (SSH, SMB, RPC, NetBIOS)
        3. TARGET  - Data exfiltration / final goals (databases, DNS tunneling)
    
    Valid attack flows:
        Entry → Pivot   (gain foothold, then move internally)
        Entry → Target  (direct hit if no internal layers)
        Pivot → Pivot   (chained internal movement)
        Pivot → Target  (reach the final objective)
    """
    try:
        analysis = analyzed_data.get("analysis", [])

        # ─── Kill Chain Port Classification ───────────────────────────────
        # Each port can have one role.  If a port isn't in any category
        # it is treated as 'unknown' and will not generate chains
        # (avoids random noise).

        ENTRY_PORTS = {
            "21":   "FTP",
            "23":   "Telnet",
            "80":   "HTTP",
            "443":  "HTTPS",
            "8080": "HTTP-Proxy",
            "8443": "HTTPS-Alt",
            "3389": "RDP",
            "5900": "VNC",
            "5901": "VNC",
            "3000": "Node.js/HTTP",
            "5000": "Flask/HTTP",
        }

        PIVOT_PORTS = {
            "22":  "SSH",
            "25":  "SMTP",
            "135": "RPC",
            "139": "NetBIOS-SSN",
            "445": "SMB",
            "110": "POP3",
            "143": "IMAP",
        }

        TARGET_PORTS = {
            "53":   "DNS",          # DNS tunneling / exfiltration
            "1433": "MSSQL",
            "3306": "MySQL",
            "5432": "PostgreSQL",
            "6379": "Redis",
            "27017": "MongoDB",
        }

        # Descriptions for why a specific hop is dangerous
        EDGE_DESCRIPTIONS = {
            # Entry → Pivot
            ("FTP",    "SSH"):          "Attacker uploads a reverse shell via FTP, then escalates to SSH access",
            ("FTP",    "SMB"):          "Attacker compromises FTP to steal credentials, then pivots through SMB file shares",
            ("FTP",    "RPC"):          "FTP credentials reused to authenticate against RPC services",
            ("FTP",    "NetBIOS-SSN"):  "FTP access leaks internal hostnames via NetBIOS enumeration",
            ("HTTP",   "SSH"):          "Web shell uploaded via HTTP vulnerability grants SSH-level access",
            ("HTTP",   "SMB"):          "Web app exploited to access internal SMB shares",
            ("HTTP",   "RPC"):          "Web application RCE used to call internal RPC services",
            ("HTTPS",  "SSH"):          "HTTPS service exploited, attacker pivots to SSH using stolen keys",
            ("HTTPS",  "SMB"):          "HTTPS app vulnerability exposes internal SMB network",
            ("RDP",    "SMB"):          "RDP session used to map and access SMB file shares laterally",
            ("RDP",    "SSH"):          "RDP credentials reused for SSH access to Linux hosts",
            ("VNC",    "SSH"):          "VNC desktop access used to launch SSH connections internally",
            ("VNC",    "SMB"):          "VNC session used to browse internal SMB shares",
            ("Telnet", "SSH"):          "Telnet credentials captured and reused for SSH login",
            ("Telnet", "SMB"):          "Telnet access used to enumerate and attack SMB services",
            # Entry → Target  (direct attacks)
            ("FTP",    "MySQL"):        "FTP server misconfiguration leaks database credentials for MySQL",
            ("FTP",    "MSSQL"):        "Credentials found on FTP used to access MSSQL database",
            ("FTP",    "PostgreSQL"):   "FTP backup files contain PostgreSQL connection strings",
            ("FTP",    "DNS"):          "FTP used to stage DNS tunneling tools for data exfiltration",
            ("HTTP",   "MySQL"):        "SQL injection through web application directly targets MySQL backend",
            ("HTTP",   "MSSQL"):        "Web app SQL injection chains to MSSQL stored procedure execution",
            ("HTTP",   "PostgreSQL"):   "Web app vulnerability exposes PostgreSQL database connection",
            ("HTTP",   "DNS"):          "Compromised web server used as DNS tunneling relay",
            ("HTTPS",  "MySQL"):        "HTTPS API vulnerability enables direct MySQL query injection",
            ("HTTPS",  "MSSQL"):        "Secure web app exploited to reach backend MSSQL server",
            ("HTTPS",  "PostgreSQL"):   "HTTPS service compromise leaks PostgreSQL credentials",
            ("RDP",    "MySQL"):        "RDP session used to directly connect MySQL management tools",
            ("RDP",    "MSSQL"):        "RDP access enables SQL Server Management Studio connection",
            # Pivot → Pivot  (internal chaining)
            ("SSH",    "SMB"):          "SSH access used to mount and attack internal SMB shares",
            ("SMB",    "RPC"):          "SMB foothold leveraged to call RPC services for privilege escalation",
            ("SSH",    "RPC"):          "SSH tunnel used to reach internal RPC endpoints",
            ("NetBIOS-SSN", "SMB"):     "NetBIOS enumeration reveals SMB shares for lateral access",
            # Pivot → Target
            ("SSH",    "MySQL"):        "SSH tunnel forwards traffic to internal MySQL server",
            ("SSH",    "MSSQL"):        "SSH port forwarding used to access MSSQL behind firewall",
            ("SSH",    "PostgreSQL"):   "SSH access enables direct PostgreSQL administration",
            ("SSH",    "DNS"):          "SSH server used to set up DNS exfiltration tunnel",
            ("SMB",    "MySQL"):        "SMB share contains MySQL backup with credentials",
            ("SMB",    "MSSQL"):        "SMB lateral movement reaches MSSQL database server",
            ("SMB",    "PostgreSQL"):   "SMB access to config files reveals PostgreSQL credentials",
            ("SMB",    "DNS"):          "SMB compromise enables DNS tunneling for data theft",
            ("RPC",    "MSSQL"):        "RPC exploitation grants access to co-located MSSQL instance",
            ("RPC",    "MySQL"):        "RPC service exploitation pivots to MySQL on same host",
        }

        # ─── Classify discovered ports ────────────────────────────────────
        entry_services = []
        pivot_services = []
        target_services = []

        for svc in analysis:
            port_str = str(svc["port"])
            if port_str in ENTRY_PORTS:
                entry_services.append(svc)
            elif port_str in PIVOT_PORTS:
                pivot_services.append(svc)
            elif port_str in TARGET_PORTS:
                target_services.append(svc)
            # else: unknown ports are intentionally excluded from chains

        # ─── Build realistic attack chains ────────────────────────────────
        chains = []
        seen_edges = set()  # avoid duplicate edges

        def _base_service(port_str):
            """Get the canonical service name for a port."""
            if port_str in ENTRY_PORTS:
                return ENTRY_PORTS[port_str]
            if port_str in PIVOT_PORTS:
                return PIVOT_PORTS[port_str]
            if port_str in TARGET_PORTS:
                return TARGET_PORTS[port_str]
            return "Unknown"

        def _add_chain(from_svc, to_svc, chain_type, risk_score):
            """Add a chain if not already present."""
            edge_key = (from_svc["port"], to_svc["port"])
            if edge_key in seen_edges:
                return
            seen_edges.add(edge_key)

            from_base = _base_service(str(from_svc["port"]))
            to_base = _base_service(str(to_svc["port"]))

            # Look up a smart description; fall back to generic
            desc = EDGE_DESCRIPTIONS.get(
                (from_base, to_base),
                f"Attacker leverages {from_svc['service']} to compromise {to_svc['service']}"
            )

            chains.append({
                "type": chain_type,
                "from": f"Port {from_svc['port']} ({from_svc['service']})",
                "to":   f"Port {to_svc['port']} ({to_svc['service']})",
                "risk_score": risk_score,
                "description": desc
            })

        # Phase 1: Entry → Pivot  (initial compromise → internal movement)
        for entry in entry_services:
            for pivot in pivot_services:
                _add_chain(entry, pivot, "lateral_movement", 9.0)

        # Phase 2: Pivot → Target  (internal movement → data exfiltration)
        for pivot in pivot_services:
            for target in target_services:
                _add_chain(pivot, target, "lateral_movement", 9.5)

        # Phase 3: Entry → Target  (direct hit — no pivot layer available)
        for entry in entry_services:
            for target in target_services:
                _add_chain(entry, target, "lateral_movement", 8.5)

        # Phase 4: Pivot → Pivot  (chained internal movement)
        for i, p1 in enumerate(pivot_services):
            for p2 in pivot_services[i + 1:]:
                _add_chain(p1, p2, "horizontal_movement", 7.5)

        # Phase 5: Same-service horizontal movement (e.g., VNC:5900 ↔ VNC:5901)
        service_groups = {}
        for svc in analysis:
            base = svc['service'].split('/')[0]
            service_groups.setdefault(base, []).append(svc)

        for svc_name, group in service_groups.items():
            if len(group) > 1:
                for i, s1 in enumerate(group):
                    for s2 in group[i + 1:]:
                        _add_chain(s1, s2, "horizontal_movement", 7.0)

        # ─── Build multi-hop attack scenarios (Entry→Pivot→Target) ────────
        full_paths = []
        for entry in entry_services:
            for pivot in pivot_services:
                for target in target_services:
                    entry_base = _base_service(str(entry["port"]))
                    pivot_base = _base_service(str(pivot["port"]))
                    target_base = _base_service(str(target["port"]))
                    full_paths.append({
                        "name": f"{entry_base} → {pivot_base} → {target_base}",
                        "hops": [
                            f"Port {entry['port']} ({entry['service']})",
                            f"Port {pivot['port']} ({pivot['service']})",
                            f"Port {target['port']} ({target['service']})"
                        ],
                        "risk_score": 9.8,
                        "description": f"Full kill chain: Gain entry via {entry_base}, "
                                       f"pivot through {pivot_base}, "
                                       f"exfiltrate data from {target_base}"
                    })

        # Sort chains: highest risk first
        chains.sort(key=lambda c: c["risk_score"], reverse=True)

        return {
            "total_chains": len(chains),
            "chains": chains[:15],  # Top 15 single-hop chains
            "full_attack_paths": full_paths[:10],  # Top 10 multi-hop scenarios
            "classification": {
                "entry_points": len(entry_services),
                "pivot_nodes":  len(pivot_services),
                "target_nodes": len(target_services),
            }
        }

    except Exception as e:
        print(f"Error calculating attack chains: {e}")
        return {"total_chains": 0, "chains": [], "full_attack_paths": [], "classification": {}}


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