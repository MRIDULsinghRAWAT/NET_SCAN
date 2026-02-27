import json
import math

def generate_attack_graph(analyzed_data, attack_chains):
    """
    Converts analyzed data and attack chains into graph structure for visualization.
    Creates nodes (services) and edges (attack paths) that show lateral movement.

    Args:
        analyzed_data: Risk analysis output with vulnerable services
        attack_chains: Attack chain detection output

    Returns:
        Graph dict with nodes, edges, and visualization statistics
    """
    try:
        nodes = []
        edges = []
        node_ids = {}  # port -> id mapping

        # Extract services from analysis
        analysis = analyzed_data.get("analysis", [])

        # Create nodes from each service
        for service in analysis:
            port = service['port']
            service_name = service['service']
            risk_level = service['risk_level']
            vulnerabilities = service.get('vulnerabilities', [])

            # Color mapping based on risk
            color_map = {
                "Critical": "#dc2626",  # Red
                "High": "#ea580c",      # Orange
                "Medium": "#eab308",    # Yellow
                "Low": "#22c55e"        # Green
            }

            # Size mapping based on risk
            size_map = {
                "Critical": 15,
                "High": 12,
                "Medium": 10,
                "Low": 8
            }

            color = color_map.get(risk_level, "#666666")
            size = size_map.get(risk_level, 10)

            node_id = f"port_{port}"
            node_ids[port] = node_id

            nodes.append({
                "id": node_id,
                "port": port,
                "service": service_name,
                "risk": risk_level,
                "color": color,
                "size": size,
                "label": f"{service_name}\n({port})",
                "vulnerabilities": vulnerabilities
            })

        # Create edges from attack chains
        chains = attack_chains.get("chains", [])
        edge_id = 0
        lateral_movement_count = 0
        horizontal_movement_count = 0

        for chain in chains:
            # Extract port numbers from chain descriptions
            # Format: "Port XXX (Service Name)" → "Port YYY (Service Name)"
            from_desc = chain.get('from', '')
            to_desc = chain.get('to', '')
            chain_type = chain.get('type', 'lateral_movement')
            risk_score = chain.get('risk_score', 0)
            description = chain.get('description', '')

            # Parse port from "Port XXX (Service)" format
            try:
                from_port = from_desc.split()[1].strip('()')
                to_port = to_desc.split()[1].strip('()')
            except:
                continue

            from_id = f"port_{from_port}"
            to_id = f"port_{to_port}"

            # Only create edge if both nodes exist
            if any(n['id'] == from_id for n in nodes) and any(n['id'] == to_id for n in nodes):
                edges.append({
                    "id": f"edge_{edge_id}",
                    "from": from_id,
                    "to": to_id,
                    "type": chain_type,
                    "risk_score": risk_score,
                    "label": description
                })

                if chain_type == "lateral_movement":
                    lateral_movement_count += 1
                else:
                    horizontal_movement_count += 1

                edge_id += 1

        # Calculate statistics
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

        return {
            "nodes": nodes,
            "edges": edges,
            "statistics": statistics
        }

    except Exception as e:
        print(f"Error generating attack graph: {e}")
        return {
            "nodes": [],
            "edges": [],
            "statistics": {}
        }


def calculate_network_exposure(graph_data):
    """
    Calculates overall network exposure score and severity.

    Formula:
    - Critical services: 20 points each
    - High services: 10 points each
    - Lateral movement paths: 5 points each

    Args:
        graph_data: Graph data with nodes and statistics

    Returns:
        Dict with exposure_score (0-100), severity level, and reasoning
    """
    try:
        stats = graph_data.get("statistics", {})

        # Calculate exposure score
        critical_score = stats.get('critical_services', 0) * 20
        high_score = stats.get('high_risk_services', 0) * 10
        lateral_score = stats.get('lateral_movement_paths', 0) * 5

        total_exposure = critical_score + high_score + lateral_score

        # Cap at 100
        exposure_score = min(total_exposure, 100)

        # Determine severity
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
        return {
            "exposure_score": 0,
            "severity": "UNKNOWN",
            "reasoning": {"error": str(e)}
        }
