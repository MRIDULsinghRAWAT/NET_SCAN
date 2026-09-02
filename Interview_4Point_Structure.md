# NET_SCAN — Interview Answer Sheet

---

## ❓ PROBLEM — What Does NET_SCAN Solve?

1. **Existing tools (Nmap, Nessus) give you a list, not a story.** They tell you "port 22 is open" or "CVE-2024-XXXX exists" — but they never connect the dots between vulnerabilities.
2. **Lateral movement is invisible.** No tool shows how an attacker can chain port 80 (entry) → SSH (pivot) → database (target) to move through your network step by step.
3. **Security teams can't prioritize.** With 50 open ports, which one should you fix first? There's no single risk score and no way to simulate "what happens if I close this port?"
4. **Reports are static and delayed.** Traditional scanners finish scanning, then dump a PDF. There's no real-time visibility while the scan runs.
5. **NET_SCAN fixes all four.** It scans → classifies into Kill Chain roles → maps attack paths → scores risk (NES 0–100) → streams a live attack graph — and a What-If Engine tells you exactly which port to close first.
## ✅ SOLUTION — What Does NET_SCAN Do?

"So what NET_SCAN does is — you give it a target IP address, and it scans all the open ports on that host and grabs the service banners to identify what's running — like SSH, FTP, HTTP, etc.

Then it goes a step further — it queries the National Vulnerability Database in real time and pulls the actual CVEs associated with those services.

Now here's where our project becomes different from a normal scanner — it doesn't just list these vulnerabilities. It classifies every service into a role — Entry Point, Pivot Node, or Target — based on the Cyber Kill Chain.

> **What is Cyber Kill Chain?** It's a framework originally developed by Lockheed Martin that breaks down a cyber attack into stages — from reconnaissance to the final objective. We simplified it into three roles: **Entry** (how the attacker gets in — ports like 80, 443, FTP), **Pivot** (how they move deeper — SSH, SMB, RDP), and **Target** (what they're after — databases, DNS).

Once every service has a role, we build an attack graph — connecting Entry to Pivot, Pivot to Target, and so on — basically modeling how an attacker would actually move through the network. Then each edge in that graph gets mapped to a specific MITRE ATT&CK technique like T1210 (Remote Service Exploitation) or T1048 (Exfiltration Over Alternative Protocol).

> **What is MITRE ATT&CK?** It's the global industry-standard catalog of real-world hacker tactics and techniques. We map every attack edge to one of our **Top 5 MITRE Techniques**:
> 1. **T1210 (Exploitation of Remote Services):** Exploiting unpatched remote services like SMB (`HTTP ➔ SMB`).
> 2. **T1048 (Exfiltration Over Alt Protocol):** Smuggling stolen data covertly out via DNS (`FTP/SSH ➔ DNS`).
> 3. **T1505.003 (Web Shell):** Uploading backdoor web shells on port 80 to gain SSH access (`HTTP ➔ SSH`).
> 4. **T1021.004 (Remote Services: SSH):** Reusing stolen credentials to move laterally into SSH (`FTP ➔ SSH`).
> 5. **T1572 (Protocol Tunneling):** Creating encrypted SSH tunnels to pivot into internal databases (`SSH ➔ DB`).

Once the graph is ready, we run two algorithms on it — BFS to find the shortest path an attacker could take, and a modified Dijkstra to find the deadliest path based on cumulative risk scores.

All of this gets combined into a single number — the Network Exposure Score, from 0 to 100 — so even a non-technical person can understand how exposed the network is.

And the best part — everything streams live to the browser. You don't wait for the scan to finish. You see ports appearing on an interactive attack graph in real time. Plus, we built a What-If Engine where you can click any port, simulate closing it, and instantly see how much the risk score drops — so you know exactly what to fix first.

For example — in our testing, closing SMB on port 445 dropped the NES by 20 points, but closing RPC only dropped it by 10. So the defender instantly knows — fix SMB first. On another network, closing just FTP brought the entire NES from 20 to 0 — meaning that one port was the entire risk."

---

## 📊 NETWORK EXPOSURE SCORE (NES) — Formula & Calculation

*Interviewer puchhe "How is the NES calculated?" ya "What is the formula behind the score?" — toh ye bol:*

### 🧮 Practical Formula (From our code in `graph_gen.py`):
$$\text{Total Exposure} = (\text{Critical Services} \times 20) + (\text{High Risk Services} \times 10) + (\text{Lateral Movement Paths} \times 5)$$
$$\text{NES} = \min(\text{Total Exposure}, 100)$$

