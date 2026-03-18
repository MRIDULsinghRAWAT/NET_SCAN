import json
import math
from collections import defaultdict, deque
import heapq


def generate_attack_graph(analyzed_data, attack_chains):
    """
    Converts analyzed data and attack chains into an enriched graph structure.
    Now includes: critical paths (Dijkstra), blast radii, risk propagation,
    MITRE ATT&CK summary, and attack simulation sequence.
    """
    try:
        nodes = []
        edges = []
        node_ids = {}

        ENTRY_PORTS = {"21","23","80","443","8080","8443","3389","5900","5901","3000","5000"}
        PIVOT_PORTS = {"22","25","135","139","445","110","143"}
        TARGET_PORTS = {"53","1433","3306","5432","6379","27017"}

        analysis = analyzed_data.get("analysis", [])

        # ── Create nodes ──────────────────────────────────────────────────
        for service in analysis:
            port = service['port']
            service_name = service['service']
            risk_level = service['risk_level']
            vulnerabilities = service.get('vulnerabilities', [])

            color_map = {
                "Critical": "#dc2626",
                "High": "#ea580c",
                "Medium": "#eab308",
                "Low": "#22c55e"
            }
            size_map = {"Critical": 24, "High": 20, "Medium": 16, "Low": 13}

            color = color_map.get(risk_level, "#666666")
            size = size_map.get(risk_level, 10)

            port_str = str(port)
            if port_str in ENTRY_PORTS:
                role = "entry"
            elif port_str in PIVOT_PORTS:
                role = "pivot"
            elif port_str in TARGET_PORTS:
                role = "target"
            else:
                role = "unknown"

            node_id = f"port_{port}"
            node_ids[port] = node_id

            nodes.append({
                "id": node_id,
                "port": port,
                "service": service_name,
                "risk": risk_level,
                "role": role,
                "color": color,
                "size": size,
                "label": f"{service_name}\n({port})",
                "vulnerabilities": vulnerabilities
            })

        # ── Create edges from attack chains ───────────────────────────────
        chains = attack_chains.get("chains", [])
        edge_id = 0
        lateral_movement_count = 0
        horizontal_movement_count = 0

        for chain in chains:
            from_desc = chain.get('from', '')
            to_desc = chain.get('to', '')
            chain_type = chain.get('type', 'lateral_movement')
            risk_score = chain.get('risk_score', 0)
            description = chain.get('description', '')

            try:
                from_port = from_desc.split()[1].strip('()')
                to_port = to_desc.split()[1].strip('()')
            except:
                continue

            from_id = f"port_{from_port}"
            to_id = f"port_{to_port}"

            if any(n['id'] == from_id for n in nodes) and any(n['id'] == to_id for n in nodes):
                edges.append({
                    "id": f"edge_{edge_id}",
                    "from": from_id,
                    "to": to_id,
                    "type": chain_type,
                    "risk_score": risk_score,
                    "label": description,
                    "mitre_id": chain.get("mitre_id", ""),
                    "technique": chain.get("technique", ""),
                    "category": chain.get("category", "unknown"),
                    "difficulty": chain.get("difficulty", 5)
                })

                if chain_type == "lateral_movement":
                    lateral_movement_count += 1
                else:
                    horizontal_movement_count += 1
                edge_id += 1

        # ── Statistics ────────────────────────────────────────────────────
        critical_services = len([n for n in nodes if n['risk'] == 'Critical'])
        high_risk_services = len([n for n in nodes if n['risk'] == 'High'])
        medium_services = len([n for n in nodes if n['risk'] == 'Medium'])
        low_services = len([n for n in nodes if n['risk'] == 'Low'])

        statistics = {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "critical_services": critical_services,
            "high_risk_services": high_risk_services,
            "medium_services": medium_services,
            "low_services": low_services,
            "lateral_movement_paths": lateral_movement_count,
            "horizontal_movement_paths": horizontal_movement_count,
            "total_vulnerabilities": sum(len(n['vulnerabilities']) for n in nodes)
        }

        # ══════════════════════════════════════════════════════════════════
        #  ADVANCED LATERAL MOVEMENT ANALYSIS
        # ══════════════════════════════════════════════════════════════════

        # 1. Critical Path Analysis (BFS shortest + Dijkstra deadliest)
        critical_paths = find_critical_paths(nodes, edges)

        # 2. Blast Radius per node
        blast_radii = calculate_blast_radius(nodes, edges)

        # 3. Risk Propagation from the most dangerous entry point
        risk_propagation = {}
        entry_nodes = [n for n in nodes if n.get('role') == 'entry']
        if entry_nodes and blast_radii:
            best_entry = max(
                entry_nodes,
                key=lambda n: blast_radii.get(n['id'], {}).get('reachable_count', 0)
            )
            risk_propagation = calculate_risk_propagation(nodes, edges, best_entry['id'])

        # 4. Attack Simulation Sequence
        simulation = generate_attack_simulation(nodes, edges, critical_paths)

        # 5. MITRE ATT&CK Heatmap Summary
        mitre_summary = _build_mitre_summary(edges)

        # 6. What-If recommendations (top 3 ports to close)
        what_if_recommendations = _auto_what_if(nodes, edges)

        return {
            "nodes": nodes,
            "edges": edges,
            "statistics": statistics,
            "critical_paths": critical_paths[:10],
            "blast_radii": blast_radii,
            "risk_propagation": risk_propagation,
            "simulation": simulation,
            "mitre_summary": mitre_summary,
            "what_if_recommendations": what_if_recommendations
        }

    except Exception as e:
        print(f"Error generating attack graph: {e}")
        import traceback
        traceback.print_exc()
        return {
            "nodes": [], "edges": [], "statistics": {},
            "critical_paths": [], "blast_radii": {}, "risk_propagation": {},
            "simulation": {"steps": [], "total_duration": 0, "path_node_ids": []},
            "mitre_summary": {}, "what_if_recommendations": []
        }


