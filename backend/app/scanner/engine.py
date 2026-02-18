import socket
import threading
from queue import Queue

# Configuration
TARGET_IP = "192.168.1.1" 
PORT_RANGE = range(1, 1025) 
THREADS = 100 

queue = Queue()
# Hum list ki jagah Dictionary use karenge taaki metadata (Version) store ho sake
scan_results = {} 

def get_banner(sock):
    """
    Attempts to grab the service version banner from an open port.
    """
    try:
        # Kuch services ko trigger karne ke liye empty string bhejna padta hai
        sock.send(b'Hello\r\n')
        banner = sock.recv(1024).decode().strip()
        return banner
    except:
        return "Unknown Service"

def port_scan(port):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5) # Banner grab ke liye thoda zyada time
        result = sock.connect_ex((TARGET_IP, port))
        
        if result == 0:
            version = get_banner(sock)
            print(f"[+] Port {port} is OPEN | Service: {version}")
            scan_results[port] = version
        sock.close()
    except Exception:
        pass

# ... (worker aur run_scanner functions same rahenge) ...