### 🎯 Score Weight Breakdown:
* **Critical Service (Weight: 20 pts):** Exploitable services like unencrypted FTP (Port 21), Telnet (Port 23), or RDP with RCE risk.
* **High-Risk Service (Weight: 10 pts):** Attack surfaces like HTTP (Port 80), SMB (Port 445), or MySQL without TLS.
* **Lateral Movement Path (Weight: 5 pts each):** Valid attack chains linking Entry $\rightarrow$ Pivot or Pivot $\rightarrow$ Target. (More interconnected paths = compound risk).

### 🏷️ The 4 Risk Tiers:
| Score Range | Severity Tier | Meaning |
|---|---|---|
| **0 – 39** | 🟢 **LOW** | Minimal attack surface, isolated basic services |
| **40 – 59** | 🟡 **MEDIUM** | Moderate risk, few exposed services or legacy ports |
| **60 – 79** | 🟠 **HIGH** | Multiple services exposed with valid lateral attack links |
| **80 – 100** | 🔴 **CRITICAL** | Critical vulnerabilities combined with multi-hop lateral movement |

---

### 💬 How to Say It in the Interview:

"We designed the **Network Exposure Score (NES)** to give security teams a single 0 to 100 metric for overall network risk. 

Under the hood, the formula computes:
`Critical Services × 20 + High-Risk Services × 10 + Lateral Movement Paths × 5`, capped at 100.

The key innovation is adding **5 points for every lateral movement path**. This ensures that risk isn't just about how many open ports you have, but **how they connect together**. For example, two networks might both have 3 open ports, but if one has connected lateral attack paths through SSH and SMB, its NES score will be significantly higher because the blast radius is larger."

### 🧬 Origin & Theoretical Foundation of NES:
> ⚡ **1-Line Punchline for Interview:** *"The NES formula is adapted from Ammann et al.'s graph reachability research (ACM CCS 2002) — extending isolated CVSS scores by compounding service severity with lateral movement attack paths to quantify true topological blast radius."*

* **Academic Backing:** Inspired by **Ammann, Wijesekera & Kaushik (ACM CCS 2002)** on *Scalable Graph-Based Network Vulnerability Analysis*, which proved that network vulnerability is a function of graph reachability and path chaining, not just isolated host flaws.
* **The Gap in Standard CVSS:** CVSS 3.1 only scores a single vulnerability on a single port in isolation (0–10). It cannot measure **topological blast radius** (e.g., how an FTP flaw enables pivot to an internal SSH server).
* **Formal Research Model:** $S_{\text{exp}} = \sum (w_{\text{cve}} \times D_{\text{node}}) \times \alpha^P$ (where $w$ = severity weight, $D$ = topological depth, $P$ = lateral paths, $\alpha$ = compounding multiplier).
* **Empirical Calibration:** We tuned the practical weights ($20 / 10 / 5$) and validated them across **8 real-world networks** to ensure clean networks score exactly 0 (no false alarms) and high-exposure multi-hop hosts cap proportionally at 100.

---

## 🛡️ CVE EXAMPLES — Real Results From Our Testing

*Interviewer puchhe "Give me an example of a CVE your tool found" — toh ye bol:*

| Service Found | CVE Pulled from NVD | CVSS Score | Severity | What It Does |
|---|---|---|---|---|
| **FTP (Port 21)** | **CVE-1999-0080** | **10.0** | 🔴 Critical | Allows remote attackers to gain root access via wu-ftp PATH_EXECPATH misconfiguration |
| **FTP (Port 21)** | **CVE-1999-0054** | **10.0** | 🔴 Critical | FTP bounce attack — attacker uses your FTP server to port-scan other machines |
| **FTP (Port 21)** | **CVE-1999-0201** | **6.4** | 🟡 Medium | FTP allows unauthorized file retrieval via crafted commands |
| **DNS (Port 53)** | **CVE-1999-0184** | **6.4** | 🟡 Medium | DNS zone transfer leaks internal network topology to attackers |
| **RDP (Port 3389)** | **CVE-2019-0708** | **9.8** | 🔴 Critical | "BlueKeep" — allows remote code execution on Windows without authentication (wormable) |

### 💬 How to Say It in Interview:

"For example, when we scanned Network B which had FTP on port 21, our tool queried NVD and pulled CVE-1999-0080 with a CVSS score of 10.0 — that's the maximum possible severity. This CVE allows root access through a misconfigured FTP server. Similarly, on Network F, we found 6 CVEs total — 1 Critical and 5 Medium. And when we scanned a host with RDP open, it flagged CVE-2019-0708 which is BlueKeep — a wormable vulnerability that lets attackers execute code remotely without even needing credentials."

### 💬 If Asked "Why are old CVEs showing up?":

"That's because CVE lookup is banner-based. When a service reports a legacy banner — like an older FTP version string — NVD returns vulnerabilities associated with that version. A modern, updated service would return newer CVEs. This is actually the same approach Nmap uses. In a production version, we'd add version inference to filter out irrelevant matches."

---

## 🎯 MITRE ATT&CK MAPPING — How We Use It (In Short)

*Interviewer puchhe "How do you map attack paths?" ya "What is MITRE ATT&CK in your project?" — toh ye bol:*

### ⚡ 1-Line Concept:
> **MITRE ATT&CK is a globally recognized cybersecurity framework of real-world adversary tactics and techniques. NET_SCAN labels every attack edge in the graph with an exact MITRE technique ID, showing the exact method an attacker would use to hop between services.**

### 🏷️ Key MITRE Techniques Used in NET_SCAN:
| MITRE ID | Technique Name | Attack Edge Example | How Attacker Uses It |
|---|---|---|---|
| **T1210** | Exploitation of Remote Services | `HTTP (80) ➔ SMB (445)` | Attacker exploits an unpatched remote service to move laterally. |
| **T1048** | Exfiltration Over Alt Protocol | `FTP (21) ➔ DNS (53)` | Attacker steals sensitive data and covertly exfiltrates it via DNS queries. |
| **T1505.003** | Server Software Component: Web Shell | `HTTP (80) ➔ SSH (22)` | Attacker uploads a web shell on port 80 to gain local shell access on port 22. |
| **T1021.004** | Remote Services: SSH | `FTP (21) ➔ SSH (22)` | Attacker reuses credentials found in unencrypted FTP to log into SSH. |
| **T1572** | Protocol Tunneling | `SSH (22) ➔ Database (3306)` | Attacker creates an encrypted SSH tunnel to access internal databases. |

### 💬 How to Say It in the Interview (15 Seconds):
> *"Instead of just showing random lines between ports, NET_SCAN grounds every attack path in the industry-standard MITRE ATT&CK framework. For example, a link from HTTP to SMB is mapped to **T1210 (Exploitation of Remote Services)**, and an exfiltration path to DNS is mapped to **T1048**. This transforms abstract network connections into actionable, realistic threat intelligence."*

---

## 🔧 WHAT-IF MITIGATION ENGINE — How to Explain It

*Interviewer puchhe "What is unique about your project?" ya "How does your tool help defenders?" — toh ye bol:*

### 💬 How to Say It in Interview:

"So once the scan is complete and the attack graph is built, the defender sees all the open ports, attack paths, and the NES score. Now the question is — if I can only fix one thing right now, which port should I close first?

That's where our What-If Engine comes in. You click on any port in the graph, simulate closing it, and the engine instantly removes that node and all its edges, recalculates the NES, and shows you exactly how many points the risk score dropped.

For example, in our testing on Network C — which had SMB on port 445, NetBIOS on 139, and RPC on 135 — the What-If Engine showed that closing SMB drops the NES by 20 points, but closing RPC only drops it by 10 points. So the defender now knows — fix SMB first, it has double the impact."

### 🎨 Visual Graph Example (Interviewer ko Graph visualize karwane ke liye):

> *"Imagine kijiye screen par 3 nodes ka ek attack graph hai:"*
>
> `[Port 80: Web/HTTP] (Entry) ───(Attack Path 1)───▶ [Port 22: SSH] (Pivot) ───(Attack Path 2)───▶ [Port 3306: Database] (Target)`
>
> 1. **Initial State:** Attacker Port 80 se enter karta hai, SSH (Port 22) par pivot karta hai, aur Database (Port 3306) tak pahunch kar data chura leta hai. **Current NES = 65 (High Risk).**
> 2. **What-If Simulation:** Defender graph par **Port 22 (SSH)** par click karke use simulate-close karta hai.
> 3. **Graph par kya hua:** Port 22 ka node gayab ho gaya. Usse jude **dono attack paths (Path 1 aur Path 2) turant break ho gaye**.
> 4. **Outcome:** Ab attacker Port 80 par fas gaya — Database tak pahunchne ka rasta (bridge) khatam ho gaya!
> 5. **NES Score:** 65 se gir kar seedha **25 (Low Risk)** ho gaya.
>
> 👉 *"This proves that by closing just one middle bridge (Pivot), we severed the entire kill chain without touching the database!"*

