"""
CVE Lookup Module — Queries the National Vulnerability Database (NVD) API v2.0
to find real CVEs for discovered services.

NVD API: https://services.nvd.nist.gov/rest/json/cves/2.0
Rate Limit: 5 requests / 30 seconds (no API key)
"""

import urllib.request
import urllib.parse
import json
import time
import threading

# ── In-memory cache to avoid duplicate API calls ──────────────────────
_cache = {}
_cache_lock = threading.Lock()

# Rate limiting: max 5 requests per 30 seconds
_request_times = []
_rate_lock = threading.Lock()


# ── Service-to-keyword mapping for better NVD search results ─────────
SERVICE_KEYWORDS = {
    "FTP":          "FTP server",
    "SSH":          "OpenSSH",
    "TELNET":       "Telnet",
    "SMTP":         "SMTP",
    "DNS":          "DNS server",
    "HTTP":         "HTTP server",
    "POP3":         "POP3",
    "IMAP":         "IMAP",
    "HTTPS":        "HTTPS TLS",
    "NetBIOS-SSN":  "NetBIOS SMB",
    "SMB":          "SMB server",
    "MSSQL":        "Microsoft SQL Server",
    "MySQL":        "MySQL",
    "RDP":          "Remote Desktop Protocol",
    "PostgreSQL":   "PostgreSQL",
    "VNC":          "VNC server",
    "HTTP-Proxy":   "HTTP proxy",
    "HTTPS-Alt":    "HTTPS",
    "Flask/HTTP":   "Flask Python",
    "Node.js/HTTP": "Node.js HTTP",
    "Node/HTTP":    "Node.js HTTP",
    "Redis":        "Redis server",
    "MongoDB":      "MongoDB",
}


def _rate_limit():
    """Enforces NVD rate limit: max 5 requests per 30 seconds."""
    with _rate_lock:
        now = time.time()
        # Remove timestamps older than 30 seconds
        _request_times[:] = [t for t in _request_times if now - t < 30]

        if len(_request_times) >= 5:
            # Wait until the oldest request is >30 seconds old
            wait_time = 30 - (now - _request_times[0]) + 0.5
            if wait_time > 0:
                print(f"    [CVE] Rate limit hit, waiting {wait_time:.1f}s...")
                time.sleep(wait_time)

        _request_times.append(time.time())


def lookup_cves_for_service(service_name, port, max_results=5):
    """
    Queries the NVD API for CVEs related to a specific service.

    Args:
        service_name: The service name (e.g., "SSH", "MySQL", "HTTP")
        port: The port number (used for cache key)
        max_results: Maximum number of CVEs to return

    Returns:
        List of CVE dicts: [{ id, score, severity, description, url }]
    """
    # Check cache first
    cache_key = f"{service_name}:{port}"
    with _cache_lock:
        if cache_key in _cache:
            return _cache[cache_key]

    # Map service name to a better search keyword
    base_service = service_name.split('/')[0].strip()
    keyword = SERVICE_KEYWORDS.get(base_service, base_service)

    # If service name looks like a version banner, use it directly
    if any(char.isdigit() for char in service_name) and len(service_name) > 5:
        keyword = service_name.split('\n')[0].strip()[:80]

    try:
        _rate_limit()

        # Build NVD API v2.0 URL
        params = urllib.parse.urlencode({
            'keywordSearch': keyword,
            'resultsPerPage': max_results,
            'keywordExactMatch': ''
        })
        url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?{params}"

        print(f"    [CVE] Querying NVD for: {keyword}")

        req = urllib.request.Request(url, headers={
            'User-Agent': 'NET_SCAN/1.0 (Security Research Tool)',
            'Accept': 'application/json'
        })

        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())

        vulnerabilities = data.get('vulnerabilities', [])
        cves = []

        for vuln in vulnerabilities[:max_results]:
            cve_data = vuln.get('cve', {})
            cve_id = cve_data.get('id', 'Unknown')

            # Get English description
            descriptions = cve_data.get('descriptions', [])
            description = 'No description available'
            for desc in descriptions:
                if desc.get('lang') == 'en':
                    description = desc.get('value', description)
                    break

            # Truncate long descriptions
            if len(description) > 200:
                description = description[:200] + '...'

            # Get CVSS v3.1 score (preferred) or v3.0 or v2.0
            score = 0.0
            severity = 'UNKNOWN'

            metrics = cve_data.get('metrics', {})

            # Try CVSS v3.1 first
            cvss_v31 = metrics.get('cvssMetricV31', [])
            if cvss_v31:
                cvss_data = cvss_v31[0].get('cvssData', {})
                score = cvss_data.get('baseScore', 0.0)
                severity = cvss_data.get('baseSeverity', 'UNKNOWN')

            # Fallback to CVSS v3.0
            if score == 0:
                cvss_v30 = metrics.get('cvssMetricV30', [])
                if cvss_v30:
                    cvss_data = cvss_v30[0].get('cvssData', {})
                    score = cvss_data.get('baseScore', 0.0)
                    severity = cvss_data.get('baseSeverity', 'UNKNOWN')

            # Fallback to CVSS v2.0
            if score == 0:
                cvss_v2 = metrics.get('cvssMetricV2', [])
                if cvss_v2:
                    cvss_data = cvss_v2[0].get('cvssData', {})
                    score = cvss_data.get('baseScore', 0.0)
                    # v2 doesn't have baseSeverity, calculate it
                    if score >= 9.0:
                        severity = 'CRITICAL'
                    elif score >= 7.0:
                        severity = 'HIGH'
                    elif score >= 4.0:
                        severity = 'MEDIUM'
                    else:
                        severity = 'LOW'

            # Get reference URL
            references = cve_data.get('references', [])
            ref_url = f"https://nvd.nist.gov/vuln/detail/{cve_id}"
            if references:
                ref_url = references[0].get('url', ref_url)

            cves.append({
                'id': cve_id,
                'score': score,
                'severity': severity,
                'description': description,
                'url': ref_url,
                'service': service_name,
                'port': port
            })

        # Sort by CVSS score (highest first)
        cves.sort(key=lambda c: c['score'], reverse=True)

        # Cache the result
        with _cache_lock:
            _cache[cache_key] = cves

        print(f"    [CVE] Found {len(cves)} CVEs for {service_name} (port {port})")
        return cves

    except urllib.error.HTTPError as e:
        print(f"    [CVE] HTTP Error for {service_name}: {e.code} {e.reason}")
        # Cache empty result to avoid retrying
        with _cache_lock:
            _cache[cache_key] = []
        return []
    except urllib.error.URLError as e:
        print(f"    [CVE] Network Error for {service_name}: {e.reason}")
        with _cache_lock:
            _cache[cache_key] = []
        return []
    except Exception as e:
        print(f"    [CVE] Error looking up {service_name}: {e}")
        with _cache_lock:
            _cache[cache_key] = []
        return []


