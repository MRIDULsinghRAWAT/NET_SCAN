# NET_SCAN API Documentation

Base URL: `http://localhost:5000`

---

## Endpoints

### 1. **Start Scan / Get Results**
**Endpoint:** `/api/start-scan`

#### GET Request
Retrieve the last saved scan results for a target.

**Query Parameters:**
- `target` (optional): IP address or network (e.g., `1.2.3.4` or `192.168.1.0/24`)

**Response:**
```json
{
  "target": "127.0.0.1",
  "discovered_services": {
    "22": "ssh",
    "80": "http",
    "443": "https"
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - File not found
- `500` - Server error

---

#### POST Request
Start a new network scan.

**Request Body:**
```json
{
  "target": "192.168.1.0/24",
  "start": 1,
  "end": 65535,
  "threads": 100
}
```

**Parameters:**
- `target` (required): IP address or CIDR range
- `start` (optional): Start port (default: 1)
- `end` (optional): End port (default: 1024)
- `threads` (optional): Number of scanning threads (default: 100)

**Response:**
```json
{
  "status": "started",
  "target": "192.168.1.0/24"
}
```

**Status Codes:**
- `202` - Scan accepted and started
- `400` - Missing required parameters
- `500` - Server error

**Note:** Scan runs in background. Use `/api/scan-status` to check progress or `/api/scan-stream` for real-time updates.

---

### 2. **Scan Status**
**Endpoint:** `/api/scan-status`  
**Method:** `GET`

Check if a scan is currently running and get metadata.

**Response:**
```json
{
  "running": true,
  "target": "192.168.1.0/24",
  "started_at": 1712345678.123
}
```

**Status Codes:**
- `200` - Success

---

### 3. **Scan Stream (Server-Sent Events)**
**Endpoint:** `/api/scan-stream`  
**Method:** `GET`

Real-time streaming of scan results, analysis, and attack graph generation.

**Query Parameters:**
- `target` (required): IP address of the scan target

**Response Format:** Server-Sent Events (SSE)

**Event Types:**

#### Analysis Event
```json
{
  "type": "analysis",
  "target": "127.0.0.1",
  "analysis": {
    "vulnerable_ports": {
      "critical": 2,
      "high": 5,
      "medium": 8
    },
    "services": { ... }
  },
  "timestamp": 1712345678.123
}
```

#### Graph Event
```json
{
  "type": "graph",
  "target": "127.0.0.1",
  "graph": {
    "nodes": [...],
    "edges": [...],
    "statistics": {
      "total_nodes": 15,
      "total_edges": 24
    }
  },
  "exposure_score": {
    "exposure_score": 72.5,
    "severity": "HIGH"
  },
  "attack_chains": {
    "total_chains": 3,
    "chains": [...]
  },
  "cve_data": {
    "total_cves": 12,
    "critical_cves": 2,
    "high_cves": 5,
    "services": { ... },
    "all_cves": [...]
  },
  "timestamp": 1712345678.123
}
```

#### Complete Event
```json
{
  "type": "complete",
  "target": "127.0.0.1",
  "discovered_services": { ... },
  "timestamp": 1712345678.123
}
```

**Status Codes:**
- `200` - Stream opened
- `400` - Missing target parameter

---

### 4. **What-If Analysis**
**Endpoint:** `/api/what-if`  
**Method:** `POST`

Simulate the impact of removing a specific port/service from the attack surface.

**Request Body:**
```json
{
  "port": "445",
  "graph_data": {
    "nodes": [...],
    "edges": [...],
    "statistics": {...}
  }
}
```

**Parameters:**
- `port` (required): Port number to simulate removing
- `graph_data` (required): Current graph data from scan results

**Response:**
```json
{
  "original_exposure": 72.5,
  "new_exposure": 45.3,
  "impact": "HIGH",
  "removed_paths": 8,
  "affected_nodes": 4
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing parameters
- `500` - Processing error

---

### 5. **Download Report**
**Endpoint:** `/api/download-report`  
**Method:** `GET`

Generate and download a professional PDF report.

**Response:**
- Binary PDF file

**Status Codes:**
- `200` - PDF generated and ready for download
- `404` - No scan data available
- `500` - Report generation failed

---

## Usage Examples

### JavaScript (Frontend Example)

#### Start a scan:
```javascript
const response = await fetch('http://localhost:5000/api/start-scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    target: '192.168.1.0/24',
    start: 1,
    end: 1024,
    threads: 100
  })
});
const data = await response.json();
console.log(data); // { status: "started", target: "192.168.1.0/24" }
```

#### Stream results:
```javascript
const eventSource = new EventSource('http://localhost:5000/api/scan-stream?target=192.168.1.1');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type); // "analysis", "graph", or "complete"
  if (data.type === 'graph') {
    // Render attack graph on canvas
    renderGraph(data.graph);
  }
};
eventSource.onerror = () => eventSource.close();
```

#### Check scan status:
```javascript
const status = await fetch('http://localhost:5000/api/scan-status').then(r => r.json());
console.log(status.running); // true/false
```

#### Simulate port removal:
```javascript
const result = await fetch('http://localhost:5000/api/what-if', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    port: '445',
    graph_data: currentGraphData
  })
}).then(r => r.json());
console.log(`New exposure after removing port 445: ${result.new_exposure}`);
```

#### Download report:
```javascript
const link = document.createElement('a');
link.href = 'http://localhost:5000/api/download-report';
link.download = 'network_report.pdf';
link.click();
```

---

## Error Handling

All errors follow this format:
```json
{
  "status": "error",
  "message": "Descriptive error message"
}
```

Common errors:
- `400` - Bad request (missing/invalid parameters)
- `404` - Resource not found
- `500` - Internal server error

---

## CORS Configuration

The API supports CORS. Requests from any origin are allowed (`flask-cors` enabled).

---

## Threading Model

- Scans run in background threads
- Multiple concurrent requests are supported
- Only one active scan per unique target is allowed
- Previous scans are automatically cancelled when a new scan starts
