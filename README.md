NET SCAN : Graph Intelligent Attack Path Analyzer  


Network Service Discovery and Security Assessment Tool


## Project Structure 
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