def lookup_cves_for_scan(analyzed_data, max_per_service=3):
    """
    Looks up CVEs for all services found in a scan.

    Args:
        analyzed_data: Output from analyzer.analyze_scan_results()
        max_per_service: Max CVEs to fetch per service

    Returns:
        Dict with CVE results: {
            total_cves: int,
            critical_cves: int,
            high_cves: int,
            services: { port: [cve_list] },
            all_cves: [all cves sorted by score]
        }
    """
    analysis = analyzed_data.get('analysis', [])

    if not analysis:
        return {'total_cves': 0, 'critical_cves': 0, 'high_cves': 0,
                'services': {}, 'all_cves': []}

    print(f"\n>>> [CVE] Starting CVE lookup for {len(analysis)} services...")

    all_cves = []
    services_cves = {}
    seen_services = set()  # avoid duplicate lookups for same service type

    for service_info in analysis:
        port = str(service_info.get('port', ''))
        service_name = service_info.get('service', 'Unknown')

        # Skip unknown services
        if service_name in ('Unknown', 'Unknown Service', ''):
            continue

        # Avoid duplicate API calls for same service type
        base_key = service_name.split('/')[0].strip()
        if base_key in seen_services:
            # Copy cached results for same service
            for prev_port, prev_cves in services_cves.items():
                if prev_cves and prev_cves[0].get('service', '').split('/')[0].strip() == base_key:
                    port_cves = []
                    for cve in prev_cves:
                        port_cve = dict(cve)
                        port_cve['port'] = port
                        port_cves.append(port_cve)
                    services_cves[port] = port_cves
                    break
            continue

        seen_services.add(base_key)

        # Query NVD
        cves = lookup_cves_for_service(service_name, port, max_per_service)
        services_cves[port] = cves
        all_cves.extend(cves)

    # Sort all CVEs by score
    all_cves.sort(key=lambda c: c['score'], reverse=True)

    # Count by severity
    critical_count = len([c for c in all_cves if c['severity'] == 'CRITICAL'])
    high_count = len([c for c in all_cves if c['severity'] == 'HIGH'])
    medium_count = len([c for c in all_cves if c['severity'] == 'MEDIUM'])

    result = {
        'total_cves': len(all_cves),
        'critical_cves': critical_count,
        'high_cves': high_count,
        'medium_cves': medium_count,
        'services': services_cves,
        'all_cves': all_cves[:20],  # Top 20 CVEs
    }

    print(f">>> [CVE] Complete: {len(all_cves)} CVEs found "
          f"({critical_count} Critical, {high_count} High, {medium_count} Medium)")

    return result


def clear_cache():
    """Clears the CVE cache."""
    with _cache_lock:
        _cache.clear()
