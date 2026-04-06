import os
import json
from datetime import datetime
from fpdf import FPDF

# Configure output directory
REPORTS_DIR = os.path.join(os.path.dirname(__file__), 'reports')
if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)


class PDFReport(FPDF):
    def __init__(self, target_ip):
        super().__init__()
        self.target_ip = target_ip
        self.report_title = "NET_SCAN SECURITY REPORT"

        # Professional color palette
        self.col_primary = (5, 38, 89)       # Deep Navy
        self.col_accent = (84, 131, 179)      # Steel Blue
        self.col_light = (193, 232, 255)      # Light Cyan
        self.col_critical = (239, 68, 68)     # Red
        self.col_high = (249, 115, 22)        # Orange
        self.col_medium = (234, 179, 8)       # Yellow
        self.col_low = (34, 197, 94)          # Green
        self.col_text = (40, 40, 40)          # Dark text
        self.col_muted = (120, 120, 120)      # Muted text

    def header(self):
        if self.page_no() == 1:
            return  # Cover page has its own header
        # Header bar
        self.set_fill_color(*self.col_primary)
        self.rect(0, 0, 210, 18, 'F')
        # Accent line
        self.set_fill_color(*self.col_accent)
        self.rect(0, 18, 210, 1, 'F')

        self.set_font("helvetica", "B", 9)
        self.set_text_color(255, 255, 255)
        self.set_xy(10, 5)
        self.cell(100, 8, "NET_SCAN SECURITY REPORT", align="L")
        self.set_font("helvetica", "", 8)
        self.set_text_color(180, 200, 220)
        self.cell(0, 8, f"Target: {self.target_ip}  |  {datetime.now().strftime('%Y-%m-%d')}", align="R")
        self.ln(15)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "", 8)
        self.set_text_color(*self.col_muted)
        self.set_draw_color(*self.col_accent)
        self.line(10, self.get_y(), 200, self.get_y())
        self.cell(95, 10, "NET_SCAN | Automated Vulnerability & Attack Surface Assessment", align="L")
        self.cell(95, 10, f"Page {self.page_no()}/{{nb}}", align="R")

    def section_title(self, num, title):
        """Renders a styled section heading."""
        self.set_font("helvetica", "B", 16)
        self.set_text_color(*self.col_primary)
        self.cell(0, 12, f"{num}. {title}", ln=1)
        # Underline accent
        y = self.get_y()
        self.set_draw_color(*self.col_accent)
        self.set_line_width(0.6)
        self.line(10, y, 100, y)
        self.ln(4)

    def sub_heading(self, text):
        """Renders a sub-heading."""
        self.set_font("helvetica", "B", 12)
        self.set_text_color(*self.col_accent)
        self.cell(0, 9, text, ln=1)
        self.ln(1)

    def body_text(self, text):
        """Renders normal body text."""
        self.set_font("helvetica", "", 11)
        self.set_text_color(*self.col_text)
        self.multi_cell(0, 7, text)
        self.ln(2)

    def risk_color(self, risk):
        """Returns RGB tuple for a risk level."""
        risk = str(risk).upper()
        if risk == "CRITICAL":
            return self.col_critical
        elif risk == "HIGH":
            return self.col_high
        elif risk == "MEDIUM":
            return self.col_medium
        else:
            return self.col_low

    def check_page_break(self, h=30):
        """Add a new page if remaining space is less than h mm."""
        if self.get_y() + h > 270:
            self.add_page()


