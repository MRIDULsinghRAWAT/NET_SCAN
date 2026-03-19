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
        
        # Cyberpunk / Tech colors
        self.col_primary = (6, 182, 212)    # Cyan
        self.col_secondary = (50, 50, 50)   # Dark Gray
        self.col_alert = (239, 68, 68)      # Red
        self.col_warning = (234, 179, 8)    # Yellow
        
    def header(self):
        # Header background
        self.set_fill_color(20, 20, 20)
        self.rect(0, 0, 210, 30, 'F')
        
        # Title
        self.set_font("helvetica", "B", 24)
        self.set_text_color(*self.col_primary)
        self.cell(0, 15, "NET_SCAN SECURITY REPORT", border=0, align="L", ln=1)
        
        # Subtitle
        self.set_font("helvetica", "I", 12)
        self.set_text_color(200, 200, 200)
        self.cell(0, 5, f"Automated Vulnerability & Attack Surface Assessment", border=0, align="L", ln=1)
        self.ln(10)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        # Arial italic 8
        self.set_font("helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        # Page number
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_pdf_report(scan_data_path):
    """Generates a professional PDF from scan_output.json"""
    
    # Read the data
    if not os.path.exists(scan_data_path):
        raise FileNotFoundError(f"Scan data not found at {scan_data_path}")
        
    with open(scan_data_path, 'r') as f:
        data = json.load(f)
        
    target = data.get("target", "Unknown")
    summary = data.get("scan_summary", {})
    all_ports = data.get("all_ports", {})
    
    # Filter only open ports
    open_ports = [info for port, info in all_ports.items() if info.get("status") == "open"]
    
    # Determine Risk Score
    risk_level = "LOW"
    risk_color = (34, 197, 94)  # Green
    
    total_vulns = sum(len(p.get("vulnerabilities", [])) for p in open_ports)
    if total_vulns > 5 or any(p.get('service') in ['SMB', 'TELNET', 'FTP', 'VNC'] for p in open_ports):
        risk_level = "CRITICAL"
        risk_color = (239, 68, 68)  # Red
    elif total_vulns > 0 or len(open_ports) > 3:
        risk_level = "HIGH"
        risk_color = (234, 179, 8)  # Yellow
        
    # --- Start building PDF ---
    pdf = PDFReport(target)
    pdf.add_page()
    
    # 1. Executive Summary
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "1. Executive Summary", ln=1)
    
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 8, 
        f"This document outlines the findings of an automated security scan performed on the target IP "
        f"{target}. The scan evaluates exposed services, open ports, and potential vulnerabilities "
        f"to determine the overall attack surface and risk posture."
    )
    pdf.ln(5)
    
    # Key Metrics Box
    pdf.set_fill_color(245, 245, 245)
    pdf.rect(10, pdf.get_y(), 190, 40, 'F')
    
    pdf.set_y(pdf.get_y() + 5)
    pdf.set_x(15)
    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(*pdf.col_secondary)
    pdf.cell(60, 8, "Target IP:", ln=0)
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, target, ln=1)
    
    pdf.set_x(15)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(60, 8, "Date of Audit:", ln=0)
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), ln=1)
    
    pdf.set_x(15)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(60, 8, "Ports Scanned:", ln=0)
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, str(summary.get('total_ports_scanned', 1024)), ln=1)
    
    pdf.set_x(15)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(60, 8, "Overall Risk Level:", ln=0)
    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(*risk_color)
    pdf.cell(0, 8, risk_level, ln=1)
    
    pdf.ln(15)
    
    # 2. Exposed Services Table
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "2. Exposed Services Matrix", ln=1)
    pdf.set_font("helvetica", "", 11)
    pdf.multi_cell(0, 8, "The following ports were found open, exposing services to the network:")
    pdf.ln(5)
    
    if open_ports:
        # Table Header
        pdf.set_fill_color(*pdf.col_primary)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(30, 10, "PORT", border=1, fill=True, align="C")
        pdf.cell(60, 10, "SERVICE", border=1, fill=True, align="C")
        pdf.cell(100, 10, "STATUS", border=1, fill=True, align="C")
        pdf.ln()
        
        # Table Rows
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("helvetica", "", 11)
        fill = False
        for p in open_ports:
            pdf.set_fill_color(240, 240, 240) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.cell(30, 10, str(p.get("port")), border=1, fill=True, align="C")
            pdf.cell(60, 10, p.get("service", "Unknown"), border=1, fill=True, align="C")
            pdf.set_text_color(239, 68, 68) if str(p.get("port")) in ['21','22','23','445','3389'] else pdf.set_text_color(34, 197, 94)
            pdf.cell(100, 10, "OPEN", border=1, fill=True, align="C")
            pdf.set_text_color(0)
            pdf.ln()
            fill = not fill
    else:
        pdf.set_font("helvetica", "I", 12)
        pdf.cell(0, 10, "No open ports found on target.", ln=1)
        
    pdf.ln(10)
    
    # 3. Vulnerability Details
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "3. Threat Intelligence & Vulnerabilities", ln=1)
    
    has_vulns = False
    for p in open_ports:
        vulns = p.get("vulnerabilities", [])
        if vulns:
            has_vulns = True
            pdf.set_fill_color(239, 68, 68)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("helvetica", "B", 12)
            pdf.cell(0, 8, f" Port {p['port']} ({p.get('service')}) ", fill=True, ln=1)
            
            pdf.set_text_color(50, 50, 50)
            pdf.set_font("helvetica", "", 11)
            for v in vulns:
                pdf.cell(5, 8) # indent
                pdf.cell(0, 8, f"- {v}", ln=1)
            pdf.ln(5)
            
    if not has_vulns:
        pdf.set_font("helvetica", "", 12)
        pdf.set_text_color(50, 50, 50)
        pdf.cell(0, 10, "No severe vulnerabilities mapped directly to these ports in the offline database.", ln=1)

    pdf.ln(10)
    
    # 4. Recommendations
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "4. Mitigation Recommendations", ln=1)
    
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(50, 50, 50)
    
    recs = [
        "1. Implement Network Segmentation: Ensure critical servers reside in isolated subnets/VLANs.",
        "2. Disable Unused Services: Close legacy ports like Telnet (23) and FTP (21).",
        "3. Apply Zero Trust Policies: Authenticate and encrypt all internal traffic explicitly.",
        "4. Patch Management: Update exposed services resolving to known CVEs immediately."
    ]
    for r in recs:
        pdf.multi_cell(0, 8, r)
        pdf.ln(2)
        
    # Save the file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"NET_SCAN_Report_{target}_{timestamp}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    pdf.output(filepath)
    
    return filepath
