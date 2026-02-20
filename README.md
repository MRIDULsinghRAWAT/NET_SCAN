NET SCAN : Graph Intelligent Attack Path Analyzer  


Network Service Discovery and Security Assessment Tool


## Project Structure

```text
NET_SCAN/
├── backend/
│   ├── app/
│   │   ├── mapping/         # Graph generation and vulnerability logic
│   │   │   ├── database/    # MongoDB connections
│   │   │   ├── graph_gen.py # Pathfinding and Graph logic
│   │   │   └── vuln_api.py  # API for vulnerability mapping
│   │   └── scanner/         # Core Engine (Mridul's Module)
│   │       ├── banner.py    # Service version discovery
│   │       └── engine.py    # Multi-threaded scanner with Queue
│   ├── data/                # Scanned results (JSON files)
│   └── main.py              # FastAPI Entry Point
├── frontend/
│   ├── src/
│   │   ├── components/      # React Components (GraphView, Sidebar)
│   │   └── services/        # API communication
│   └── package.json         # Frontend dependencies
├── requirements.txt         # Backend dependencies
└── README.md                # Project documentation
```

## How to Run (CLI)
This section explains how to execute the scanning engine directly from your terminal.

### 1. Open Terminal/CMD
Open your Command Prompt (Windows) or Terminal (Mac/Linux).

### 2. Navigate to the Project Root
Use the `cd` command to enter your project directory:

cd Desktop/NET_SCAN

### 3. Move to the Scanner Directory
Since the `engine.py` file is located within the scanner sub-folder, navigate there:

cd backend/app/scanner

### 4. Execute the Scanner
Run the engine using Python. A **Target IP** is mandatory.

**Basic Scan (Default Settings):**

python engine.py -t 127.0.0.1

**Advanced Scan (Custom Range & Threads):**

python engine.py -t 127.0.0.1 -s 1 -e 1000 -th 150

### 🛠 CLI Arguments Breakdown

| Parameter | Full Name | Description |
| :--- | :--- | :--- |
| `-t` | `--target` | **(Required)** The IP address of the machine you want to audit. |
| `-s` | `--start` | Starting port number for the scan (Default: 1). |
| `-e` | `--end` | Ending port boundary for the scan (Default: 1024). |
| `-th` | `--threads` | Number of simultaneous threads for speed (Default: 100). |

###  Output Location
After the scan, the engine automatically persists the results in:
`NET_SCAN/data/scan_output.json`

```