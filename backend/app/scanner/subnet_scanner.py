"""
Subnet Scanner Module
─────────────────────
Scans a subnet (e.g., 192.168.1.0/24) to discover live hosts,
then performs a quick port scan on each discovered host.
Results are structured for the Network Topology visualization.
"""
import socket
import threading
import ipaddress
import json
import os
import time
from queue import Queue, Empty

# Quick-scan these well-known ports on each discovered host
QUICK_SCAN_PORTS = [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445,
                    1433, 3000, 3306, 3389, 5000, 5432, 5900, 8080, 8443]

PORT_SERVICE_MAP = {
    21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
    80: 'HTTP', 110: 'POP3', 135: 'RPC', 139: 'NetBIOS', 143: 'IMAP',
    443: 'HTTPS', 445: 'SMB', 1433: 'MSSQL', 3000: 'Node.js',
    3306: 'MySQL', 3389: 'RDP', 5000: 'Flask', 5432: 'PostgreSQL',
    5900: 'VNC', 8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt'
}

PORT_ROLE_MAP = {
    21: 'entry', 23: 'entry', 80: 'entry', 443: 'entry',
    8080: 'entry', 8443: 'entry', 3389: 'entry', 5900: 'entry',
    3000: 'entry', 5000: 'entry',
    22: 'pivot', 25: 'pivot', 135: 'pivot', 139: 'pivot',
    445: 'pivot', 110: 'pivot', 143: 'pivot',
    53: 'target', 1433: 'target', 3306: 'target', 5432: 'target',
}

# Try to import streamer for live events
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


def is_host_alive(ip, timeout=1.0):
    """Check if a host is alive by trying to connect to common ports."""
    quick_ports = [80, 443, 22, 445, 135, 3389, 21, 8080]
    for port in quick_ports:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((str(ip), port))
            sock.close()
            if result == 0:
                return True
        except Exception:
            pass
    return False


def quick_port_scan(ip, timeout=1.0):
    """Quickly scan well-known ports on a single host."""
    open_ports = []
    for port in QUICK_SCAN_PORTS:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((str(ip), port))
            if result == 0:
                service = PORT_SERVICE_MAP.get(port, 'Unknown')
                role = PORT_ROLE_MAP.get(port, 'unknown')
                open_ports.append({
                    'port': port,
                    'service': service,
                    'role': role,
                    'status': 'open'
                })
            sock.close()
        except Exception:
            pass
    return open_ports


def _host_worker(ip_queue, results, results_lock, stream_key, cancelled):
    """Worker thread: discovers hosts and scans their ports."""
    while not cancelled.is_set():
        try:
            ip = ip_queue.get(timeout=2)
        except Empty:
            if ip_queue.empty():
                break
            continue

        if ip is None:
            ip_queue.task_done()
            break

        ip_str = str(ip)
        try:
            alive = is_host_alive(ip_str, timeout=0.8)
            if alive:
                open_ports = quick_port_scan(ip_str, timeout=0.8)

                # Try to resolve hostname
                hostname = ip_str
                try:
                    hostname = socket.getfqdn(ip_str)
                    if hostname == ip_str:
                        hostname = socket.gethostbyaddr(ip_str)[0]
                except Exception:
                    hostname = ip_str

                # Determine host type based on open ports
                host_type = 'unknown'
                services_set = set(p['service'] for p in open_ports)
                if services_set & {'MySQL', 'MSSQL', 'PostgreSQL'}:
                    host_type = 'database'
                elif services_set & {'HTTP', 'HTTPS', 'HTTP-Proxy', 'Flask', 'Node.js'}:
                    host_type = 'webserver'
                elif services_set & {'SMB', 'NetBIOS', 'RPC'}:
                    host_type = 'fileserver'
                elif services_set & {'SSH', 'Telnet'}:
                    host_type = 'server'
                elif services_set & {'RDP', 'VNC'}:
                    host_type = 'workstation'
                elif services_set & {'DNS'}:
                    host_type = 'dns'
                elif services_set & {'SMTP', 'POP3', 'IMAP'}:
                    host_type = 'mailserver'

                # Risk assessment
                risk_score = 0
                for p in open_ports:
                    if p['port'] in [23, 21]:  # Telnet, FTP = high risk
                        risk_score += 30
                    elif p['port'] in [3389, 5900]:  # RDP, VNC
                        risk_score += 20
                    elif p['port'] in [445, 139, 135]:  # SMB/NetBIOS
                        risk_score += 25
                    elif p['port'] in [80, 8080]:  # HTTP (no encryption)
                        risk_score += 10
                    elif p['port'] in [1433, 3306, 5432]:  # Databases
                        risk_score += 20
                    else:
                        risk_score += 5
                risk_score = min(risk_score, 100)

                host_info = {
                    'ip': ip_str,
                    'hostname': hostname,
                    'alive': True,
                    'host_type': host_type,
                    'open_ports': open_ports,
                    'port_count': len(open_ports),
                    'risk_score': risk_score,
                    'risk_level': 'Critical' if risk_score >= 70 else 'High' if risk_score >= 40 else 'Medium' if risk_score >= 20 else 'Low',
                }

                with results_lock:
                    results[ip_str] = host_info

                # Push discovery event
                if streamer and stream_key:
                    try:
                        streamer.push_event(stream_key, {
                            'type': 'host_discovered',
                            'host': host_info
                        })
                    except Exception:
                        pass

                print(f"  [+] HOST ALIVE: {ip_str} ({hostname}) - {len(open_ports)} open ports - Risk: {host_info['risk_level']}")

        except Exception as e:
            print(f"  [-] Error scanning {ip_str}: {e}")
        finally:
            ip_queue.task_done()