### 🔢 Real What-If Results From Our Testing:

| Network | Port Removed | Service | NES Drop | Remaining NES |
|---|---|---|---|---|
| **Network C** | 445 | SMB | **−20 points** | 30 |
| **Network C** | 135 | RPC | −10 points | 40 |
| **Network F** | 53 | DNS | −5 points (removes 4 lateral paths) | 95 |
| **Network F** | 80 | HTTP (nginx) | −5 points (removes 3 paths) | 90 |
| **Network B** | 21 | FTP | **−20 points (NES drops to 0)** | 0 |

### 💬 If Asked "How does it work technically?":

### ⚙️ Exact Step-by-Step Working (Under the Hood):

1. **User Action / API Trigger:** User UI pe kisi port (e.g., Port 445) ko toggle karta hai ya `/api/what-if` POST request trigger hoti hai.
2. **Graph Pruning (`what_if_remove_port` in `graph_gen.py`):**
   * Selected node (`port_445`) ko graph se temporarily remove kiya jata hai.
   * **Cascading Edge Removal:** Us port se jude saare **incoming aur outgoing attack edges (lateral paths)** instantly delete ho jate hain (`e['from'] != remove_id and e['to'] != remove_id`).
3. **Graph Stats Recalculation:** Reduced graph ke naye statistics bante hain:
   * Remaining Critical Services count
   * Remaining High-Risk Services count
   * Remaining Lateral Movement Paths count
4. **NES Recalculation:** Naye graph pe `calculate_network_exposure()` dubara chalti hai:
   $$\text{New NES} = (\text{New Critical} \times 20) + (\text{New High} \times 10) + (\text{New Lateral Paths} \times 5)$$
5. **Delta & Impact Score:**
   $$\Delta \text{ Reduction} = \text{Original NES} - \text{New NES}$$
   $$\text{Eliminated Paths} = \text{Original Edges} - \text{New Edges}$$
6. **Auto Recommendation (`_auto_what_if`):** Engine automatically har ek open port ko internally simulate karke rank karta hai (`Impact = Paths Eliminated × 2 + NES Reduction`) aur top-3 highest impact ports suggest karta hai.

---


> Tools like Nmap and Nessus give you a flat list of open ports and CVEs — but they never show **how an attacker chains them together** to move through your network. That's lateral movement, and it's invisible.
>
> **NET_SCAN** solves this. It scans ports, grabs banners, fetches live CVEs from NVD, classifies every service into **Entry, Pivot, or Target** using the Cyber Kill Chain, maps them to MITRE ATT&CK techniques, and runs **BFS for shortest paths and Dijkstra for deadliest paths**. It calculates a **Network Exposure Score (0–100)** and streams a live attack graph to the browser.
>
> A **What-If Engine** lets you simulate closing any port and instantly see the risk drop — telling you exactly **what to fix first**.
>
> Tested on **8 networks, zero false positives**. Key finding: attack path count matters more than raw CVE count.

---

## 🎯 STANDARD 4-POINT STRUCTURE

> **How to use:** Pick the version for your role (Mridul / Akshat / Shiva) and deliver the 4 points in order. Each point is one sentence — **Action Verb + What + How**. Total delivery time: ~90 seconds.

---

## 🎯 MASTER VERSION (Generic — Any Team Member Can Use)

### Point 1: Problem & Architecture
> **Built** a full-stack network intelligence platform using **React 18, Flask, Python sockets, and Server-Sent Events (SSE)** to scan live network hosts, model lateral movement attack paths using the Cyber Kill Chain, and visualize real-time force-directed attack graphs in the browser.

### Point 2: Core Engineering / Complex Logic
> **Engineered** a dual-algorithm Critical Paths Engine — running **BFS for shortest attack paths** and a **modified Dijkstra (max-heap via negation) for deadliest paths** — on top of a multi-threaded producer-consumer TCP scanner with isolated `ScanContext` state per scan, reducing scan latency across 1024 ports with N concurrent worker threads.

