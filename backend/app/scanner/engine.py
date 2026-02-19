import socket
import threading
import argparse # for command-line argument parsing, can be used to specify target IP and port range
from queue import Queue

# Configuration
# defining the target IP and port range for scanning
TARGET_IP = "192.168.1.1"  # machine by which we are scanning, can be changed to any IP
PORT_RANGE = range(1, 1025)
THREADS = 100  # can check 1000 ports with 100 threads

queue = Queue()
# Hum list ki jagah Dictionary use karenge taaki metadata (Version) store ho sake
scan_results = {} 

def get_banner(sock):   #THIS IS THE UNIQUE FEATURE
    """
    Attempts to grab the service version banner from an open port.
    """
    try:
        # Kuch services ko trigger karne ke liye empty string bhejna padta hai
        sock.send(b'Hello\r\n') # sends a  knock to the service, sometimes required to get a response
        banner = sock.recv(1024).decode(errors='ignore').strip() # BANNER GRABBING - service badle me apna naam aur version battai hai 
        return banner
    except:
        return "Unknown Service"

def port_scan(port):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5) # Banner grab ke liye thoda zyada time
        result = sock.connect_ex((TARGET_IP, port))
        
        if result == 0:  # if result is 0, port is open
            version = get_banner(sock)
            print(f"[+] Port {port} is OPEN | Service: {version}")
            scan_results[port] = version
        sock.close()  # otherwise the port is closed, we just ignore it
    except Exception:
        pass

# ... (worker aur run_scanner functions same rahenge) ...

# executioner
def worker():
    while not queue.empty():
        port = queue.get()
        port_scan(port)
        queue.task_done()

def run_scanner():  # manager function to start the scanning process
    print(f"Starting scan on {TARGET_IP}...")
    for port in PORT_RANGE:
        queue.put(port)

    for _ in range(THREADS):
        t = threading.Thread(target=worker)
        t.start()

    queue.join()
    print(f"Scan complete. Final Results: {scan_results}")

if __name__ == "__main__":  # entry point
    run_scanner()