def generate_topology(hosts):
    """
    Generate network topology data from discovered hosts.
    Creates nodes and edges for visualization.
    """
    nodes = []
    edges = []
    edge_id = 0

    # Create nodes for each host
    type_colors = {
        'webserver': '#3b82f6',     # blue
        'database': '#a855f7',      # purple
        'fileserver': '#eab308',    # yellow
        'server': '#22c55e',        # green
        'workstation': '#06b6d4',   # cyan
        'dns': '#f97316',           # orange
        'mailserver': '#ec4899',    # pink
        'unknown': '#6b7280',       # gray
    }

    type_icons = {
        'webserver': 'WEB',
        'database': 'DB',
        'fileserver': 'FS',
        'server': 'SRV',
        'workstation': 'WS',
        'dns': 'DNS',
        'mailserver': 'MX',
        'unknown': '?',
    }

    for ip, host in hosts.items():
        color = type_colors.get(host['host_type'], '#6b7280')
        risk_colors = {'Critical': '#dc2626', 'High': '#ea580c', 'Medium': '#eab308', 'Low': '#22c55e'}

        nodes.append({
            'id': ip,
            'ip': ip,
            'hostname': host['hostname'],
            'host_type': host['host_type'],
            'icon': type_icons.get(host['host_type'], '❓'),
            'color': color,
            'risk_color': risk_colors.get(host['risk_level'], '#6b7280'),
            'risk_score': host['risk_score'],
            'risk_level': host['risk_level'],
            'open_ports': host['open_ports'],
            'port_count': host['port_count'],
            'size': 20 + host['port_count'] * 3,
            'label': host['hostname'] if host['hostname'] != ip else ip,
        })

    # Create edges: hosts that share common services can "reach" each other
    host_list = list(hosts.values())
    for i, h1 in enumerate(host_list):
        h1_services = set(p['service'] for p in h1['open_ports'])
        for h2 in host_list[i + 1:]:
            h2_services = set(p['service'] for p in h2['open_ports'])

            # Connection types
            shared = h1_services & h2_services
            connections = []

            # SMB/NetBIOS connectivity (file sharing network)
            if h1_services & {'SMB', 'NetBIOS'} and h2_services & {'SMB', 'NetBIOS'}:
                connections.append({'type': 'smb', 'label': 'SMB/File Share', 'risk': 8})

            # SSH connectivity
            if 'SSH' in h1_services and 'SSH' in h2_services:
                connections.append({'type': 'ssh', 'label': 'SSH Access', 'risk': 4})

            # Web services on same network
            web = {'HTTP', 'HTTPS', 'HTTP-Proxy', 'Flask', 'Node.js'}
            if h1_services & web and h2_services & web:
                connections.append({'type': 'web', 'label': 'Web Network', 'risk': 3})

            # Database connections (web server → database)
            db_services = {'MySQL', 'MSSQL', 'PostgreSQL'}
            if h1_services & web and h2_services & db_services:
                connections.append({'type': 'db_access', 'label': 'DB Connection', 'risk': 9})
            if h2_services & web and h1_services & db_services:
                connections.append({'type': 'db_access', 'label': 'DB Connection', 'risk': 9})

            # RDP/VNC remote access
            if h1_services & {'RDP', 'VNC'} or h2_services & {'RDP', 'VNC'}:
                if h1_services & {'SSH', 'SMB'} or h2_services & {'SSH', 'SMB'}:
                    connections.append({'type': 'remote', 'label': 'Remote Access', 'risk': 7})

            # DNS dependency
            if 'DNS' in h1_services or 'DNS' in h2_services:
                connections.append({'type': 'dns', 'label': 'DNS Dependency', 'risk': 2})

            # Mail services
            mail = {'SMTP', 'POP3', 'IMAP'}
            if h1_services & mail and h2_services & mail:
                connections.append({'type': 'mail', 'label': 'Mail Relay', 'risk': 5})

            for conn in connections:
                edges.append({
                    'id': f'edge_{edge_id}',
                    'from': h1['ip'],
                    'to': h2['ip'],
                    'type': conn['type'],
                    'label': conn['label'],
                    'risk': conn['risk'],
                })
                edge_id += 1

    # Statistics
    stats = {
        'total_hosts': len(nodes),
        'total_connections': len(edges),
        'host_types': {},
        'risk_distribution': {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0},
    }
    for node in nodes:
        ht = node['host_type']
        stats['host_types'][ht] = stats['host_types'].get(ht, 0) + 1
        stats['risk_distribution'][node['risk_level']] = stats['risk_distribution'].get(node['risk_level'], 0) + 1

    return {
        'nodes': nodes,
        'edges': edges,
        'statistics': stats,
    }


