# NET_SCAN — Presentation Guide & Viva Preparation

---

## PART 1: HOW TO PRESENT (Slide-by-Slide Script)

---

### Slide 1: Title Slide (30 seconds)
**Say:** "Good morning. Our project is NET_SCAN — an automated network security scanner that goes beyond listing open ports. It models how an attacker would actually move through your network, step by step, using something called lateral movement. It visualizes all of this live in the browser."

---

### Slide 2: Problem Statement (45 seconds)
**Say:** "Traditional tools like Nmap give you a list of open ports. Nessus gives you a list of vulnerabilities. But neither of them answers the most important question — how can an attacker chain these together to move from one service to another? That is called lateral movement, and it is invisible in existing tools. Security teams end up with a long text report and no idea which port to fix first."

**Key phrase to use:** *"A list of ports is not a security posture."*

---

### Slide 3: Our Solution (1 minute)
**Say:** "NET_SCAN solves this. It scans your target, grabs service banners, fetches live CVE data from the National Vulnerability Database, maps each service to MITRE ATT&CK techniques, classifies them as Entry points, Pivot points, or Targets using the Cyber Kill Chain, then draws an interactive attack graph right in your browser — all in real time."

**Show:** Architecture diagram or live demo screenshot.

---

### Slide 4: Key Innovation — Dual Algorithm Engine (1 minute)
**Say:** "What makes NET_SCAN unique is our Critical Paths Engine. We run two algorithms simultaneously — BFS finds the shortest path an attacker can take, while Dijkstra finds the deadliest path based on CVSS severity scores. On simple networks they give the same result, but on complex ones like our Network E test, Dijkstra found paths with risk scores of 19.7 while BFS only found 8.9. This proves that hop count alone is not enough to measure risk."

**Key phrase:** *"Shortest is not always deadliest."*

---

### Slide 5: Network Exposure Score (45 seconds)
**Say:** "We also created the Network Exposure Score — a single number from 0 to 100 that tells you exactly how exposed your network is. The formula combines CVE severity, node depth, and the number of lateral paths. We group it into four tiers: Low, Medium, High, and Critical. This gives any non-technical person a quick answer to 'how safe are we?'"

**Show the formula:** `S_exp = Σ(w_cve × D_node) × α^P`

---

### Slide 6: What-If Engine (30 seconds)
**Say:** "We also built a What-If engine. You can click on any port in the graph and simulate closing it. The tool instantly recalculates the NES and shows you how many points the risk drops. For example, in Network C, closing SMB on port 445 dropped the score by 20 points. This helps defenders prioritize which port to patch first."

---

### Slide 7: Testing Results (1 minute)
**Say:** "We tested NET_SCAN on eight completely different networks — from our campus Wi-Fi to Google's public DNS server at 8.8.8.8. Networks A and D had zero open ports and scored NES 0 — proving zero false positives. Network F scored the maximum NES of 100 with 7 lateral paths. The most interesting finding was that Networks C and G had the same number of CVEs but scored the same NES of 50, while Network H with similar CVEs scored 60 — because it had 2 lateral paths. This proves our key insight: attack paths matter more than raw CVE count."

**Show:** The results table.

| Network | Open Ports | Lateral Paths | NES | Tier |
|---|---|---|---|---|
| A (Campus Wi-Fi) | 0 | 0 | 0 | Low |
| B (VirtualBox FTP) | 1 | 0 | 20 | Low |
| C (VirtualBox Multi) | 3 | 0 | 50 | Medium |
| D (Mobile Hotspot) | 0 | 0 | 0 | Low |
| E (OpenDNS) | 5 | 3 | 85 | Critical |
| F (185.222.222.222) | 7+ | 7 | 100 | Critical |
| G (Local SMB) | 3 | 0 | 50 | Medium |
| H (Google DNS) | 4 | 2 | 60 | High |

---

### Slide 8: Tech Stack (30 seconds)
**Say:** "The backend is Python with Flask for the REST API. We use multi-threaded TCP sockets for scanning and Server-Sent Events for live streaming. The frontend is React 18 with a custom HTML5 Canvas physics engine for the force-directed graph. CVE data comes from the NVD API version 2.0."

---

### Slide 9: Demo (2 minutes)
**Do a live demo or show screenshots:**
1. Enter an IP → click Scan
2. Show ports appearing in real time
3. Show the attack graph forming
4. Click on Critical Paths tab → show BFS vs Dijkstra
5. Click on MITRE tab → show technique mapping
6. Click on What-If → simulate removing a port → show NES drop

---

