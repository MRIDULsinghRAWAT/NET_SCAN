# NET_SCAN - Network Service Discovery and Security Assessment Tool with Automated Reporting & Real-Time Attack Path Visualization

## Project Report
submitted in partial fulfillment of the requirements for the award of the degree of
**BACHELOR OF TECHNOLOGY**
in
**COMPUTER SCIENCE & ENGINEERING**

**By**
* Mridul Singh Rawat (Sap id: 500119881)
* Akshat Joshi (Sap id: 500125233)
* Shiva Jakhad (Sap id: 500119742)

**Under the guidance of**
Dr. Gagan Deep Singh

School of Computer Science
University of Petroleum & Energy Studies
Bidholi, Via Prem Nagar, Dehradun, Uttarakhand
May-2026

---

## CANDIDATE’S DECLARATION
We hereby certify that the project work entitled “NET_SCAN — Advanced Network Security Scanner & Lateral Movement Analyzer” in partial fulfilment of the requirements for the award of the Degree of Bachelor of Technology in Computer Science and Engineering with specialization in Cyber Security and submitted to the Department of Systemics, School of Computer Science, University of Petroleum & Energy Studies, Dehradun, is an authentic record of our work carried out during the period from January 2026 to May 2026 under the supervision of Dr. Gagan Deep Singh, School of Computer Science, University of Petroleum & Energy Studies, Dehradun.
The matter presented in this project has not been submitted for the award of any other degree in this or any other university.

**Student Signatures**
Mridul Singh Rawat
Akshat Joshi
Shiva Jakhad

This is to certify that the above statement made by the candidate is correct to the best of my knowledge.
Date: 05-05-2026
Dr. Gagan Deep Singh (Project Guide)

---

## ACKNOWLEDGEMENT
We wish to express our deep gratitude to our guide Dr. Gagan Deep Singh for all advice, encouragement and constant support he has given us throughout our project work. This work would not have been possible without his support and valuable suggestions.
We also thank the Head of Department, School of Computer Science, for providing the opportunity and resources required to complete this project successfully.
We extend our gratitude to the Dean of School of Computer Science, UPES, for providing the infrastructure and facilities necessary for the completion of this work.
We are thankful to our course coordinator and faculty members for their support and suggestions during the project development process.
Finally, we express our heartfelt gratitude to our parents and friends for their encouragement and support.

---

## ABSTRACT
In modern network environments, organizations face a critical challenge: they do not know what attackers can see on their own network. Traditional tools often produce a raw list of open ports and vulnerabilities, which is difficult to interpret without understanding the structural risk. Furthermore, these tools rarely model how an attacker would chain vulnerabilities together to move from an initial entry point to reach critical objectives.

This project presents NET_SCAN, a real-time network intelligence and lateral movement modeling platform. It scans target hosts for open ports, queries the National Vulnerability Database (NVD API v2.0) for live CVE data, and automatically classifies every open service into its Cyber Kill Chain role (Entry Point, Pivot Node, Target). It models plausible attack chains by mapping discovered vulnerabilities to MITRE ATT&CK techniques (e.g., T1048, T1210).

A key innovation of NET_SCAN is the Critical Paths Engine, which utilizes both Breadth-First Search (BFS) to identify the shortest attack paths and Dijkstra's algorithm to identify the deadliest paths based on CVSS severity. To quantify risk, we introduce the Network Exposure Score (NES), a mathematical formula scaling from 0-100 that factors in CVE severity, depth, and the number of lateral paths. Furthermore, a What-If Mitigation Engine allows defenders to simulate decommissioning ports to see the real-time reduction in their NES. The system streams all results live to a React-based frontend using Server-Sent Events (SSE), generating a live force-directed attack graph.

NET_SCAN was experimentally validated against eight heterogeneous network environments, ranging from isolated campus Wi-Fi to hardened public internet hosts (e.g., Google DNS 8.8.8.8), proving its zero false-positive capability and its ability to accurately prioritize complex, multi-hop kill chains.

---

## TABLE OF CONTENTS
1. Introduction
2. System Analysis & Related Work
3. System Architecture and Design
4. Implementation Details
5. Experimental Validation & Results
6. Proposed Remediation Framework
7. Limitations and Future Scope
8. Conclusion
9. References

---

## 1. INTRODUCTION

### 1.1 Background
Administrators are often unaware of which ports are publicly exposed on their hosts, creating critical blind spots. While security teams use scanning tools like Nmap or Nessus, they often suffer from slow feedback loops, relying on command-line utilities that require high expertise and produce static, non-interactive text reports. Finding a single weak machine isn't enough anymore; defenders must understand the exact paths an attacker might take to move deeper into the network (lateral movement). Figuring out these attack paths by hand is incredibly time-consuming and usually requires expert red team skills. NET_SCAN bridges this gap by offering a fully automated, visually intuitive tool for network/security engineers.

### 1.2 Motivation
A raw list of open ports and CVEs is practically meaningless without risk context. Lateral movement is invisible in traditional tools. Organizations need a single composite Exposure Score to track overall structural risk over time and a clear visual representation of how vulnerabilities compound to create attack vectors.

