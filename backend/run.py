"""
Entry point for the NET_SCAN Flask backend.
Run this file to start the server: python run.py
"""
import sys
import os

# Ensure the app package is on the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.main import app

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