### Slide 10: Conclusion (30 seconds)
**Say:** "NET_SCAN proves that network scanning doesn't have to be static or command-line only. By combining real-time scanning with kill chain modeling, dual-algorithm pathfinding, and a clear exposure score, it gives defenders something no other tool does — a visual story of exactly how an attacker would move through their network, and exactly what to fix first. Thank you."

---

## PART 2: VIVA QUESTIONS & ANSWERS (100 Questions)

---

### Category 1: Project Overview (Q1–Q15)

**Q1. What is NET_SCAN in one line?**
A: NET_SCAN is a real-time network intelligence platform that scans ports, maps vulnerabilities to attack paths using the Cyber Kill Chain, and visualizes lateral movement graphs live in the browser.

**Q2. What problem does it solve?**
A: Traditional scanners give a flat list of open ports/CVEs but don't show how an attacker could chain them together. NET_SCAN models these attack chains visually.

**Q3. How is it different from Nmap?**
A: Nmap is a CLI-based scanner that lists ports. NET_SCAN takes that further — it classifies services into kill chain roles, fetches live CVEs, maps MITRE techniques, runs BFS/Dijkstra for attack paths, and renders everything as a live graph.

**Q4. How is it different from Nessus?**
A: Nessus produces static vulnerability reports. NET_SCAN streams results live via SSE, models lateral movement, and provides an interactive What-If engine for remediation planning.

**Q5. How is it different from BloodHound?**
A: BloodHound only works for Active Directory environments. NET_SCAN works on any TCP/IP network.

**Q6. What is lateral movement?**
A: Lateral movement is when an attacker, after gaining initial access, moves through the network from one compromised service to another to reach higher-value targets.

**Q7. What is the Cyber Kill Chain?**
A: It is a framework that breaks an attack into phases. We use three roles: Entry (initial access points like HTTP/FTP), Pivot (services used to hop deeper like SSH), and Target (final objectives like DNS/databases).

**Q8. What is the Network Exposure Score?**
A: NES is a composite score from 0-100 that quantifies how exposed a network is. It combines CVE severity, node depth, and lateral path count.

**Q9. What are the four NES tiers?**
A: Low (0–30), Medium (31–59), High (60–80), Critical (81–100).

**Q10. What is the What-If engine?**
A: It lets you simulate closing a specific port and instantly see how much the NES drops, helping prioritize which vulnerability to fix first.

**Q11. How many networks did you test?**
A: Eight — campus Wi-Fi, two VirtualBox setups, a mobile hotspot, two public internet hosts (OpenDNS, 185.222.222.222), a local SMB host, and Google's public DNS (8.8.8.8).

**Q12. What was the highest NES you found?**
A: Network F (185.222.222.222) scored NES 100 (Critical) with 7 lateral paths and 9 connections.

**Q13. What was the lowest NES?**
A: Networks A and D scored NES 0, confirming zero false positives.

**Q14. Who are the target users?**
A: Security engineers doing internal audits, students learning pentesting, and developers checking their local service exposure.

**Q15. Is this tool for offensive or defensive security?**
A: Defensive. It helps defenders understand their attack surface and prioritize remediation. We don't exploit any vulnerabilities.

---

### Category 2: Technical Architecture (Q16–Q35)

**Q16. What is the tech stack?**
A: Python/Flask backend, React 18 frontend, HTML5 Canvas for graphs, NVD API v2.0 for CVEs, SSE for live streaming.

**Q17. What backend modules exist?**
A: engine.py (scanner), analyzer.py (risk + CVE + MITRE), graph_gen.py (graph + BFS/Dijkstra + NES + What-If), streamer.py (SSE), main.py (Flask API).

**Q18. How does the port scanner work?**
A: It uses a producer-consumer thread model. A main thread fills a Queue with ports, and N worker threads consume them, opening raw TCP sockets using connect_ex().

**Q19. What is connect_ex()?**
A: It's a Python socket method that attempts a TCP connection and returns 0 on success (port open) or an error code (port closed/filtered), without raising exceptions.

**Q20. How do you grab banners?**
A: After a successful connection, we send a probe (like "Hello\r\n") and call recv() to read the service response, which often contains the service name and version.

**Q21. What is Server-Sent Events (SSE)?**
A: SSE is a one-way HTTP streaming protocol where the server pushes events to the client. Unlike WebSockets, it's unidirectional (server → client) and uses standard HTTP.

**Q22. Why SSE instead of WebSockets?**
A: Our data flow is unidirectional (server pushes scan results to browser). SSE is simpler, uses standard HTTP, auto-reconnects, and is sufficient for our use case.