### 1.3 Main Objective
The main objective is to provide a proactive, real-time network intelligence engine that automatically reasons about how an attacker would move through a network, linking vulnerabilities together into a visual Cyber Kill Chain.

### 1.4 Sub Objectives
1. Scan TCP ports and grab service banners automatically.
2. Integrate with the National Vulnerability Database (NVD) to fetch real-time CVEs.
3. Classify the risk of each open service and assign roles (Entry, Pivot, Target).
4. Map vulnerabilities to specific MITRE ATT&CK techniques.
5. Implement a Critical Paths Engine using BFS and Dijkstra algorithms.
6. Calculate a comprehensive Network Exposure Score (NES).
7. Provide a "What-If" simulation to test remediation strategies.
8. Stream all intelligence live to the browser via SSE and render a force-directed graph.

---

## 2. SYSTEM ANALYSIS & RELATED WORK

### 2.1 Existing Systems
Existing tools fail to combine network discovery with real-time lateral movement modeling:
* **Nmap:** Best-in-class scanner, but CLI only and lacks automated attack chain modeling and CVE-to-MITRE correlation.
* **Nessus:** Heavy vulnerability scanner, but produces static reports, lacks a visual kill chain graph, and does not stream live results.
* **BloodHound:** Highly effective at graphing attack paths in Active Directory environments, but limited strictly to AD infrastructure, whereas NET_SCAN targets general TCP/IP services.

### 2.2 Proposed System
NET_SCAN is a fully integrated full-stack platform. Instead of giving just a static report, NET_SCAN calculates the current strength of the network and streams the visual graph live to the browser. Its unique approach lies in mathematically combining topological path data with vulnerability severity to dynamically model the blast radius of an attack.

---

## 3. SYSTEM ARCHITECTURE AND DESIGN

The system consists of a Python backend handling the intelligence pipeline and a React frontend rendering the graphs.

### 3.1 Heuristic Kill Chain Classification
When NET_SCAN finds an open service, it automatically classifies its role in a cyber attack:
* **Entry Nodes:** Services exposed to the outside (ports 80, 443, 21) providing an initial foothold.
* **Pivot Nodes:** Services (SSH, RDP) an attacker could use to hop into restricted network segments.
* **Target Nodes:** The final objective holding sensitive data (DNS, Domain Controllers).

### 3.2 Critical Paths Engine (BFS & Dijkstra)
Our engine is unique because it evaluates the attack graph using two algorithms simultaneously:
* **BFS (Shortest Path):** Finds the quickest route to a target node, counting the fewest number of network jumps.
* **Dijkstra (Deadliest Path):** Evaluates the CVSS severity scores of the vulnerabilities, finding the path with the most critical flaws (labeled as DEADLIEST).

### 3.3 Network Exposure Score (NES)
To provide a simple, quantitative grade, we designed the NES. It combines CVSS 3.1 scores with the topological blast radius (number of attack paths).
**Formula:** `S_exp = Σ (w_cve * D_node) * α^P`
Where `w_cve` is vulnerability severity, `D` is depth, `P` is the number of lateral paths, and `α` is a multiplier. The score scales from 0 to 100, grouped into tiers: Low (0-30), Medium (31-59), High (60-80), Critical (81+).

---

## 4. IMPLEMENTATION DETAILS

### 4.1 Intelligence Pipeline Modules
* **Engine (engine.py):** Multi-threaded TCP port scanner that opens raw sockets and grabs banners immediately.
* **Analyzer (analyzer.py):** Integrates with NVD API v2.0 to fetch live CVEs based on service banners. It maps these to MITRE techniques (e.g., Exfiltration Over Alt Protocol T1048, Exploiting Remote Services T1210).
* **Graph Generator (graph_gen.py):** Builds nodes and edges based on heuristic rules (Entry → Pivot → Target).
* **Streamer & API:** Flask REST API using Server-Sent Events (SSE) to push updates instantly.

### 4.2 What-If Mitigation Engine
A key feature allowing users to interact with the graph. By clicking a vulnerable service, the user can simulate taking it offline. The engine instantly recalculates the NES and updates the attack chains, explicitly showing how many points the risk score drops when a specific port is decommissioned.

### 4.3 Live Dashboard & Visualization
Built with React and HTML5 Canvas, the frontend runs a physics simulation from scratch. Nodes repel each other, edges attract, and gravity centers the graph, creating a self-settling interactive visual model.

---

## 5. EXPERIMENTAL VALIDATION & RESULTS

We validated NET_SCAN against eight heterogeneous network environments. Scans evaluated ports 1-1024.

