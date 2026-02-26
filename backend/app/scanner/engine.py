import socket
import threading
import argparse  # for command-line argument parsing
import json  # for saving results in a file
import os  # for making folder to save results
from queue import Queue, Empty

# Configuration defaults
TARGET_IP = "192.168.1.1"
PORT_RANGE = range(1, 1025)
THREADS = 100

# Vulnerability database: maps ports to common vulnerabilities
VULNERABILITY_DB = {
    20: {'service': 'FTP-DATA', 'vulnerabilities': ['Unencrypted data transfer', 'Port predictable']},
    21: {'service': 'FTP', 'vulnerabilities': ['Unencrypted credentials', 'Bruteforce vulnerable']},
    22: {'service': 'SSH', 'vulnerabilities': []},
    23: {'service': 'TELNET', 'vulnerabilities': ['No encryption', 'Credentials in plaintext']},
    25: {'service': 'SMTP', 'vulnerabilities': ['Open relay potential', 'Banner grabbing']},
    53: {'service': 'DNS', 'vulnerabilities': ['Zone transfer possible', 'DDoS amplification']},
    80: {'service': 'HTTP', 'vulnerabilities': ['Unencrypted traffic', 'No HTTPS']},
    110: {'service': 'POP3', 'vulnerabilities': ['Unencrypted credentials', 'Plaintext passwords']},
    139: {'service': 'NetBIOS-SSN', 'vulnerabilities': ['SMB exploitation', 'Ransomware vector']},
    143: {'service': 'IMAP', 'vulnerabilities': ['Unencrypted credentials', 'Plaintext passwords']},
    443: {'service': 'HTTPS', 'vulnerabilities': []},
    445: {'service': 'SMB', 'vulnerabilities': ['Ransomware vector', 'Worm propagation', 'File sharing']},
    1433: {'service': 'MSSQL', 'vulnerabilities': ['SQL injection', 'Weak authentication']},
    3306: {'service': 'MySQL', 'vulnerabilities': ['SQL injection', 'Default credentials']},
    3389: {'service': 'RDP', 'vulnerabilities': ['Brute force attacks', 'CVE-2019-0708']},
    5000: {'service': 'Flask/HTTP', 'vulnerabilities': ['Debug mode exposure', 'Unencrypted traffic']},
    5432: {'service': 'PostgreSQL', 'vulnerabilities': ['SQL injection', 'Default credentials']},
    5900: {'service': 'VNC', 'vulnerabilities': ['Weak encryption', 'Brute force']},
    5901: {'service': 'VNC', 'vulnerabilities': ['Weak encryption', 'Brute force']},
    3000: {'service': 'Node.js/HTTP', 'vulnerabilities': ['Debug info exposure', 'Unencrypted traffic']},
    8080: {'service': 'HTTP-Proxy', 'vulnerabilities': ['Open proxy', 'Unencrypted traffic']},
    8443: {'service': 'HTTPS-Alt', 'vulnerabilities': []},
}

# Try to import streamer for live events (optional)
streamer = None
try:
    from scanner import streamer as _streamer
    streamer = _streamer
except Exception:
    try:
        from . import streamer as _streamer
        streamer = _streamer
    except Exception:
        streamer = None


class ScanContext:
    """Encapsulates all state for a single scan run.
    
    This avoids issues with module-level globals being shared
    across sequential or concurrent scans.
    """
    def __init__(self, target_ip, start_port, end_port, thread_count):
        self.target_ip = target_ip
        self.start_port = start_port
        self.end_port = end_port
        self.thread_count = thread_count
        self.queue = Queue()
        self.scan_results = {}
        self.results_lock = threading.Lock()
        self.cancelled = False  # flag to stop workers early


# Reference to the currently active scan context (if any)
_active_scan_lock = threading.Lock()
_active_scan = None  # type: ScanContext | None


def cancel_active_scan():
    """Cancel any currently running scan so a new one can start cleanly."""
    global _active_scan
    with _active_scan_lock:
        if _active_scan is not None:
            _active_scan.cancelled = True
            # Drain and poison the queue so waiting workers unblock
            try:
                while not _active_scan.queue.empty():
                    try:
                        _active_scan.queue.get_nowait()
                        _active_scan.queue.task_done()
                    except Empty:
                        break
            except Exception:
                pass
            # Put enough sentinels to wake all possible workers
            for _ in range(max(1, _active_scan.thread_count + 5)):
                try:
                    _active_scan.queue.put(None)
                except Exception:
                    pass
            _active_scan = None