**Q23. How does the frontend render the graph?**
A: We use a custom physics simulation on HTML5 Canvas. Nodes repel each other (Coulomb's law), edges attract (Hooke's law), and gravity centers the layout. The simulation settles when velocities drop below 0.5px/frame.

**Q24. Why not use a library like D3.js?**
A: We built the physics engine from scratch to have full control over the rendering, performance, and to demonstrate understanding of graph visualization algorithms.

**Q25. How do you classify ports into kill chain roles?**
A: Using a heuristic rule engine. Web servers (80, 443) and FTP (21) are Entry points. SSH (22) and RDP (3389) are Pivot points. DNS (53) and databases are Targets.

**Q26. How do you fetch CVEs?**
A: We query the NVD API v2.0 with the service name/version extracted from banners. The API returns matching CVE IDs and CVSS 3.1 base scores.

**Q27. What is CVSS?**
A: Common Vulnerability Scoring System. It rates vulnerability severity from 0.0 to 10.0. We use version 3.1.

**Q28. How do you map MITRE ATT&CK techniques?**
A: Based on service type. For example, FTP maps to T1048 (Exfiltration Over Alt Protocol), SSH maps to T1021.004, web servers map to T1505.003 (Web Shell).

**Q29. What is MITRE ATT&CK?**
A: It's a knowledge base of adversary tactics and techniques based on real-world observations. We use it to classify what an attacker could do with each discovered service.

**Q30. How does BFS work in your system?**
A: BFS explores the attack graph level by level from Entry nodes to Target nodes, finding the path with the fewest hops (labeled SHORTEST).

**Q31. How does Dijkstra work in your system?**
A: We use CVSS scores as edge weights (inverted so higher severity = lower cost). Dijkstra finds the path traversing the most critical vulnerabilities (labeled DEADLIEST).

**Q32. Why use both BFS and Dijkstra?**
A: Because the shortest path is not always the most dangerous. On Network E, BFS found 1-hop paths with risk 8.9, but Dijkstra found 2-hop paths through SSH with risk 19.7.

**Q33. What is the NES formula?**
A: S_exp = Σ(w_cve × D_node) × α^P, where w_cve is CVE severity, D is depth, P is lateral path count, and α is a blast radius multiplier.

**Q34. What is the blast radius multiplier (α)?**
A: It's a scaling factor that amplifies the NES based on how many lateral paths exist. More paths = exponentially higher risk.

**Q35. How does the What-If engine work?**
A: It creates a copy of the attack graph, removes the selected port/node, recalculates all paths and NES on the modified graph, and reports the delta.

---

### Category 3: Testing & Results (Q36–Q55)

**Q36. Why did you test 8 networks?**
A: To prove the tool works across diverse environments — local VMs, campus Wi-Fi, public internet servers, and mobile hotspots.

**Q37. Why did Networks A and D score NES 0?**
A: Because all 1024 ports were closed or filtered. No open services means no attack surface, so NES correctly returns 0.

**Q38. What does NES 0 prove?**
A: It proves the zero false-positive property — the tool doesn't generate false alarms on secure networks.

**Q39. Why did Networks C and G both score NES 50?**
A: Both had 3 open services and 0 lateral paths. Despite different service profiles (SMB vs VirtualBox services), the topological structure was identical.

**Q40. Why did Network H score higher (60) than G (50)?**
A: Network H had 2 lateral paths while G had 0. Even though they had similar CVE counts, the presence of attack paths increased the NES.

**Q41. What is the key insight from your testing?**
A: Lateral path count matters more than raw CVE count. The α^P multiplier in the NES formula drives tier transitions.

**Q42. What ports did you find on 8.8.8.8?**
A: Port 21 (FTP), Port 53 (DNS), Port 443 (HTTPS), Port 853 (DNS-over-TLS).

**Q43. What MITRE techniques did you find on Network E?**
A: Five: T1048, T1021.004, T1505.003, T1210, T1572.

**Q44. What was the deadliest path on Network E?**
A: Port 21 (FTP) → Port 22 (SSH) → Port 53 (DNS), with a risk score of 19.7.

**Q45. What CVE had the highest CVSS score?**
A: CVE-1999-0054 and CVE-1999-0080, both CVSS 10.0 (Critical), associated with FTP services.

**Q46. Were the old CVEs (from 1999) a problem?**
A: They appeared because banners matched older service fingerprints. The system finds modern CVEs too, if the banner version is recent.

**Q47. What scan parameters did you use?**
A: Ports 1-1024, timeout 120-145ms, 1 thread per scan, real-time NVD lookups.

**Q48. Did you exploit any vulnerabilities?**
A: No. We only used passive TCP SYN probes. No payloads, no exploitation, no malicious activity.