def generate_pdf_report(scan_data_path):
    """Generates a comprehensive, multi-page PDF security report."""

    if not os.path.exists(scan_data_path):
        raise FileNotFoundError(f"Scan data not found at {scan_data_path}")

    with open(scan_data_path, 'r') as f:
        data = json.load(f)

    target = data.get("target", "Unknown")
    summary = data.get("scan_summary", {})
    all_ports = data.get("all_ports", {})

    # Filter only open ports
    open_ports = []
    for port, info in all_ports.items():
        if isinstance(info, dict) and info.get("status") == "open":
            info['port'] = port
            open_ports.append(info)

    # Sort open ports by port number
    open_ports.sort(key=lambda p: int(p.get('port', 0)))

    # Run analysis if possible
    analyzed_data = None
    attack_chains = None
    try:
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
        from mapping import analyzer, graph_gen
        analyzed_data = analyzer.analyze_scan_results(data)
        attack_chains = analyzer.calculate_attack_chains(analyzed_data)
    except Exception as e:
        print(f"[PDF] Could not run analysis pipeline: {e}")

    # Determine overall risk
    total_vulns = sum(len(p.get("vulnerabilities", [])) for p in open_ports)
    critical_services = ['SMB', 'TELNET', 'FTP', 'VNC', 'RDP', 'MSSQL', 'MySQL']
    has_critical = any(
        any(cs.lower() in str(p.get('service', '')).lower() for cs in critical_services)
        for p in open_ports
    )

    if has_critical or total_vulns > 5:
        risk_level = "CRITICAL"
    elif total_vulns > 0 or len(open_ports) > 3:
        risk_level = "HIGH"
    elif len(open_ports) > 0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # ── Build PDF ─────────────────────────────────────────────────
    pdf = PDFReport(target)
    pdf.alias_nb_pages()

    # ═══════════════════════════════════════════════════════════════
    # PAGE 1: COVER PAGE
    # ═══════════════════════════════════════════════════════════════
    pdf.add_page()

    # Full page dark background
    pdf.set_fill_color(*pdf.col_primary)
    pdf.rect(0, 0, 210, 297, 'F')

    # Top accent bar
    pdf.set_fill_color(*pdf.col_accent)
    pdf.rect(0, 0, 210, 4, 'F')

    # Logo / Brand area
    pdf.set_y(60)
    pdf.set_font("helvetica", "B", 42)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 20, "NET_SCAN", align="C", ln=1)

    pdf.set_font("helvetica", "", 14)
    pdf.set_text_color(*pdf.col_accent)
    pdf.cell(0, 10, "Automated Lateral Movement Detection & Cyber Kill Chain Modeling", align="C", ln=1)

    # Divider
    pdf.ln(10)
    pdf.set_draw_color(*pdf.col_accent)
    pdf.set_line_width(0.5)
    pdf.line(60, pdf.get_y(), 150, pdf.get_y())
    pdf.ln(15)

    # Report details
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(180, 200, 220)
    pdf.cell(0, 10, "SECURITY ASSESSMENT REPORT", align="C", ln=1)
    pdf.ln(5)

    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, f"Target: {target}", align="C", ln=1)
    pdf.ln(3)

    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(180, 200, 220)
    pdf.cell(0, 8, f"Date: {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}", align="C", ln=1)
    pdf.cell(0, 8, f"Ports Scanned: {summary.get('total_ports_scanned', 1024)}", align="C", ln=1)
    pdf.cell(0, 8, f"Open Ports Discovered: {len(open_ports)}", align="C", ln=1)

    # Risk level badge
    pdf.ln(15)
    risk_col = pdf.risk_color(risk_level)
    pdf.set_fill_color(*risk_col)
    badge_w = 80
    badge_x = (210 - badge_w) / 2
    pdf.set_x(badge_x)
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(badge_w, 16, f"RISK: {risk_level}", border=0, fill=True, align="C", ln=1)

    # Bottom text
    pdf.set_y(250)
    pdf.set_font("helvetica", "I", 9)
    pdf.set_text_color(*pdf.col_accent)
    pdf.cell(0, 6, "CONFIDENTIAL - For authorized personnel only", align="C", ln=1)
    pdf.cell(0, 6, "Generated by NET_SCAN Security Intelligence Platform", align="C", ln=1)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 2: EXECUTIVE SUMMARY
    # ═══════════════════════════════════════════════════════════════
    pdf.add_page()

    pdf.section_title("1", "Executive Summary")

    pdf.body_text(
        f"This report presents the findings of an automated security assessment conducted against "
        f"the target system at IP address {target}. The assessment was performed using NET_SCAN's "
        f"multi-threaded TCP port enumeration engine, followed by an automated intelligence pipeline "
        f"that includes service identification, vulnerability correlation, kill chain classification, "
        f"and lateral movement path analysis."
    )

    pdf.body_text(
        f"The scan evaluated {summary.get('total_ports_scanned', 1024)} TCP ports and discovered "
        f"{len(open_ports)} open port(s) exposing network services. Each discovered service was "
        f"analyzed for potential vulnerabilities and mapped to MITRE ATT&CK techniques to identify "
        f"realistic attack vectors."
    )

    pdf.ln(3)
    pdf.sub_heading("1.1 Key Metrics")

    # Metrics table
    metrics = [
        ("Target IP Address", target),
        ("Date of Assessment", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("Total Ports Scanned", str(summary.get('total_ports_scanned', 1024))),
        ("Open Ports Found", str(len(open_ports))),
        ("Closed Ports", str(summary.get('closed_ports', 0))),
        ("Filtered Ports", str(summary.get('filtered_ports', 0))),
        ("Total Vulnerabilities", str(total_vulns)),
        ("Overall Risk Level", risk_level),
    ]

    pdf.set_fill_color(240, 243, 248)
    for i, (label, value) in enumerate(metrics):
        fill = i % 2 == 0
        if fill:
            pdf.set_fill_color(240, 243, 248)
        else:
            pdf.set_fill_color(255, 255, 255)

        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(*pdf.col_text)
        pdf.cell(80, 8, f"  {label}", border=0, fill=True, align="L")

        if label == "Overall Risk Level":
            pdf.set_text_color(*pdf.risk_color(risk_level))
            pdf.set_font("helvetica", "B", 10)
        else:
            pdf.set_font("helvetica", "", 10)
        pdf.cell(110, 8, value, border=0, fill=True, align="L")
        pdf.set_text_color(*pdf.col_text)
        pdf.ln()

    # Vulnerability breakdown
    if analyzed_data and analyzed_data.get("vulnerable_ports"):
        vp = analyzed_data["vulnerable_ports"]
        pdf.ln(5)
        pdf.sub_heading("1.2 Vulnerability Breakdown")

        vuln_levels = [
            ("Critical", vp.get("critical", 0), pdf.col_critical),
            ("High", vp.get("high", 0), pdf.col_high),
            ("Medium", vp.get("medium", 0), pdf.col_medium),
        ]

        for level_name, count, color in vuln_levels:
            pdf.set_font("helvetica", "B", 10)
            pdf.set_text_color(*color)
            pdf.cell(25, 8, f"  {level_name}:", align="L")
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(*pdf.col_text)
            pdf.cell(20, 8, str(count), align="L")

            # Progress bar
            bar_w = 100
            bar_h = 5
            x = pdf.get_x()
            y = pdf.get_y() + 1.5
            total = max(vp.get("critical", 0) + vp.get("high", 0) + vp.get("medium", 0), 1)
            fill_w = (count / total) * bar_w if total > 0 else 0
            pdf.set_fill_color(230, 230, 230)
            pdf.rect(x, y, bar_w, bar_h, 'F')
            pdf.set_fill_color(*color)
            pdf.rect(x, y, fill_w, bar_h, 'F')
            pdf.ln(8)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 3: EXPOSED SERVICES MATRIX
    # ═══════════════════════════════════════════════════════════════
    pdf.add_page()

    pdf.section_title("2", "Exposed Services Matrix")

    pdf.body_text(
        "The following table lists all discovered open ports with their associated services, "
        "risk classifications, and identified vulnerabilities. Services are classified based on "
        "their potential role in an attack chain (Entry, Pivot, or Target)."
    )

    if open_ports:
        # Table header
        pdf.set_fill_color(*pdf.col_primary)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(20, 10, "PORT", border=1, fill=True, align="C")
        pdf.cell(35, 10, "SERVICE", border=1, fill=True, align="C")
        pdf.cell(22, 10, "RISK", border=1, fill=True, align="C")
        pdf.cell(25, 10, "ROLE", border=1, fill=True, align="C")
        pdf.cell(88, 10, "VULNERABILITIES", border=1, fill=True, align="C")
        pdf.ln()

        # Classify ports
        ENTRY_PORTS = {"21", "23", "80", "443", "8080", "8443", "3389", "5900", "5901", "3000", "5000"}
        PIVOT_PORTS = {"22", "25", "135", "139", "445", "110", "143"}
        TARGET_PORTS = {"53", "1433", "3306", "5432", "6379", "27017"}

        risk_levels = {}
        if analyzed_data:
            for a in analyzed_data.get("analysis", []):
                risk_levels[str(a["port"])] = a.get("risk_level", "Medium")

        pdf.set_font("helvetica", "", 9)
        fill = False
        for p in open_ports:
            pdf.check_page_break(12)
            port_str = str(p.get("port", ""))
            service = p.get("service", "Unknown")
            risk = risk_levels.get(port_str, "Medium")
            vulns = p.get("vulnerabilities", [])
            vulns_str = ", ".join(vulns[:3]) if vulns else "None identified"

            # Determine role
            if port_str in ENTRY_PORTS:
                role = "ENTRY"
            elif port_str in PIVOT_PORTS:
                role = "PIVOT"
            elif port_str in TARGET_PORTS:
                role = "TARGET"
            else:
                role = "-"

            if fill:
                pdf.set_fill_color(245, 247, 250)
            else:
                pdf.set_fill_color(255, 255, 255)

            pdf.set_text_color(*pdf.col_text)
            pdf.cell(20, 10, port_str, border=1, fill=True, align="C")
            pdf.cell(35, 10, service[:15], border=1, fill=True, align="C")
            pdf.set_text_color(*pdf.risk_color(risk))
            pdf.set_font("helvetica", "B", 9)
            pdf.cell(22, 10, risk.upper(), border=1, fill=True, align="C")
            pdf.set_text_color(*pdf.col_accent)
            pdf.set_font("helvetica", "B", 8)
            pdf.cell(25, 10, role, border=1, fill=True, align="C")
            pdf.set_text_color(*pdf.col_text)
            pdf.set_font("helvetica", "", 8)
            pdf.cell(88, 10, vulns_str[:55], border=1, fill=True, align="L")
            pdf.ln()
            fill = not fill

        pdf.ln(5)

        # Service details
        pdf.sub_heading("2.1 Detailed Service Analysis")
        for p in open_ports:
            pdf.check_page_break(25)
            port_str = str(p.get("port", ""))
            service = p.get("service", "Unknown")
            risk = risk_levels.get(port_str, "Medium")
            vulns = p.get("vulnerabilities", [])

            pdf.set_font("helvetica", "B", 10)
            pdf.set_text_color(*pdf.col_primary)
            pdf.cell(0, 8, f"Port {port_str} - {service}", ln=1)

            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(*pdf.col_text)

            risk_col = pdf.risk_color(risk)
            pdf.cell(30, 6, "  Risk Level: ")
            pdf.set_text_color(*risk_col)
            pdf.set_font("helvetica", "B", 9)
            pdf.cell(0, 6, risk.upper(), ln=1)
            pdf.set_text_color(*pdf.col_text)
            pdf.set_font("helvetica", "", 9)

            if vulns:
                pdf.cell(30, 6, "  Vulnerabilities:", ln=1)
                for v in vulns:
                    pdf.cell(10)
                    pdf.cell(0, 6, f"  - {v}", ln=1)
            else:
                pdf.cell(0, 6, "  No specific vulnerabilities identified in offline database.", ln=1)
            pdf.ln(3)
    else:
        pdf.set_font("helvetica", "I", 12)
        pdf.set_text_color(*pdf.col_muted)
        pdf.cell(0, 10, "No open ports found on target.", ln=1)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 4: KILL CHAIN ANALYSIS
    # ═══════════════════════════════════════════════════════════════
    if attack_chains and attack_chains.get("total_chains", 0) > 0:
        pdf.add_page()

        pdf.section_title("3", "Kill Chain & Attack Path Analysis")

        pdf.body_text(
            "NET_SCAN classifies discovered services into kill chain roles and maps realistic "
            "lateral movement paths between them. The analysis uses a heuristic classification "
            "engine that assigns each service a role based on its typical use in adversarial "
            "attack campaigns:"
        )

        # Kill chain role explanation
        roles_desc = [
            ("ENTRY", "Initial access vectors - services commonly exploited for first foothold (HTTP, FTP, RDP, VNC)"),
            ("PIVOT", "Lateral movement tools - services used to traverse internal networks (SSH, SMB, NetBIOS)"),
            ("TARGET", "High-value objectives - databases and services containing sensitive data (MySQL, MSSQL, DNS)"),
        ]

        for role_name, desc in roles_desc:
            pdf.check_page_break(10)
            pdf.set_font("helvetica", "B", 10)
            if role_name == "ENTRY":
                pdf.set_text_color(*pdf.col_accent)
            elif role_name == "PIVOT":
                pdf.set_text_color(*pdf.col_high)
            else:
                pdf.set_text_color(*pdf.col_critical)
            pdf.cell(20, 7, f"  {role_name}:", align="L")
            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(*pdf.col_text)
            pdf.cell(0, 7, desc, align="L", ln=1)

        # Classification stats
        classif = attack_chains.get("classification", {})
        pdf.ln(5)
        pdf.sub_heading("3.1 Node Classification Summary")
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(*pdf.col_text)
        pdf.cell(0, 7, f"  Entry Points:   {classif.get('entry_points', 0)} services", ln=1)
        pdf.cell(0, 7, f"  Pivot Nodes:    {classif.get('pivot_nodes', 0)} services", ln=1)
        pdf.cell(0, 7, f"  Target Nodes:   {classif.get('target_nodes', 0)} services", ln=1)
        pdf.cell(0, 7, f"  Total Chains:   {attack_chains.get('total_chains', 0)} attack paths identified", ln=1)

        # Attack chains table
        pdf.ln(5)
        pdf.sub_heading("3.2 Identified Attack Chains")

        chains = attack_chains.get("chains", [])
        if chains:
            # Table header
            pdf.set_fill_color(*pdf.col_primary)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("helvetica", "B", 8)
            pdf.cell(10, 9, "#", border=1, fill=True, align="C")
            pdf.cell(42, 9, "FROM", border=1, fill=True, align="C")
            pdf.cell(42, 9, "TO", border=1, fill=True, align="C")
            pdf.cell(18, 9, "RISK", border=1, fill=True, align="C")
            pdf.cell(25, 9, "MITRE ID", border=1, fill=True, align="C")
            pdf.cell(53, 9, "TECHNIQUE", border=1, fill=True, align="C")
            pdf.ln()

            pdf.set_font("helvetica", "", 8)
            for i, chain in enumerate(chains[:12]):
                pdf.check_page_break(10)
                fill = i % 2 == 0
                if fill:
                    pdf.set_fill_color(245, 247, 250)
                else:
                    pdf.set_fill_color(255, 255, 255)

                pdf.set_text_color(*pdf.col_text)
                pdf.cell(10, 9, str(i + 1), border=1, fill=True, align="C")
                pdf.cell(42, 9, chain.get("from", "")[:22], border=1, fill=True, align="L")
                pdf.cell(42, 9, chain.get("to", "")[:22], border=1, fill=True, align="L")

                risk_val = chain.get("risk_score", 0)
                if risk_val >= 9:
                    pdf.set_text_color(*pdf.col_critical)
                elif risk_val >= 7:
                    pdf.set_text_color(*pdf.col_high)
                else:
                    pdf.set_text_color(*pdf.col_medium)
                pdf.set_font("helvetica", "B", 8)
                pdf.cell(18, 9, str(risk_val), border=1, fill=True, align="C")

                pdf.set_text_color(*pdf.col_accent)
                pdf.set_font("helvetica", "", 8)
                pdf.cell(25, 9, chain.get("mitre_id", ""), border=1, fill=True, align="C")
                pdf.set_text_color(*pdf.col_text)
                pdf.cell(53, 9, chain.get("technique", "")[:30], border=1, fill=True, align="L")
                pdf.ln()

        # Chain descriptions
        pdf.ln(5)
        pdf.sub_heading("3.3 Attack Chain Descriptions")

        for i, chain in enumerate(chains[:8]):
            pdf.check_page_break(20)
            pdf.set_font("helvetica", "B", 9)
            pdf.set_text_color(*pdf.col_primary)
            pdf.cell(0, 7, f"Chain {i+1}: {chain.get('from', '')} -> {chain.get('to', '')}", ln=1)
            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(*pdf.col_text)
            pdf.multi_cell(0, 6, f"   {chain.get('description', 'No description available')}")
            pdf.set_text_color(*pdf.col_muted)
            pdf.set_font("helvetica", "I", 8)
            pdf.cell(0, 5,
                f"   MITRE: {chain.get('mitre_id', 'N/A')} | "
                f"Category: {chain.get('category', 'N/A').replace('_', ' ').title()} | "
                f"Difficulty: {chain.get('difficulty', 'N/A')}/7 | "
                f"Risk: {chain.get('risk_score', 'N/A')}/10",
                ln=1)
            pdf.ln(2)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 5: FULL ATTACK PATHS (Multi-hop scenarios)
    # ═══════════════════════════════════════════════════════════════
    if attack_chains and attack_chains.get("full_attack_paths"):
        pdf.add_page()

        pdf.section_title("4", "Multi-Hop Attack Scenarios")

        pdf.body_text(
            "The following scenarios represent complete kill chain paths where an attacker gains "
            "initial access through an entry point, moves laterally via pivot services, and reaches "
            "high-value target systems. Each path represents a realistic adversarial operation "
            "following the MITRE ATT&CK framework."
        )

        full_paths = attack_chains.get("full_attack_paths", [])
        for i, path in enumerate(full_paths[:8]):
            pdf.check_page_break(25)

            # Path header with risk badge
            pdf.set_fill_color(*pdf.col_primary)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("helvetica", "B", 10)
            pdf.cell(0, 9, f"  Scenario {i+1}: {path.get('name', 'Unknown Path')}", border=0, fill=True, ln=1)

            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(*pdf.col_text)

            # Hops
            hops = path.get("hops", [])
            for j, hop in enumerate(hops):
                pdf.cell(5)
                if j == 0:
                    pdf.set_text_color(*pdf.col_accent)
                    pdf.cell(18, 7, "[ENTRY]")
                elif j == len(hops) - 1:
                    pdf.set_text_color(*pdf.col_critical)
                    pdf.cell(18, 7, "[TARGET]")
                else:
                    pdf.set_text_color(*pdf.col_high)
                    pdf.cell(18, 7, "[PIVOT]")
                pdf.set_text_color(*pdf.col_text)
                pdf.set_font("helvetica", "", 9)
                pdf.cell(0, 7, hop, ln=1)
                if j < len(hops) - 1:
                    pdf.cell(14)
                    pdf.set_text_color(*pdf.col_muted)
                    pdf.set_font("helvetica", "", 8)
                    pdf.cell(0, 5, "|", ln=1)
                    pdf.cell(14)
                    pdf.cell(0, 5, "v", ln=1)
                    pdf.set_text_color(*pdf.col_text)
                    pdf.set_font("helvetica", "", 9)

            # Risk & Description
            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(*pdf.col_critical)
            pdf.cell(5)
            pdf.cell(0, 7, f"Risk Score: {path.get('risk_score', 'N/A')}/10", ln=1)
            pdf.set_text_color(*pdf.col_text)
            pdf.cell(5)
            pdf.multi_cell(0, 6, f"{path.get('description', '')}")
            pdf.ln(4)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 6: THREAT INTELLIGENCE & VULNERABILITIES
    # ═══════════════════════════════════════════════════════════════
    pdf.add_page()

    section_num = 5 if attack_chains and attack_chains.get("full_attack_paths") else 3
    pdf.section_title(str(section_num), "Threat Intelligence & Vulnerability Assessment")

    pdf.body_text(
        "This section details the specific vulnerabilities identified for each open port based on "
        "NET_SCAN's offline vulnerability database. These findings should be cross-referenced with "
        "the NIST National Vulnerability Database (NVD) for the latest CVE data."
    )

    has_vulns = False
    for p in open_ports:
        vulns = p.get("vulnerabilities", [])
        if vulns:
            has_vulns = True
            pdf.check_page_break(20)

            port_str = str(p.get('port', ''))
            service = p.get('service', 'Unknown')

            # Port header
            pdf.set_fill_color(*pdf.col_critical)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("helvetica", "B", 10)
            pdf.cell(0, 8, f"  Port {port_str} ({service})", fill=True, ln=1)

            pdf.set_text_color(*pdf.col_text)
            pdf.set_font("helvetica", "", 10)
            for v in vulns:
                pdf.cell(8)
                pdf.cell(5, 7, "-")
                pdf.cell(0, 7, v, ln=1)

            # Impact analysis
            pdf.set_font("helvetica", "I", 9)
            pdf.set_text_color(*pdf.col_muted)
            pdf.cell(8)
            impact = _get_impact_text(port_str, service)
            pdf.multi_cell(0, 6, f"Impact: {impact}")
            pdf.ln(3)

    if not has_vulns:
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(*pdf.col_text)
        pdf.cell(0, 10, "No severe vulnerabilities mapped directly to these ports in the offline database.", ln=1)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 7: NETWORK EXPOSURE SCORING METHODOLOGY
    # ═══════════════════════════════════════════════════════════════
    pdf.add_page()

    section_num += 1
    pdf.section_title(str(section_num), "Network Exposure Score (NES) Methodology")

    pdf.body_text(
        "The Network Exposure Score is a composite metric (0-100) that quantifies the overall "
        "risk posture of the target system. It considers multiple independent factors aligned "
        "with CVSS v3.1 scoring matrices and lateral movement compounding logic."
    )

    pdf.sub_heading(f"{section_num}.1 Scoring Factors")

    factors = [
        ("Open Ports with Critical CVEs", "Ports hosting services with known critical vulnerabilities in NVD receive the highest weight."),
        ("Lateral Movement Path Count", "The number of viable attack chains discovered between entry, pivot, and target nodes."),
        ("Service Vulnerability Severity", "Individual risk levels of each discovered service based on common exploitation patterns."),
        ("Blast Radius Coverage %", "Percentage of the network reachable from each compromised node through lateral movement."),
        ("Network Topology Depth", "The depth of the attack graph - deeper graphs indicate more complex multi-hop attack opportunities."),
    ]

    for factor_name, factor_desc in factors:
        pdf.check_page_break(15)
        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(*pdf.col_primary)
        pdf.cell(0, 7, f"  {factor_name}", ln=1)
        pdf.set_font("helvetica", "", 9)
        pdf.set_text_color(*pdf.col_text)
        pdf.cell(5)
        pdf.multi_cell(0, 6, factor_desc)
        pdf.ln(2)

    pdf.ln(3)
    pdf.sub_heading(f"{section_num}.2 Score Ranges")

    ranges = [
        ("0 - 30", "LOW", pdf.col_low, "Minimal attack surface. Few or no exploitable paths detected."),
        ("31 - 60", "MEDIUM", pdf.col_medium, "Moderate exposure. Some lateral movement paths exist but are limited."),
        ("61 - 80", "HIGH", pdf.col_high, "Significant exposure. Multiple attack chains with viable exploitation paths."),
        ("81 - 100", "CRITICAL", pdf.col_critical, "Severe exposure. Extensive lateral movement with critical service compromise."),
    ]

    for score_range, label, color, desc in ranges:
        pdf.check_page_break(10)
        pdf.set_fill_color(*color)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(22, 8, score_range, border=0, fill=True, align="C")
        pdf.cell(3)
        pdf.set_text_color(*color)
        pdf.cell(18, 8, label, align="L")
        pdf.set_text_color(*pdf.col_text)
        pdf.set_font("helvetica", "", 9)
        pdf.cell(0, 8, desc, align="L", ln=1)
        pdf.ln(1)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 8: MITIGATION RECOMMENDATIONS
    # ═══════════════════════════════════════════════════════════════
    pdf.add_page()

    section_num += 1
    pdf.section_title(str(section_num), "Mitigation Recommendations")

    pdf.body_text(
        "Based on the assessment findings, the following remediation actions are recommended "
        "in order of priority. Implementing these measures will significantly reduce the attack "
        "surface and minimize the risk of lateral movement within the network."
    )

    recommendations = [
        {
            "title": "Implement Network Segmentation",
            "priority": "CRITICAL",
            "desc": "Isolate critical servers (databases, domain controllers) in separate VLANs with "
                     "strict firewall rules. Prevent direct entry-to-target paths by enforcing traffic "
                     "inspection between segments."
        },
        {
            "title": "Disable Unnecessary Services",
            "priority": "CRITICAL",
            "desc": "Close all non-essential ports, especially legacy protocols like Telnet (23), "
                     "FTP (21), and unencrypted services. Replace with secure alternatives (SSH, SFTP, HTTPS)."
        },
        {
            "title": "Apply Least Privilege Access",
            "priority": "HIGH",
            "desc": "Restrict service accounts to minimum required permissions. Disable default "
                     "credentials on all discovered services. Implement role-based access control (RBAC)."
        },
        {
            "title": "Deploy Intrusion Detection Systems",
            "priority": "HIGH",
            "desc": "Install network-based IDS/IPS at segment boundaries to detect lateral movement "
                     "attempts. Configure alerts for MITRE ATT&CK techniques identified in this assessment."
        },
        {
            "title": "Implement Zero Trust Architecture",
            "priority": "HIGH",
            "desc": "Authenticate and encrypt all internal traffic. Do not trust any connection by "
                     "default regardless of network location. Implement micro-segmentation."
        },
        {
            "title": "Patch Management Program",
            "priority": "CRITICAL",
            "desc": "Establish automated patch management for all exposed services. Prioritize patching "
                     "based on CVSS scores and exploitability. Address CVEs identified by NVD enrichment."
        },
        {
            "title": "Enable Logging & Monitoring",
            "priority": "MEDIUM",
            "desc": "Enable comprehensive logging on all discovered services. Forward logs to a SIEM "
                     "platform for real-time correlation and anomaly detection."
        },
        {
            "title": "Conduct Regular Security Assessments",
            "priority": "MEDIUM",
            "desc": "Schedule periodic scans using NET_SCAN to track changes in attack surface. "
                     "Compare exposure scores over time to measure security improvement."
        },
    ]

    for i, rec in enumerate(recommendations):
        pdf.check_page_break(22)

        # Priority badge
        priority = rec["priority"]
        color = pdf.risk_color(priority)

        pdf.set_font("helvetica", "B", 11)
        pdf.set_text_color(*pdf.col_primary)
        pdf.cell(8, 8, f"{i+1}.")
        pdf.cell(130, 8, rec["title"])
        pdf.set_fill_color(*color)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 8)
        pdf.cell(30, 8, priority, border=0, fill=True, align="C", ln=1)

        pdf.set_font("helvetica", "", 9)
        pdf.set_text_color(*pdf.col_text)
        pdf.cell(8)
        pdf.multi_cell(0, 6, rec["desc"])
        pdf.ln(3)

    # ═══════════════════════════════════════════════════════════════
    # FINAL: DISCLAIMER
    # ═══════════════════════════════════════════════════════════════
    pdf.ln(10)
    pdf.set_draw_color(*pdf.col_accent)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)

    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(*pdf.col_primary)
    pdf.cell(0, 8, "Disclaimer", ln=1)
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(*pdf.col_muted)
    pdf.multi_cell(0, 5,
        "This report is generated by NET_SCAN, an automated security assessment tool. The findings "
        "are based on network-level TCP port scanning and heuristic vulnerability mapping. This "
        "assessment does not constitute a full penetration test. Results should be validated by "
        "qualified security professionals. The tool performs only passive reconnaissance and does "
        "not exploit any vulnerabilities."
    )

    # ── Save ──
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"NET_SCAN_Report_{target}_{timestamp}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    pdf.output(filepath)

    return filepath