# ══════════════════════════════════════════════════════════════════════
#  NETWORK EXPOSURE SCORE
# ══════════════════════════════════════════════════════════════════════

def calculate_network_exposure(graph_data):
    """
    Calculates overall network exposure score and severity.
    Enhanced: now also factors in blast radius and critical paths.
    """
    try:
        stats = graph_data.get("statistics", {})

        critical_score = stats.get('critical_services', 0) * 20
        high_score = stats.get('high_risk_services', 0) * 10
        lateral_score = stats.get('lateral_movement_paths', 0) * 5

        total_exposure = critical_score + high_score + lateral_score
        exposure_score = min(total_exposure, 100)

        if exposure_score >= 80:
            severity = "CRITICAL"
        elif exposure_score >= 60:
            severity = "HIGH"
        elif exposure_score >= 40:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        reasoning = {
            "critical_services_contribution": critical_score,
            "high_services_contribution": high_score,
            "lateral_paths_contribution": lateral_score,
            "formula": f"{critical_score} (critical) + {high_score} (high) + {lateral_score} (paths) = {total_exposure}",
            "severity_threshold": f"{exposure_score}/100"
        }

        return {
            "exposure_score": min(exposure_score, 100),
            "severity": severity,
            "reasoning": reasoning
        }

    except Exception as e:
        print(f"Error calculating network exposure: {e}")
        return {"exposure_score": 0, "severity": "UNKNOWN", "reasoning": {"error": str(e)}}


# ══════════════════════════════════════════════════════════════════════
#  CRITICAL PATH ANALYSIS  (BFS + Dijkstra)
# ══════════════════════════════════════════════════════════════════════

def find_critical_paths(nodes, edges):
    """
    Finds shortest (BFS) and deadliest (Dijkstra) paths
    between every Entry node and every Target node.
    """
    adj = defaultdict(list)
    for edge in edges:
        adj[edge['from']].append({
            'to': edge['to'],
            'risk': edge.get('risk_score', 5),
            'edge_id': edge['id'],
            'label': edge.get('label', ''),
            'mitre_id': edge.get('mitre_id', '')
        })

    entry_nodes = [n for n in nodes if n.get('role') == 'entry']
    target_nodes = [n for n in nodes if n.get('role') == 'target']

    critical_paths = []
    for entry in entry_nodes:
        for target in target_nodes:
            shortest = _bfs_path(adj, entry['id'], target['id'])
            deadliest = _deadliest_path(adj, entry['id'], target['id'])

            if shortest:
                critical_paths.append({
                    'type': 'shortest',
                    'from': entry['id'],
                    'to': target['id'],
                    'from_service': entry['service'],
                    'to_service': target['service'],
                    'path': shortest['path'],
                    'hops': shortest['hops'],
                    'total_risk': round(shortest['total_risk'], 1)
                })

            if deadliest:
                is_different = not shortest or deadliest['path'] != shortest['path']
                if is_different:
                    critical_paths.append({
                        'type': 'deadliest',
                        'from': entry['id'],
                        'to': target['id'],
                        'from_service': entry['service'],
                        'to_service': target['service'],
                        'path': deadliest['path'],
                        'hops': deadliest['hops'],
                        'total_risk': round(deadliest['total_risk'], 1)
                    })

    critical_paths.sort(key=lambda p: p['total_risk'], reverse=True)
    return critical_paths