def _run_demo_scan(subnet_str, stream_key):
    """Generates a rich, fake network topology for demo purposes when '10.10.10.0/24' is scanned."""
    import random
    
    print("  [*] Running DEMO mode for 10.10.10.0/24")
    
    # Push start event
    if streamer and stream_key:
        try:
            streamer.push_event(stream_key, {
                'type': 'subnet_scan_start',
                'subnet': subnet_str,
                'total_hosts': 256,
            })
        except Exception:
            pass

    # Define fake hosts
    mock_hosts_data = [
        {'ip': '10.10.10.1', 'hostname': 'Gateway-Router', 'type': 'unknown', 'ports': [80, 443, 22]},
        {'ip': '10.10.10.5', 'hostname': 'Corp-Firewall', 'type': 'server', 'ports': [22, 443, 8443]},
        {'ip': '10.10.10.10', 'hostname': 'Main-DC', 'type': 'dns', 'ports': [53, 88, 135, 139, 445, 3389, 53]},
        {'ip': '10.10.10.20', 'hostname': 'File-Server-01', 'type': 'fileserver', 'ports': [135, 139, 445, 21]},
        {'ip': '10.10.10.25', 'hostname': 'Backup-SAN', 'type': 'fileserver', 'ports': [445, 22, 111]},
        {'ip': '10.10.10.50', 'hostname': 'Web-Prod-01', 'type': 'webserver', 'ports': [80, 443, 22]},
        {'ip': '10.10.10.51', 'hostname': 'Web-Prod-02', 'type': 'webserver', 'ports': [80, 443, 22]},
        {'ip': '10.10.10.55', 'hostname': 'App-Server-Int', 'type': 'webserver', 'ports': [8080, 8443, 22]},
        {'ip': '10.10.10.100', 'hostname': 'DB-SQL-01', 'type': 'database', 'ports': [1433, 3389]},
        {'ip': '10.10.10.101', 'hostname': 'DB-MySQL-01', 'type': 'database', 'ports': [3306, 22]},
        {'ip': '10.10.10.105', 'hostname': 'DB-Redis', 'type': 'database', 'ports': [6379, 22]},
        {'ip': '10.10.10.150', 'hostname': 'Mail-Exchange', 'type': 'mailserver', 'ports': [25, 110, 143, 443]},
        {'ip': '10.10.10.200', 'hostname': 'HR-Desktop-01', 'type': 'workstation', 'ports': [135, 139, 445, 3389]},
        {'ip': '10.10.10.201', 'hostname': 'IT-Desktop-Admin', 'type': 'workstation', 'ports': [22, 3389, 445, 5900]},
        {'ip': '10.10.10.202', 'hostname': 'Dev-Laptop-03', 'type': 'workstation', 'ports': [22, 3000, 5000]}
    ]
    
    results = {}
    for h in mock_hosts_data:
        time.sleep(0.3)  # stream each host slowly
        open_ports = []
        risk_score = 0
        for p in h['ports']:
            service = PORT_SERVICE_MAP.get(p, 'Unknown')
            role = PORT_ROLE_MAP.get(p, 'unknown')
            open_ports.append({'port': p, 'service': service, 'role': role, 'status': 'open'})
            
            # Simple risk calc
            if p in [23, 21]: risk_score += 30
            elif p in [3389, 5900]: risk_score += 20
            elif p in [445, 139, 135]: risk_score += 25
            elif p in [80, 8080]: risk_score += 10
            elif p in [1433, 3306, 5432]: risk_score += 20
            else: risk_score += 5
            
        risk_score = min(risk_score, 100)
        
        host_info = {
            'ip': h['ip'],
            'hostname': h['hostname'],
            'alive': True,
            'host_type': h['type'],
            'open_ports': open_ports,
            'port_count': len(open_ports),
            'risk_score': risk_score,
            'risk_level': 'Critical' if risk_score >= 70 else 'High' if risk_score >= 40 else 'Medium' if risk_score >= 20 else 'Low',
        }
        results[h['ip']] = host_info
        
        if streamer and stream_key:
            try:
                streamer.push_event(stream_key, {'type': 'host_discovered', 'host': host_info})
            except Exception:
                pass
                
    time.sleep(1)
    topology = generate_topology(results)
    
    output = {
        'subnet': subnet_str,
        'scan_time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'total_scanned': 256,
        'hosts_found': len(results),
        'hosts': results,
        'topology': topology,
    }
    
    if streamer and stream_key:
        try:
            streamer.push_event(stream_key, {
                'type': 'subnet_complete',
                'subnet': subnet_str,
                'hosts_found': len(results),
                'topology': topology,
                'hosts': results,
            })
            streamer.close_stream(stream_key)
        except Exception:
            pass
            
    return output


