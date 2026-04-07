# Swagger/Flasgger API Documentation Setup

## Installation

1. **Install Flasgger** (already added to requirements.txt):
```bash
cd backend
pip install -r requirements.txt
```

2. **Run Backend**:
```bash
python app/main.py
```

## Access Interactive API Docs

Open your browser and go to:

- **Swagger UI**: `http://localhost:5000/apidocs`
- **Redoc UI**: `http://localhost:5000/redoc`

## Features

 **Interactive Endpoints** - Click to try each API  
 **Auto-generated Documentation** - From Python docstrings  
 **Request/Response Examples** - Built-in schema validation  
 **Test Directly** - No separate tool needed  

## What You Can Do

### In the Swagger UI, you can:

1. **Expand any endpoint** - See method, parameters, responses
2. **Try it out** - Click "Try it out" button
3. **Enter parameters** - Fill in query params or JSON body
4. **Execute** - Click "Execute" to test the API
5. **See results** - Response code, body, headers displayed

## Example: Test Start Scan

1. Go to `http://localhost:5000/apidocs`
2. Find `/api/start-scan` (POST)
3. Click "Try it out"
4. Enter JSON:
```json
{
  "target": "192.168.1.1",
  "start": 1,
  "end": 1024,
  "threads": 100
}
```
5. Click "Execute"
6. See response code 202 and scan started

---

**That's it!** 🎉 No more just reading docs - now test live!