**Q49. How did the What-If engine perform on Network C?**
A: Closing SMB (445) reduced NES by 20 pts. Closing NetBIOS (139) also reduced by 20 pts. Closing RPC (135) reduced by 10 pts.

**Q50. What was the most complex network?**
A: Network F (185.222.222.222) — 7+ services, 9 connections, 7 lateral paths, NES 100.

**Q51. How did BFS vs Dijkstra differ on Network H?**
A: They gave the same results — both found only 1-hop shortest paths. This is because the topology was simple with no multi-hop alternatives.

**Q52. How did BFS vs Dijkstra differ on Network E?**
A: Significantly. BFS found 1-hop paths (risk 8.7-8.9). Dijkstra found 2-hop paths through SSH pivot with risk 19.3-19.7.

**Q53. What does this BFS/Dijkstra divergence prove?**
A: That hop count alone is insufficient for measuring attack risk. A longer path through critical vulnerabilities is more dangerous.

**Q54. How long did a typical scan take?**
A: Scanning 1024 ports with 120-145ms timeout takes approximately 2-3 minutes per target.

**Q55. Can you scan multiple IPs at once?**
A: Currently no — the system scans one IP at a time. Subnet scanning is a planned future enhancement.

---

### Category 4: Algorithms & Data Structures (Q56–Q70)

**Q56. What data structure do you use for the port queue?**
A: Python's thread-safe Queue from the queue module.

**Q57. What data structure represents the attack graph?**
A: An adjacency list using Python dictionaries — nodes as keys, lists of edges as values.

**Q58. What is the time complexity of BFS?**
A: O(V + E), where V is the number of nodes (services) and E is the number of edges (attack connections).

**Q59. What is the time complexity of Dijkstra?**
A: O((V + E) log V) using a priority queue (min-heap).

**Q60. Why is Dijkstra better than BFS for finding dangerous paths?**
A: BFS treats all edges equally (unweighted). Dijkstra uses CVSS severity as weights, finding paths that maximize cumulative risk.

**Q61. How do you handle the producer-consumer model?**
A: The main thread puts port numbers into a Queue. Worker threads call queue.get(), scan the port, and put results back.

**Q62. What is thread safety and how do you ensure it?**
A: Thread safety prevents race conditions. We use Python's Queue (inherently thread-safe) and ScanContext objects to isolate per-scan state.

**Q63. How does the force-directed graph algorithm work?**
A: Each frame: calculate repulsion between all node pairs (Coulomb), attraction along edges (Hooke), gravity toward center, apply damping. Update positions until settled.

**Q64. What is the damping factor?**
A: A coefficient (typically 0.9) that reduces node velocity each frame, causing the graph to gradually stop moving and settle into a stable layout.

**Q65. How do you calculate edge weights for Dijkstra?**
A: We invert the CVSS score: weight = 10.0 - CVSS. So a vulnerability with CVSS 9.8 gets weight 0.2 (very low cost = Dijkstra prioritizes it).

**Q66. What is a priority queue?**
A: A data structure where elements are dequeued in order of priority (lowest cost first). Python's heapq module implements this.

**Q67. How does NES scaling work?**
A: The raw score from the formula is normalized to 0-100 using min-max scaling, then categorized into the four tiers.

**Q68. What happens if NVD API is down?**
A: The system handles API failures gracefully and continues scanning with reduced CVE data. It does not crash.

**Q69. How do you serialize scan results?**
A: Complete JSON serialization to scan_output.json, containing all ports, services, CVEs, graph structure, paths, and NES.

**Q70. What is JSON and why use it?**
A: JavaScript Object Notation — a lightweight data format. We use it because both Python (backend) and JavaScript (frontend) can parse it natively.

---

### Category 5: Security Concepts (Q71–Q85)

**Q71. What is a TCP SYN scan?**
A: A scan that sends a SYN packet to initiate a TCP handshake. If the target replies with SYN-ACK, the port is open. If RST, it's closed.

**Q72. What is banner grabbing?**
A: Connecting to a service and reading its initial response to identify the software name and version (e.g., "SSH-2.0-OpenSSH_9.2p1").

**Q73. What is CVE?**
A: Common Vulnerabilities and Exposures — a standardized identifier for known security flaws (e.g., CVE-1999-0054).

**Q74. What is NVD?**
A: National Vulnerability Database — a US government repository of CVE data with severity scores, maintained by NIST.

**Q75. What is CVSS 3.1?**
A: The latest major version of the Common Vulnerability Scoring System, rating vulnerabilities from 0.0 (none) to 10.0 (critical).