def get_banner(sock, port=None):
    """
    Attempts to grab the service version banner from an open port.
    Strategy:
      1. Try to recv() immediately (some services send a greeting)
      2. If nothing received, send a light probe and recv again
      3. If still nothing, fall back to a small port->service-name mapping
    """
    try:
        # try to read any immediate banner
        try:
            sock.settimeout(1.0)
            banner = sock.recv(1024).decode(errors='ignore').strip()
            if banner:
                return banner
        except socket.timeout:
            pass
        except Exception:
            pass

        # send a small probe and try to read
        try:
            sock.send(b'Hello\r\n')
        except Exception:
            pass

        try:
            sock.settimeout(1.0)
            banner = sock.recv(1024).decode(errors='ignore').strip()
            if banner:
                return banner
        except socket.timeout:
            pass
        except Exception:
            pass

        # Fallback: map common ports to service names so UI is more informative
        common = {
            21: 'FTP', 22: 'SSH', 23: 'TELNET', 25: 'SMTP', 53: 'DNS',
            80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 3306: 'MySQL',
            3389: 'RDP', 5900: 'VNC', 135: 'RPC', 139: 'NetBIOS-SSN', 445: 'SMB',
            1433: 'MSSQL', 5901: 'VNC', 8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt',
            5000: 'Flask/HTTP', 3000: 'Node/HTTP'
        }
        if port and port in common:
            return common[port]

        return "Unknown Service"
    except Exception:
        return "Unknown Service"


def port_scan(ctx, port):
    """Scan a single port on the target in the given ScanContext."""
    if ctx.cancelled:
        return
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        result = sock.connect_ex((ctx.target_ip, port))

        # Get vulnerability info for this port
        vuln_info = VULNERABILITY_DB.get(port, {'service': 'Unknown', 'vulnerabilities': []})
        service = vuln_info.get('service', 'Unknown')
        vulnerabilities = vuln_info.get('vulnerabilities', [])

        port_data = {
            'port': port,
            'status': 'unknown',
            'service': service,
            'vulnerabilities': vulnerabilities,
        }

        if result == 0:  # port is open
            version = get_banner(sock, port)
            port_data['status'] = 'open'
            port_data['service'] = version if version and version != "Unknown Service" else service
            print(f"[+] Port {port} is OPEN | Service: {port_data['service']}")

            with ctx.results_lock:
                ctx.scan_results[str(port)] = port_data

            # Push partial result to streamer if available
            try:
                if streamer:
                    streamer.push_event(ctx.target_ip, {
                        "type": "port",
                        "port": port,
                        "status": "open",
                        "service": port_data['service'],
                        "vulnerabilities": vulnerabilities
                    })
            except Exception:
                pass
        else:
            # Port is closed or filtered
            port_data['status'] = 'closed'
            with ctx.results_lock:
                ctx.scan_results[str(port)] = port_data

        sock.close()
    except socket.timeout:
        # Timeout often means filtered port
        vuln_info = VULNERABILITY_DB.get(port, {'service': 'Unknown', 'vulnerabilities': []})
        port_data = {
            'port': port,
            'status': 'filtered',
            'service': vuln_info.get('service', 'Unknown'),
            'vulnerabilities': vuln_info.get('vulnerabilities', []),
        }
        with ctx.results_lock:
            ctx.scan_results[str(port)] = port_data
    except Exception:
        # On any other error, mark as error state
        vuln_info = VULNERABILITY_DB.get(port, {'service': 'Unknown', 'vulnerabilities': []})
        port_data = {
            'port': port,
            'status': 'error',
            'service': vuln_info.get('service', 'Unknown'),
            'vulnerabilities': vuln_info.get('vulnerabilities', []),
        }
        with ctx.results_lock:
            ctx.scan_results[str(port)] = port_data


def worker(ctx):
    """Worker thread: pulls ports from the context queue until a sentinel (None) is received."""
    while not ctx.cancelled:
        try:
            port = ctx.queue.get(timeout=2)
        except Empty:
            # Queue might be empty (scan is finishing), check if there's still work
            if ctx.queue.empty():
                break
            continue

        if port is None:
            # Sentinel value — this worker should stop
            ctx.queue.task_done()
            break

        try:
            port_scan(ctx, port)
        except Exception:
            pass
        finally:
            ctx.queue.task_done()