def _get_impact_text(port, service):
    """Returns a contextual impact description for a given port/service."""
    service_lower = str(service).lower()
    impacts = {
        'ftp': 'Unauthorized file access, credential theft, malware staging',
        'telnet': 'Full plaintext credential interception, remote code execution',
        'ssh': 'Brute force attacks may lead to full system compromise',
        'smtp': 'Email spoofing, spam relay, information disclosure',
        'dns': 'DNS poisoning, zone transfer data leakage, DDoS amplification',
        'http': 'Web application attacks, XSS, SQL injection, directory traversal',
        'smb': 'Ransomware propagation (WannaCry/NotPetya), lateral movement, data exfiltration',
        'rdp': 'Remote desktop hijacking, brute force, BlueKeep (CVE-2019-0708)',
        'mysql': 'Database exfiltration, SQL injection, default credential abuse',
        'mssql': 'Stored procedure exploitation, xp_cmdshell, database theft',
        'postgresql': 'Database compromise, credential theft, privilege escalation',
        'vnc': 'Screen capture, keystroke logging, full GUI-level remote control',
        'netbios': 'Network enumeration, null session attacks, SMB relay',
        'pop3': 'Email credential interception, mailbox access',
        'imap': 'Email credential theft, plaintext password capture',
    }
    for key, impact in impacts.items():
        if key in service_lower:
            return impact
    return 'Potential unauthorized access or information disclosure'
