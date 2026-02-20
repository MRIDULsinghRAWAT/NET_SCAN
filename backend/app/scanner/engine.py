import socket
import threading
import argparse # for command-line argument parsing, can be used to specify target IP and port range    
# this (library) is useful for CMD -> creates a bridge btw user and code
# for dynamic arguments 
import json  # for savin results in a file 
import os # for making folder to save results 
from queue import Queue

# Configuration (Ab ye defaults ki tarah kaam karenge agar user parameters nahi deta)  
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

def port_scan(target_ip, port): # target_ip ab parameter hai taaki ye dynamic rahe---
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5) # Banner grab ke liye thoda zyada time   # this is defining parameter for socket connection, if the service is slow to respond, it will wait for 1.5 seconds before giving up
        result = sock.connect_ex((target_ip, port))
        
        if result == 0:  # if result is 0, port is open
            version = get_banner(sock)
            print(f"[+] Port {port} is OPEN | Service: {version}")
            scan_results[port] = version
        sock.close()  # otherwise the port is closed, we just ignore it
    except Exception:
        pass

# executioner
def worker(target_ip): # worker ab target_ip leta hai
    while not queue.empty():
        port = queue.get()
        port_scan(target_ip, port)
        queue.task_done()
        
def save_results(target_ip):
    """
    Scan results ko JSON format mein save karta hai taaki Akshat use kar sake.
    """
    # Agar 'data' folder nahi hai toh bana do
    if not os.path.exists('data'):
        os.makedirs('data')
        
    output_data = {
        "target": target_ip,
        "discovered_services": scan_results
    }
    
    file_path = "data/scan_output.json"
    with open(file_path, "w") as f:
        json.dump(output_data, f, indent=4) # Indent 4 se file readable banti hai
    
    print(f"\n[!] Results saved to {file_path}")

def run_scanner(target_ip, start_p, end_p, thread_count):  # manager function to start the scanning process
    print(f"Starting scan on {target_ip}...")
    for port in range(start_p, end_p + 1): # User defined range
        queue.put(port)

    for _ in range(thread_count): # User defined threads
        t = threading.Thread(target=worker, args=(target_ip,))
        t.start()

    queue.join()
    save_results(target_ip) # scan complete hone ke baad results save karna
    print(f"Scan complete. Final Results: {scan_results}")

if __name__ == "__main__":  # entry point
    # Mentor's requirement: Command-line arguments handle karne ke liye parser
    parser = argparse.ArgumentParser(description="NetScan Proactive Scanner")
    
    # Adding parameters so others can use it easily
    parser.add_argument("-t", "--target", help="Target IP Address", required=True)
    parser.add_argument("-s", "--start", help="Start Port", type=int, default=1)
    parser.add_argument("-e", "--end", help="End Port", type=int, default=1024)
    parser.add_argument("-th", "--threads", help="Threads count", type=int, default=100) # default 100 threads, can be changed by the user depending on the need !

    args = parser.parse_args()
    # run_scanner ko ab terminal se aaye hue arguments ke saath call kiya
    run_scanner(args.target, args.start, args.end, args.threads)
    
    #The 4 Core Parameters of NetScan :
#Target IP (-t / --target): This is the mandatory input where the user defines which machine on the network is being audited (a comprehensive inspection of a network's assets and services to identify security weaknesses and ensure everything is running safely).
# It ensures the tool doesn't scan aimlessly.

#Start Port (-s / --start): This defines the entry point of the scan. It defaults to port 1 if the user doesn't specify otherwise.

#End Port (-e / --end): This sets the boundary or limit of the scan. It defaults to 1024, which covers most standard system service#s.

#Threads Count (-th / --threads): This manages the speed and concurrency. It defaults to 100, meaning 100 ports are checked simultaneously 


