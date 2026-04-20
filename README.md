# NET_SCAN: Automated Lateral Movement Detection & Cyber Kill Chain Modeling

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react)
![Flask](https://img.shields.io/badge/Flask-Backend-000000.svg?logo=flask)

**NET_SCAN** is a real-time network intelligence platform that systematically advances beyond traditional node-centric port scanning (like Nmap or Nessus) by automatically graphing distributed attack paths. It identifies how adversaries can chain vulnerabilities together across enterprise infrastructures utilizing **Cyber Kill Chain Modeling** and **MITRE ATT&CK Mapping**.

---

## Core Novelty
Network security evaluations often produce massive text outputs consisting of isolated vulnerabilities. NET_SCAN translates this data into interactive, force-directed graphs. It autonomously assigns services into kill-chain objectives (**Entry**, **Pivot**, and **Target** nodes), calculates viable lateral movement transversal paths, and generates a mathematically justified **Network Exposure Score (NES)** to measure overall topological risk.

## Key Features
- **Heuristic Kill Chain Classification:** Autonomously classes discovered network services based on typical adversarial exploitation behavior.
- **Automated Lateral Movement Maps:** Traces attack linkages such as `Entry → Pivot` or `Pivot → Target` utilizing standardized MITRE TTPs (e.g., T1021.004).
- **Network Exposure Score (NES):** Empirically measures architectural risk using independent weights matching CVSS v3.1 critical and high matrices, combined with lateral network compounding logic. Displayed via a dedicated donut gauge with severity classification (LOW / MED / HIGH / CRIT).
- **Real-Time Canvas Visualization:** Renders interactive, physics-based attack graphs streamed live via Server-Sent Events (SSE) directly to the browser with a glassmorphism-themed UI.
- **Attack Simulation Controls:** Step-through attack path replay with Start, Pause, Resume, Reset, and Step-Forward controls for detailed kill chain walkthrough.
- **NVD CVE Enrichment:** Real-time linkage of discovered banner heuristics against the National Vulnerability Database API to enrich nodes with historically verified CVEs.
- **"What-If" Analysis Engine:** Pre-calculate mitigation efficiency by temporarily scrubbing specific nodes from the attack scenario dynamically.
- **Scoring Criteria Panel:** Transparent breakdown of exposure score factors including CVE severity, lateral path count, blast radius coverage, and network topology depth.

## Project Structure

```text
NET_SCAN/
├── backend/
│   ├── app/
│   │   ├── main.py          # Core Flask API & SSE Streamer
│   │   ├── mapping/         # Kill Chain Analytics & Vulnerability Intelligence
│   │   │   ├── analyzer.py  # Pathfinding, MITRE mappings, Attack chains
│   │   │   ├── graph_gen.py # Force-directed simulation logic
│   │   │   └── cve_lookup.py# NVD integration wrapper
│   │   ├── reporting/       # Professional PDF Export Engine
│   │   └── scanner/         # Multi-threaded TCP Port Enumerable Engine
│   │       ├── engine.py    # Multi-threaded worker queues
│   │       └── banner.py    # Service heuristic inferences
├── frontend/
│   ├── src/
│   │   ├── components/      # React UI 
│   │   │   ├── Graphview.js        # HTML5 Canvas Graph 
│   │   │   └── ScannerDashboard.js # Primary Interaction Context
│   │   └── services/        # Subroutines & API configs
│   └── package.json         # Node Dependency manifest
└── README.md                # Project documentation
```

## Installation & Setup

NET_SCAN utilizes a decoupled architecture communicating via REST APIs and Server-Sent Events. You will need to spin up the Python backend and the Node/React frontend simultaneously.

### 1. Backend (Scanner & Intelligence Pipeline)
Open a terminal in the project root:
```bash
cd backend
python -m venv venv

# Activate Environment (Windows)
venv\Scripts\activate
# Activate Environment (Mac/Linux)
# source venv/bin/activate

pip install -r requirements.txt
```

### 2. Frontend (Dashboard UI)
Open a second, separate terminal in the project root:
```bash
cd frontend
npm install
```

## Usage

To launch the integrated platform:

1. **Start the Flask AP:**
   ```bash
   cd backend
   python run.py  # OR python app/main.py (Depending on your root level)
   ```
   *The backend will boot up at `http://127.0.0.1:5000`.*

2. **Start the React Visualizer:**
   ```bash
   cd frontend
   npm start
   ```
   *The interactive dashboard will spawn at `http://localhost:3000`.*

3. Enter your **Target IP Address**, define thread scopes, and click **LAUNCH SYSTEM SCAN**. Watch the intelligence pipeline reconstruct the kill chain topology natively in the UI.

---

## Validation Pipeline

NET_SCAN includes a headless validation script designed to execute the network scanning engine and analytical backends against predefined target lists, outputting the analytical results in consolidated logs without needing the UI.

To run the pipeline:

1. Open a terminal and navigate into the `backend` directory.
2. Execute the pipeline script:
   ```bash
   python ../validation/scripts/run_full_pipeline.py
   ```
   *(Ensure your Python virtual environment is activated if applicable).*

Your analytical outputs, raw scans, and execution logs will be saved in an incremental folder at `validation/results/run_X/netscan/`.

---
*For more extensive academic details regarding algorithmic mathematical bounds, latency benchmarks, or MITRE scoring logic, please refer to the attached primary IEEE research document.*