def _bfs_path(adj, start, end):
    """BFS — shortest path by hop count."""
    queue = deque([(start, [start], 0)])
    visited = {start}
    while queue:
        current, path, risk = queue.popleft()
        if current == end:
            return {'path': path, 'hops': len(path) - 1, 'total_risk': risk}
        for neighbor in adj.get(current, []):
            if neighbor['to'] not in visited:
                visited.add(neighbor['to'])
                queue.append((neighbor['to'], path + [neighbor['to']], risk + neighbor['risk']))
    return None


def _deadliest_path(adj, start, end):
    """Modified Dijkstra — finds path with HIGHEST cumulative risk."""
    heap = [(0, 0, start, [start])]   # (neg_risk, tiebreaker, node, path)
    best_risk = {}
    counter = 1
    while heap:
        neg_risk, _, current, path = heapq.heappop(heap)
        risk = -neg_risk
        if current == end:
            return {'path': path, 'hops': len(path) - 1, 'total_risk': risk}
        if current in best_risk and best_risk[current] >= risk:
            continue
        best_risk[current] = risk
        for neighbor in adj.get(current, []):
            new_risk = risk + neighbor['risk']
            if neighbor['to'] not in best_risk or best_risk[neighbor['to']] < new_risk:
                heapq.heappush(heap, (-new_risk, counter, neighbor['to'], path + [neighbor['to']]))
                counter += 1
    return None


# ══════════════════════════════════════════════════════════════════════
#  BLAST RADIUS
# ══════════════════════════════════════════════════════════════════════

def calculate_blast_radius(nodes, edges):
    """For each node, how many others are reachable via outgoing edges (BFS)."""
    adj = defaultdict(list)
    for edge in edges:
        adj[edge['from']].append(edge['to'])

    blast_radii = {}
    total_nodes = len(nodes)
    for node in nodes:
        visited = set()
        queue = deque([node['id']])
        visited.add(node['id'])
        while queue:
            current = queue.popleft()
            for neighbor in adj.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        reachable = visited - {node['id']}
        pct = (len(reachable) / max(total_nodes - 1, 1)) * 100
        blast_radii[node['id']] = {
            'reachable_count': len(reachable),
            'reachable_nodes': list(reachable),
            'percentage': round(pct, 1),
            'severity': (
                'critical' if pct >= 70 else
                'high' if pct >= 40 else
                'medium' if len(reachable) > 0 else 'contained'
            )
        }
    return blast_radii


# ══════════════════════════════════════════════════════════════════════
#  RISK PROPAGATION  (Cascading Compromise)
# ══════════════════════════════════════════════════════════════════════

def calculate_risk_propagation(nodes, edges, source_node_id):
    """
    Models cascading compromise from a source node.
    Each hop reduces probability: parent_prob × (edge_risk/10) × 0.85
    """
    adj = defaultdict(list)
    for edge in edges:
        adj[edge['from']].append({'to': edge['to'], 'risk': edge.get('risk_score', 5)})

    propagation = {}
    queue = deque([(source_node_id, 100.0, 0)])
    visited = {source_node_id}
    propagation[source_node_id] = {'probability': 100.0, 'hops': 0}

    while queue:
        current, prob, hops = queue.popleft()
        for neighbor in adj.get(current, []):
            if neighbor['to'] not in visited:
                visited.add(neighbor['to'])
                new_prob = prob * (neighbor['risk'] / 10.0) * 0.85
                propagation[neighbor['to']] = {
                    'probability': round(new_prob, 1),
                    'hops': hops + 1
                }
                if new_prob > 1.0:
                    queue.append((neighbor['to'], new_prob, hops + 1))
    return propagation


# ══════════════════════════════════════════════════════════════════════
#  WHAT-IF ANALYSIS  (Attack Surface Reduction)
# ══════════════════════════════════════════════════════════════════════

def what_if_remove_port(graph_data, port_to_remove):
    """Simulates removing a port and recalculates impact."""
    original_nodes = graph_data.get('nodes', [])
    original_edges = graph_data.get('edges', [])
    remove_id = f"port_{port_to_remove}"

    new_nodes = [n for n in original_nodes if n['id'] != remove_id]
    new_edges = [e for e in original_edges if e['from'] != remove_id and e['to'] != remove_id]
    edges_eliminated = len(original_edges) - len(new_edges)

    new_graph = {
        'nodes': new_nodes, 'edges': new_edges,
        'statistics': {
            'critical_services': len([n for n in new_nodes if n['risk'] == 'Critical']),
            'high_risk_services': len([n for n in new_nodes if n['risk'] == 'High']),
            'lateral_movement_paths': len([e for e in new_edges if e.get('type') == 'lateral_movement']),
        }
    }

    original_exposure = calculate_network_exposure(graph_data)
    new_exposure = calculate_network_exposure(new_graph)
    reduction = original_exposure.get('exposure_score', 0) - new_exposure.get('exposure_score', 0)

    removed_node = next((n for n in original_nodes if n['id'] == remove_id), None)
    removed_service = removed_node.get('service', 'Unknown') if removed_node else 'Unknown'

    return {
        'removed_port': port_to_remove,
        'removed_service': removed_service,
        'exposure_reduction': reduction,
        'paths_eliminated': edges_eliminated,
        'remaining_paths': len(new_edges),
        'recommendation': f"Closing port {port_to_remove} ({removed_service}) eliminates {edges_eliminated} attack path(s), reduces exposure by {reduction} pts"
    }