### Point 3: Integration / Infrastructure / Security
> **Integrated** NVD API v2.0 for real-time CVE enrichment with a custom rate limiter (5 req/30s) and in-memory thread-safe cache, mapped every attack edge to **MITRE ATT&CK techniques** (T1048, T1210, T1021, T1505), and streamed the full intelligence pipeline live via SSE with `scan_lock` mutex ensuring single-scan concurrency safety.

### Point 4: Measurable Result & Impact
> **Validated** across 8 heterogeneous networks (including Google DNS 8.8.8.8 and OpenDNS) with **zero false positives**, proved that Dijkstra discovered 2-hop attack paths with **risk score 19.7 vs BFS's 8.9** (demonstrating hop-count alone is insufficient), and achieved a **Network Exposure Score (NES)** range from 0 to 100 with correct tier classification across all test environments.

---

## 👤 MRIDUL SINGH RAWAT — Personalized Version

### Point 1: Problem & Architecture
> **Designed and built** a real-time network intelligence and lateral movement modeling platform using **React 18 (custom Canvas physics engine), Flask REST API, Python multi-threading, and SSE streaming** — transforming raw port scan data into interactive Cyber Kill Chain attack graphs with a single-number Network Exposure Score (NES 0–100).

### Point 2: Core Engineering / Complex Logic
> **Implemented** the `graph_gen.py` intelligence engine from scratch — a **dual-algorithm Critical Paths Engine** running BFS (via `deque`) for shortest paths and modified Dijkstra (via `heapq` negation for max-risk) for deadliest paths, plus a custom **force-directed graph renderer** on HTML5 Canvas with Coulomb repulsion, Hooke attraction, gravity, and 0.9 damping coefficient that auto-settles when node velocity drops below 0.5px/frame.

### Point 3: Integration / Infrastructure / Security
> **Architected** the end-to-end SSE pipeline — Flask `stream_with_context` pushing JSON events from a per-target `Queue` to React's `EventSource` API — and built the **What-If Mitigation Engine** that lets defenders simulate port decommissioning and instantly see the recalculated NES delta, with `scan_lock` and `ScanContext` isolation preventing race conditions across concurrent scans.

### Point 4: Measurable Result & Impact
> **Achieved** zero false positives across 8 network environments, proved the key insight that **lateral path count impacts NES more than raw CVE count** (Networks C & G: same CVEs → NES 50, Network H: 2 lateral paths → NES 60), and the What-If Engine quantified that closing SMB (port 445) drops NES by **20 points** vs RPC's 10 — giving defenders an actionable fix-first priority.

---

## 👤 AKSHAT JOSHI — Personalized Version

### Point 1: Problem & Architecture
> **Built** the threat intelligence and classification layer of a real-time network security platform using **Python, Flask, and NVD API v2.0** — automating Cyber Kill Chain role assignment (Entry, Pivot, Target) and MITRE ATT&CK technique mapping for every discovered service on a target network.

### Point 2: Core Engineering / Complex Logic
> **Developed** the `analyzer.py` kill chain engine — a **heuristic classification system** that categorizes open ports into Entry (80, 443, 21, RDP, VNC), Pivot (SSH, SMB, RPC), and Target (DNS, databases) roles, then builds **valid attack flow edges** (Entry→Pivot, Pivot→Target, Pivot→Pivot) enriched with MITRE technique IDs (T1048, T1210, T1572, T1021, T1505.003), descriptive attack narratives, difficulty scores (1–7), and attack categories (credential_reuse, exploitation, tunneling, exfiltration).

### Point 3: Integration / Infrastructure / Security
> **Integrated** real-time CVE enrichment via the **NVD REST API v2.0** with a custom rate limiter tracking request timestamps (max 5 requests per 30-second window), cascading CVSS fallback (v3.1 → v3.0 → v2.0), smart keyword mapping (e.g., "SSH" → "OpenSSH"), and an in-memory thread-safe cache to deduplicate lookups across identical service banners.

### Point 4: Measurable Result & Impact
> **Mapped** 5+ distinct MITRE ATT&CK techniques across test networks, correctly identified **3 full kill chain paths** (Entry→Pivot→Target) on OpenDNS (208.67.222.222), and enriched services with live CVE data while maintaining NVD compliance with **zero rate-limit violations** across all 8 validation scans.

---

## 👤 SHIVA JAKHAD — Personalized Version