### 5.1 Testing Environments
* **Network A (Campus Wi-Fi):** Target IP 10.68.124.5 (Clean baseline)
* **Network B (VirtualBox FTP Host):** Target IP 10.9.7.187 (Vulnerable FTP)
* **Network C (VirtualBox Multi-Service):** Target IP 192.168.56.1 (SMB/NetBIOS/RPC)
* **Network D (Mobile Hotspot Bridge):** Target IP 192.168.137.1 (Clean baseline)
* **Network E (Public Internet Host 1):** Target IP 208.67.222.222 (OpenDNS public server)
* **Network F (Public Internet Host 2):** Target IP 185.222.222.222 (Highly complex, maximum risk)
* **Network G (Local SMB Host):** Target IP 172.20.10.3 (Windows file sharing)
* **Network H (Google Public DNS):** Target IP 8.8.8.8 (Secure public server)

### 5.2 Summary of Results

| Metric | Net A | Net B | Net C | Net D | Net E | Net F | Net G | Net H |
|---|---|---|---|---|---|---|---|---|
| **Open Ports** | 0 | 1 | 3 | 0 | 5 | 7+ | 3 | 4 |
| **Lateral Paths** | 0 | 0 | 0 | 0 | 3 | 7 | 0 | 2 |
| **MITRE Tech.** | 0 | 0 | 2 | 0 | 5 | 3 | 2 | 2 |
| **NES Score** | 0 | 20 | 50 | 0 | 85 | 100 | 50 | 60 |
| **Risk Tier** | Low | Low | Med | Low | Crit | Crit | Med | High |

### 5.3 Key Findings
1. **Zero False Positives:** Networks A and D returned NES = 0, proving the heuristic engine does not generate false alarms.
2. **Topological Path Availability Trumps Raw CVEs:** Networks C and G had an NES of 50 (0 lateral paths), but Network H scored 60 despite similar vulnerabilities, solely because it possessed 2 lateral paths.
3. **BFS vs. Dijkstra Divergence:** On complex networks like E and F, 2-hop Dijkstra paths through SSH pivot nodes scored drastically higher risks (19.7) than 1-hop BFS paths (8.9). This proved hop-count alone is insufficient for assessing attack risk.
4. **Actionable Mitigation:** In Network C, the What-If Engine proved that decommissioning SMB (Port 445) reduced the NES by 20 points, prioritizing it over RPC (10 point reduction).

---

## 6. PROPOSED REMEDIATION FRAMEWORK

NET_SCAN excels at discovery, but remediation requires network-layer verification. We propose a framework utilizing Wireshark for deep packet inspection (DPI).

1. **Triage via NES Prioritization:** Focus on Critical-tier networks (NES >= 81) and highest-leverage ports identified by the What-If engine.
2. **Live Traffic Capture:** Deploy Wireshark with display filters targeting the port pairs identified in NET_SCAN’s lateral movement paths (e.g., `tcp.port==21 && tcp.port==22`).
3. **Targeted Port Hardening:** Based on evidence of unencrypted credentials or malicious negotiations, decommission services, enforce protocol upgrades (e.g., FTP to SFTP), or deploy strict VLAN ACLs.
4. **Post-Remediation Verification:** Execute a second NET_SCAN pass to quantify the NES reduction and verify the blocked ports carry zero traffic.

---

## 7. LIMITATIONS AND FUTURE SCOPE

**Limitations:**
* Currently, the system maps attack paths between services on a single IP address to maintain real-time performance.
* NVD API rate limits can occasionally delay live CVE enrichment.
* Service fingerprinting relies on banner grabbing, which can return older vulnerabilities if legacy banners are reported.

**Future Enhancements:**
* **Subnet Scanning:** Expanding the graph to map lateral movement across entire CIDR ranges involving multiple discrete machines.
* **Machine Learning:** Integrating ML to predict undocumented attack paths based on topological similarities.
* **SOAR Integration:** Connecting directly to Security Orchestration, Automation, and Response tools to automate firewall rule generation.

---

## 8. CONCLUSION
NET_SCAN proves that network scanning does not have to be a static, command-line-only task. By moving beyond raw scanning to automated Cyber Kill Chain modeling, NET_SCAN provides a story of why exposed ports are dangerous and exactly how an attacker would use them together. Testing across eight distinct environments validated that the number of attack paths (topological blast radius) has the most significant impact on network risk. With its live streaming engine, dual-algorithm critical pathfinder, What-If analysis, and clear Network Exposure Score, NET_SCAN offers an unprecedented level of real-time visibility into internal network attack surfaces.

---

## 9. REFERENCES
1. Lyon, G. (2009). Nmap Network Scanning: The Official Nmap Project Guide. Insecure.Com LLC.
2. Tenable Network Security. Nessus Vulnerability Scanner.
3. National Institute of Standards and Technology. National Vulnerability Database (NVD).
4. Ammann, P., Wijesekera, D., & Kaushik, S. (2002). Scalable, graph-based network vulnerability analysis. ACM CCS.
5. SpecterOps. BloodHound: Six Degrees of Domain Admin.
6. MITRE Corporation. ATT&CK Framework.
7. Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. Numerische Mathematik.
8. Cormen, T. H. et al. (2009). Introduction to Algorithms (3rd ed.). MIT Press.
9. Sanders, C. (2017). Practical Packet Analysis: Using Wireshark to Solve Real-World Network Problems.