**Q76. What is the kill chain model?**
A: Originally a military concept, adapted by Lockheed Martin for cybersecurity. It describes the stages of a cyberattack: reconnaissance, weaponization, delivery, exploitation, installation, command & control, actions on objectives.

**Q77. What is an Entry point in your model?**
A: A service exposed to the outside that gives an attacker initial access — like web servers (80/443) or FTP (21).

**Q78. What is a Pivot point?**
A: A service an attacker uses to move deeper — like SSH (22) or RDP (3389).

**Q79. What is a Target node?**
A: The final objective — like a DNS server (53), database, or domain controller.

**Q80. What is T1048?**
A: MITRE ATT&CK technique "Exfiltration Over Alternative Protocol" — using non-standard protocols to steal data.

**Q81. What is T1210?**
A: "Exploitation of Remote Services" — exploiting vulnerabilities in network services to move laterally.

**Q82. What is an attack graph?**
A: A directed graph where nodes represent services/hosts and edges represent possible attack transitions between them.

**Q83. What is deep packet inspection (DPI)?**
A: Examining the full content of network packets (not just headers). We propose using Wireshark for DPI in our remediation framework.

**Q84. What is network segmentation?**
A: Dividing a network into isolated segments (VLANs) so that a compromise in one segment can't spread to others.

**Q85. What are stateful firewall rules?**
A: Firewall rules that track connection state (established, new, related) rather than just filtering individual packets.

---

### Category 6: Limitations & Future Work (Q86–Q95)

**Q86. What are the main limitations?**
A: Single-IP scanning only, NVD rate limits, banner-based fingerprinting can return old CVEs, no OS fingerprinting, no IPv6.

**Q87. Why single-IP only?**
A: To maintain real-time performance. Subnet scanning would require significant architectural changes for concurrent multi-host processing.

**Q88. How would you add subnet scanning?**
A: Use CIDR range parsing, spawn separate scan contexts per host, aggregate results into a multi-host attack graph.

**Q89. How would you add machine learning?**
A: Train a model on known attack topologies to predict undocumented lateral movement paths based on service similarity.

**Q90. How would you integrate with SIEM/SOAR?**
A: Export NES scores and attack chain data via API to SIEM platforms, and trigger automated firewall rules through SOAR playbooks.

**Q91. Could this be deployed in the cloud?**
A: Yes — the backend could be containerized with Docker and deployed on AWS/GCP with a managed database for historical scans.

**Q92. Why not use Masscan instead of custom sockets?**
A: Masscan is faster but is a C binary. Our Python scanner integrates directly with our intelligence pipeline and allows per-port SSE streaming.

**Q93. Could you add PDF report generation?**
A: Yes — using libraries like ReportLab or WeasyPrint to export the dashboard, graphs, and NES data as downloadable PDF reports.

**Q94. How would you handle IPv6?**
A: Extend the socket module to support AF_INET6 and expand the port classification heuristics for IPv6-specific services.

**Q95. What about authentication for the dashboard?**
A: We have a Google OAuth integration structure (AuthContext.js) that could be activated to require login before accessing scans.

---

### Category 7: Tricky / Conceptual Questions (Q96–Q100)

**Q96. A normal scanner says Networks G and H are equally risky (both have 6 CVEs). Your tool says 50 vs 60. Why is your tool more accurate?**
A: Because raw CVE count ignores topology. Network H has 2 lateral paths that let an attacker chain exploits together, making it structurally more dangerous. Our NES formula captures this through the α^P multiplier.

**Q97. If I patch the SSH server on Network E, what happens to the risk?**
A: The 3 deadliest paths (all routing through SSH as pivot, risk ~19.7) would be eliminated. Only the 1-hop shortest paths would remain (risk ~8.9), significantly reducing overall NES.

**Q98. Can your tool be used maliciously?**
A: The tool only performs passive TCP scans — no exploitation. However, like any scanning tool, it should only be used on networks you own or have explicit authorization to scan.

**Q99. Why is the NES for 8.8.8.8 (60) higher than your own local machine (50)?**
A: Despite Google's hardened infrastructure, 8.8.8.8 has 2 lateral paths connecting its services, while our local machine had 0. The NES formula weights topological path availability more heavily than individual CVE severity at the Medium-High boundary.

**Q100. If you had to explain your entire project in 30 seconds, what would you say?**
A: "NET_SCAN scans your network, fetches real CVEs, maps them to MITRE attack techniques, classifies services as entry points, pivots, or targets, then runs BFS and Dijkstra to find both the shortest and deadliest attack paths. It gives you one score from 0 to 100 and lets you simulate fixing ports to see the score drop instantly. We tested it on 8 networks including Google DNS and proved that attack paths matter more than just counting vulnerabilities."