### Point 1: Problem & Architecture
> **Built** the multi-threaded TCP scanning engine and real-time event streaming system for a network intelligence platform using **Python sockets, threading, Queue-based producer-consumer pattern, and Flask SSE** — enabling live port discovery and banner grabbing streamed directly to the browser as ports are found.

### Point 2: Core Engineering / Complex Logic
> **Engineered** the `engine.py` multi-threaded scanner with **`ScanContext` state isolation** per scan — a `Queue`-based producer-consumer model where the main thread fills the queue with 1024 ports, adds `None` sentinels (one per worker), and N daemon threads consume ports calling `socket.connect_ex()` (returns 0 instead of raising exceptions, avoiding per-port exception overhead) with a multi-stage banner grabbing pipeline: `recv()` → probe send (`"Hello\r\n"`) → port-to-service fallback mapping.

### Point 3: Integration / Infrastructure / Security
> **Implemented** the `streamer.py` SSE module with a **per-target `Queue` dictionary** for event isolation, `push_event()` for real-time port discovery notifications, and `None` sentinel-based stream termination — plus a `cancel_active_scan()` mechanism that drains the queue, poisons it with sentinels, and sets the cancellation flag to cleanly shut down all worker threads within 3 seconds with zero resource leaks.

### Point 4: Measurable Result & Impact
> **Scanned** 1024 ports per target across 8 networks with **zero zombie threads and zero resource leaks**, correctly identified open services on hosts ranging from 0 ports (clean baselines) to 7+ ports (complex public hosts), and achieved **real-time SSE delivery** of port discoveries — users see results port-by-port as they're found, not after the entire scan completes.

---

## 🔥 QUICK-FIRE CHEAT SHEET (Memorize These Numbers)

| Metric | Value | Where to Use |
|---|---|---|
| Networks tested | **8** | Point 4 |
| False positives | **Zero** | Point 4 |
| Port range scanned | **1–1024** | Point 2 |
| BFS risk score (Network E) | **8.9** (1-hop) | Point 2 / Point 4 |
| Dijkstra risk score (Network E) | **19.7** (2-hop via SSH) | Point 2 / Point 4 |
| NES range | **0–100** (4 tiers) | Point 1 |
| What-If SMB removal | **−20 NES points** | Point 3 / Point 4 |
| What-If RPC removal | **−10 NES points** | Point 3 / Point 4 |
| NVD rate limit | **5 req/30s** | Point 3 |
| Physics damping | **0.9 coefficient** | Point 2 (Mridul) |
| Auto-settle threshold | **0.5 px/frame** | Point 2 (Mridul) |
| Google DNS NES | **60 (High)** | Point 4 |
| OpenDNS NES | **85 (Critical)** | Point 4 |
| MITRE techniques used | **T1048, T1210, T1021, T1505, T1572** | Point 3 |

---

## 📝 HOW TO DELIVER

1. **Start with Point 1** — sets the stage (30 seconds)
2. **Point 2** — shows depth, this is where you impress (30 seconds)
3. **Point 3** — shows system thinking and security awareness (20 seconds)
4. **Point 4** — close with impact, always end on numbers (15 seconds)

> **Pro tip:** If the interviewer asks "Tell me about your project," deliver all 4 points. If they ask "What was the most complex part?", jump straight to Point 2. If they ask "What did you achieve?", go to Point 4 with context from Point 1.

---

## 🆚 COMPARISON FORMAT (If Asked "How is yours different?")

| Feature | Nmap | Nessus | BloodHound | **NET_SCAN** |
|---|---|---|---|---|
| Port scanning | ✅ | ✅ | ❌ | ✅ |
| CVE enrichment | ❌ | ✅ | ❌ | ✅ (live NVD API) |
| Kill chain modeling | ❌ | ❌ | ✅ (AD only) | ✅ (general TCP/IP) |
| Attack graph | ❌ | ❌ | ✅ | ✅ (force-directed) |
| Dual pathfinding | ❌ | ❌ | ❌ | ✅ (BFS + Dijkstra) |
| Exposure score | ❌ | CVSS only | ❌ | ✅ (NES 0–100) |
| What-If simulation | ❌ | ❌ | ❌ | ✅ |
| Real-time streaming | ❌ | ❌ | ❌ | ✅ (SSE) |

---

> **Remember:** Each point should feel like you're telling a story — *what you did*, *how you did it*, and *why it matters*. Numbers make you credible. Action verbs make you sound like a builder. 🚀