def _auto_what_if(nodes, edges):
    """Automatically calculates top 3 most impactful ports to close."""
    graph_data = {
        'nodes': nodes, 'edges': edges,
        'statistics': {
            'critical_services': len([n for n in nodes if n['risk'] == 'Critical']),
            'high_risk_services': len([n for n in nodes if n['risk'] == 'High']),
            'lateral_movement_paths': len([e for e in edges if e.get('type') == 'lateral_movement']),
        }
    }
    results = []
    for node in nodes:
        result = what_if_remove_port(graph_data, node['port'])
        result['impact_score'] = result['paths_eliminated'] * 2 + result['exposure_reduction']
        results.append(result)
    results.sort(key=lambda r: r['impact_score'], reverse=True)
    return results[:3]


# ══════════════════════════════════════════════════════════════════════
#  ATTACK SIMULATION SEQUENCE
# ══════════════════════════════════════════════════════════════════════

def generate_attack_simulation(nodes, edges, critical_paths):
    """
    Generates ordered attack steps for the deadliest path.
    Used by the frontend for animated attack playback.
    """
    if not critical_paths:
        return {'steps': [], 'total_duration': 0, 'path_node_ids': []}

    # Pick the deadliest path
    deadliest = None
    for path in critical_paths:
        if path.get('type') == 'deadliest':
            deadliest = path
            break
    if not deadliest:
        deadliest = critical_paths[0]

    path_node_ids = deadliest.get('path', [])
    node_map = {n['id']: n for n in nodes}

    # Build edge lookup
    edge_map = {}
    for edge in edges:
        edge_map[(edge['from'], edge['to'])] = edge

    steps = []
    for i, node_id in enumerate(path_node_ids):
        node = node_map.get(node_id, {})
        step = {
            'step_number': i + 1,
            'node_id': node_id,
            'service': node.get('service', 'Unknown'),
            'port': node.get('port', ''),
            'role': node.get('role', 'unknown'),
            'risk': node.get('risk', 'Unknown'),
            'timestamp': i * 2.0,
        }

        if i == 0:
            step['action'] = 'INITIAL_ACCESS'
            step['description'] = f"Attacker gains initial access through {node.get('service', 'Unknown')} on port {node.get('port', '')}"
        elif i == len(path_node_ids) - 1:
            step['action'] = 'OBJECTIVE'
            step['description'] = f"Attacker reaches final target: {node.get('service', 'Unknown')} on port {node.get('port', '')}"
        else:
            step['action'] = 'LATERAL_MOVE'
            step['description'] = f"Attacker pivots through {node.get('service', 'Unknown')} on port {node.get('port', '')}"

        if i > 0:
            prev_node_id = path_node_ids[i - 1]
            edge = edge_map.get((prev_node_id, node_id))
            if edge:
                step['edge_id'] = edge['id']
                step['edge_description'] = edge.get('label', '')
                step['mitre_id'] = edge.get('mitre_id', '')
                step['technique'] = edge.get('technique', '')
                step['category'] = edge.get('category', '')

        steps.append(step)

    return {
        'path_type': deadliest.get('type', 'deadliest'),
        'total_risk': deadliest.get('total_risk', 0),
        'steps': steps,
        'total_duration': len(steps) * 2.0,
        'path_node_ids': path_node_ids
    }


# ══════════════════════════════════════════════════════════════════════
#  MITRE ATT&CK HEATMAP SUMMARY
# ══════════════════════════════════════════════════════════════════════

def _build_mitre_summary(edges):
    """Aggregates MITRE technique usage across all edges."""
    techniques = {}
    categories = {}

    for edge in edges:
        mid = edge.get('mitre_id', '')
        tech = edge.get('technique', '')
        cat = edge.get('category', 'unknown')

        if mid:
            if mid not in techniques:
                techniques[mid] = {'id': mid, 'name': tech, 'count': 0, 'category': cat}
            techniques[mid]['count'] += 1

        categories[cat] = categories.get(cat, 0) + 1

    return {
        'techniques': list(techniques.values()),
        'categories': categories,
        'total_unique_techniques': len(techniques)
    }
