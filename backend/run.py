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
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug, port=port, host='0.0.0.0')