def save_results(ctx):
    """
    Save scan results to JSON file with comprehensive port information.
    """
    # Ensure we write into the scanner/data folder relative to this file
    scanner_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(scanner_dir, 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    with ctx.results_lock:
        results_snapshot = dict(ctx.scan_results)

    # Categorize ports by status
    open_ports = {}
    closed_ports = {}
    filtered_ports = {}

    for port_str, port_info in results_snapshot.items():
        if isinstance(port_info, dict):
            status = port_info.get('status', 'unknown')
            if status == 'open':
                open_ports[port_str] = port_info
            elif status == 'closed':
                closed_ports[port_str] = port_info
            elif status == 'filtered':
                filtered_ports[port_str] = port_info

    output_data = {
        "target": ctx.target_ip,
        "scan_summary": {
            "total_ports_scanned": len(results_snapshot),
            "open_ports": len(open_ports),
            "closed_ports": len(closed_ports),
            "filtered_ports": len(filtered_ports),
        },
        "all_ports": results_snapshot,
        "open_ports": open_ports,
        "closed_ports": closed_ports,
        "filtered_ports": filtered_ports,
        "discovered_services": open_ports,  # For backward compatibility
    }

    # Write both a generic file and a per-target file so frontend
    # can request results for a specific target and avoid showing
    # stale data from previous scans on different targets.
    file_path = os.path.join(data_dir, "scan_output.json")
    with open(file_path, "w") as f:
        json.dump(output_data, f, indent=4)

    # Create a filesystem-safe filename for the specific target
    safe_target = ctx.target_ip.replace(':', '_').replace('/', '_').replace(' ', '_')
    per_target_path = os.path.join(data_dir, f"scan_output_{safe_target}.json")
    try:
        with open(per_target_path, "w") as f:
            json.dump(output_data, f, indent=4)
    except Exception:
        # Non-fatal; we already wrote the generic file
        pass

    # Push final/complete event and close stream if streamer available
    try:
        if streamer:
            streamer.push_event(ctx.target_ip, {
                "type": "complete",
                "target": ctx.target_ip,
                "scan_summary": output_data.get("scan_summary", {}),
                "open_ports": open_ports,
            })
            streamer.close_stream(ctx.target_ip)
    except Exception:
        pass

    print(f"\n[!] Results saved to {file_path}")
    print(f"[!] Summary: {output_data['scan_summary']}")


def run_scanner(target_ip, start_p, end_p, thread_count):
    """Manager function to start the scanning process."""
    global _active_scan

    # Cancel any previously running scan
    cancel_active_scan()

    # Create a fresh, isolated scan context
    ctx = ScanContext(target_ip, start_p, end_p, thread_count)

    with _active_scan_lock:
        _active_scan = ctx

    print(f"Starting scan on {target_ip} from port {start_p} to {end_p} using {thread_count} threads...")

    # Fill the queue with ports to scan
    for port in range(start_p, end_p + 1):
        ctx.queue.put(port)

    # Add sentinel values (None) for each worker so they know when to stop
    effective_threads = max(1, thread_count)
    for _ in range(effective_threads):
        ctx.queue.put(None)

    # Start worker threads
    threads = []
    for _ in range(effective_threads):
        t = threading.Thread(target=worker, args=(ctx,))
        t.daemon = True
        t.start()
        threads.append(t)

    # Wait for all work to complete
    ctx.queue.join()

    # Wait for threads to finish cleanup
    for t in threads:
        t.join(timeout=3)

    if not ctx.cancelled:
        save_results(ctx)
        with ctx.results_lock:
            print(f"Scan complete. Final Results: {ctx.scan_results}")
    else:
        print(f"Scan on {target_ip} was cancelled.")

    # Clear active scan reference
    with _active_scan_lock:
        if _active_scan is ctx:
            _active_scan = None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NetScan Proactive Scanner")

    parser.add_argument("-t", "--target", help="Target IP Address", required=True)
    parser.add_argument("-s", "--start", help="Start Port", type=int, default=1)
    parser.add_argument("-e", "--end", help="End Port", type=int, default=1024)
    parser.add_argument("-th", "--threads", help="Threads count", type=int, default=100)

    args = parser.parse_args()
    run_scanner(args.target, args.start, args.end, args.threads)