def run_subnet_scan(subnet_str, thread_count=10, stream_key=None):
    """
    Main entry point: scans all hosts in a subnet.

    Args:
        subnet_str: e.g. "192.168.1.0/24"
        thread_count: number of parallel host-scan threads
        stream_key: key for SSE streaming (usually the subnet string)

    Returns:
        dict with topology data
    """
    print(f"\n{'='*60}")
    print(f"  SUBNET SCAN: {subnet_str}")
    print(f"  Threads: {thread_count}")
    print(f"{'='*60}\n")
    
    if subnet_str.strip() == "10.10.10.0/24":
        return _run_demo_scan(subnet_str, stream_key)

    try:
        network = ipaddress.ip_network(subnet_str, strict=False)
    except ValueError as e:
        print(f"  [!] Invalid subnet: {e}")
        return {'error': str(e), 'hosts': {}, 'topology': {'nodes': [], 'edges': [], 'statistics': {}}}

    hosts_to_scan = [ip for ip in network.hosts()]
    total_hosts = len(hosts_to_scan)
    print(f"  [*] Scanning {total_hosts} hosts in {subnet_str}...")

    # Push start event
    if streamer and stream_key:
        try:
            streamer.push_event(stream_key, {
                'type': 'subnet_scan_start',
                'subnet': subnet_str,
                'total_hosts': total_hosts,
            })
        except Exception:
            pass

    # Set up threading
    ip_queue = Queue()
    results = {}
    results_lock = threading.Lock()
    cancelled = threading.Event()

    for ip in hosts_to_scan:
        ip_queue.put(ip)

    # Add sentinel values
    effective_threads = min(thread_count, total_hosts)
    for _ in range(effective_threads):
        ip_queue.put(None)

    # Start worker threads
    threads = []
    for _ in range(effective_threads):
        t = threading.Thread(target=_host_worker, args=(ip_queue, results, results_lock, stream_key, cancelled))
        t.daemon = True
        t.start()
        threads.append(t)

    # Wait for completion
    ip_queue.join()
    for t in threads:
        t.join(timeout=5)

    print(f"\n  [*] Scan complete. Found {len(results)} live hosts.")

    # Generate topology
    topology = generate_topology(results)

    # Save results
    scanner_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(scanner_dir, 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    output = {
        'subnet': subnet_str,
        'scan_time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'total_scanned': total_hosts,
        'hosts_found': len(results),
        'hosts': results,
        'topology': topology,
    }

    file_path = os.path.join(data_dir, 'subnet_scan.json')
    with open(file_path, 'w') as f:
        json.dump(output, f, indent=4)
    print(f"  [*] Results saved to {file_path}")

    # Push complete event
    if streamer and stream_key:
        try:
            streamer.push_event(stream_key, {
                'type': 'subnet_complete',
                'subnet': subnet_str,
                'hosts_found': len(results),
                'topology': topology,
                'hosts': results,
            })
            streamer.close_stream(stream_key)
        except Exception:
            pass

    return output
