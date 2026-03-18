import React, { useEffect, useRef, useState, useCallback } from 'react';

const GraphView = ({ graphData, exposure, attackChains, cveData }) => {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [simPlaying, setSimPlaying] = useState(false);
  const [simStep, setSimStep] = useState(-1);
  const [activeTab, setActiveTab] = useState('chains');

  const hoveredNodeRef = useRef(null);
  const hoveredEdgeRef = useRef(null);
  const selectedNodeRef = useRef(null);
  const simPlayingRef = useRef(false);
  const simStepRef = useRef(-1);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const animationRef = useRef(null);
  const initializedRef = useRef(false);
  const simTimerRef = useRef(null);

  useEffect(() => { hoveredNodeRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { hoveredEdgeRef.current = hoveredEdge; }, [hoveredEdge]);
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);
  useEffect(() => { simPlayingRef.current = simPlaying; }, [simPlaying]);
  useEffect(() => { simStepRef.current = simStep; }, [simStep]);

  // Simulation playback timer
  useEffect(() => {
    if (simPlaying && graphData?.simulation?.steps?.length > 0) {
      const totalSteps = graphData.simulation.steps.length;
      simTimerRef.current = setInterval(() => {
        setSimStep(prev => {
          const next = prev + 1;
          if (next >= totalSteps) {
            setSimPlaying(false);
            return totalSteps - 1;
          }
          return next;
        });
      }, 2000);
    }
    return () => { if (simTimerRef.current) clearInterval(simTimerRef.current); };
  }, [simPlaying, graphData]);

  // Point-to-line distance for edge hover detection
  const pointToLineDist = useCallback((px, py, x1, y1, x2, y2) => {
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
  }, []);

  // Main canvas render
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const parent = canvas.parentElement;
    if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    } else {
      canvas.width = 1200;
      canvas.height = 500;
    }
    const width = canvas.width;
    const height = canvas.height;

    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const simPathIds = new Set(graphData?.simulation?.path_node_ids || []);
    const simEdgeSet = new Set();
    const simPathArr = graphData?.simulation?.path_node_ids || [];
    for (let i = 0; i < simPathArr.length - 1; i++) {
      simEdgeSet.add(`${simPathArr[i]}->${simPathArr[i + 1]}`);
    }

    // Init positions in a circle
    if (!initializedRef.current || !nodes.some(n => n.x !== undefined)) {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.35;
      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        node.x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 20;
        node.y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 20;
        node.vx = 0;
        node.vy = 0;
      });
      initializedRef.current = true;
    }

    let settled = false;
    let frameCount = 0;

    const render = () => {
      frameCount++;
      const time = Date.now() / 1000;

      if (!settled) {
        nodes.forEach((node) => {
          nodes.forEach((other) => {
            if (node === other) return;
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.hypot(dx, dy) || 1;
            const force = 1200 / (dist * dist + 50);
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          });
          edges.forEach((edge) => {
            let other = null;
            if (edge.from === node.id) other = nodes.find(n => n.id === edge.to);
            else if (edge.to === node.id) other = nodes.find(n => n.id === edge.from);
            if (other) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const dist = Math.hypot(dx, dy) || 1;
              const force = (dist - 180) * 0.04;
              node.vx += (dx / dist) * force;
              node.vy += (dy / dist) * force;
            }
          });
          node.vx += (width / 2 - node.x) * 0.004;
          node.vy += (height / 2 - node.y) * 0.004;
          node.vx *= 0.82;
          node.vy *= 0.82;
          node.x += node.vx;
          node.y += node.vy;
          const pad = 60;
          node.x = Math.max(pad, Math.min(width - pad, node.x));
          node.y = Math.max(pad, Math.min(height - pad, node.y));
        });
        if (frameCount > 60 && !nodes.some(n => Math.abs(n.vx) > 0.3 || Math.abs(n.vy) > 0.3)) {
          settled = true;
        }
      }

      // ── DRAW ──────────────────────────────────────────────────────
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Grid background
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
      }

      const currentHovered = hoveredNodeRef.current;
      const currentSelected = selectedNodeRef.current;
      const currentHoveredEdge = hoveredEdgeRef.current;
      const currentSimStep = simStepRef.current;

      // Get blast radius nodes for selected node
      const blastNodes = new Set();
      if (currentSelected && graphData.blast_radii) {
        const br = graphData.blast_radii[currentSelected.id];
        if (br) br.reachable_nodes.forEach(id => blastNodes.add(id));
        blastNodes.add(currentSelected.id);
      }

      // Active sim nodes (up to current step)
      const activeSimNodes = new Set();
      const activeSimEdges = new Set();
      if (currentSimStep >= 0 && graphData?.simulation?.steps) {
        for (let s = 0; s <= currentSimStep && s < graphData.simulation.steps.length; s++) {
          activeSimNodes.add(graphData.simulation.steps[s].node_id);
          if (graphData.simulation.steps[s].edge_id) {
            activeSimEdges.add(graphData.simulation.steps[s].edge_id);
          }
        }
      }

      // ── Draw Edges ──────────────────────────────────────────────
      edges.forEach((edge) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const isSimEdge = simEdgeSet.has(`${edge.from}->${edge.to}`);
        const isActiveSimEdge = activeSimEdges.has(edge.id);
        const isHoveredEdge = currentHoveredEdge?.id === edge.id;
        const isBlastEdge = currentSelected && blastNodes.has(edge.from) && blastNodes.has(edge.to);

        // Edge thickness based on risk
        let lineWidth = 1 + (edge.risk_score || 5) / 4;
        let strokeColor = 'rgba(80,80,80,0.5)';
        let dashPattern = [];

        if (edge.type === 'horizontal_movement') dashPattern = [6, 4];

        // Color by category
        const catColors = {
          credential_reuse: 'rgba(239, 68, 68, 0.6)',
          exploitation: 'rgba(249, 115, 22, 0.6)',
          tunneling: 'rgba(59, 130, 246, 0.6)',
          exfiltration: 'rgba(168, 85, 247, 0.6)',
          credential_theft: 'rgba(236, 72, 153, 0.6)',
          discovery: 'rgba(34, 197, 94, 0.6)',
        };
        if (edge.category && catColors[edge.category]) {
          strokeColor = catColors[edge.category];
        }

        // Highlight states
        if (isHoveredEdge) {
          lineWidth = 4;
          strokeColor = '#ffffff';
        } else if (isActiveSimEdge) {
          lineWidth = 4;
          strokeColor = '#00ff88';
        } else if (isSimEdge && currentSimStep >= 0) {
          strokeColor = 'rgba(0, 255, 136, 0.2)';
        } else if (isBlastEdge) {
          strokeColor = 'rgba(239, 68, 68, 0.8)';
          lineWidth = 3;
        } else if (currentSelected && !isBlastEdge) {
          strokeColor = 'rgba(60,60,60,0.2)';
          lineWidth = 1;
        }

        ctx.setLineDash(dashPattern);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const arrowSize = 12;
        const arrowDist = (toNode.size || 12) + 8;
        const arrowX = toNode.x - Math.cos(angle) * arrowDist;
        const arrowY = toNode.y - Math.sin(angle) * arrowDist;

        ctx.fillStyle = isActiveSimEdge ? '#00ff88' : isHoveredEdge ? '#ffffff' :
          edge.type === 'lateral_movement' ? '#FF6B6B' : '#FFA500';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle - 0.5), arrowY - arrowSize * Math.sin(angle - 0.5));
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle + 0.5), arrowY - arrowSize * Math.sin(angle + 0.5));
        ctx.closePath();
        ctx.fill();

        // ── Animated flowing dot ─────────────────────────────────
        if (!currentSelected || isBlastEdge || isActiveSimEdge) {
          const speed = 0.4;
          const t = ((time * speed) + edge.risk_score * 0.1) % 1;
          const dotX = fromNode.x + (toNode.x - fromNode.x) * t;
          const dotY = fromNode.y + (toNode.y - fromNode.y) * t;

          const dotColor = isActiveSimEdge ? '#00ff88' :
            edge.type === 'lateral_movement' ? '#FF6B6B' : '#FFA500';

          // Glow
          const gradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 10);
          gradient.addColorStop(0, dotColor);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
          ctx.fill();

          // Core dot
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // ── Draw Nodes ──────────────────────────────────────────────
      nodes.forEach((node) => {
        const isHovered = currentHovered?.id === node.id;
        const isSelected = currentSelected?.id === node.id;
        const isInBlast = blastNodes.has(node.id);
        const isSimNode = simPathIds.has(node.id);
        const isActiveSimNode = activeSimNodes.has(node.id);
        const isCurrentSimNode = currentSimStep >= 0 && graphData?.simulation?.steps?.[currentSimStep]?.node_id === node.id;

        let size = isHovered || isSelected ? node.size * 1.5 : node.size;
        let alpha = 1.0;

        // Dim non-blast nodes when a node is selected
        if (currentSelected && !isInBlast) alpha = 0.15;

        const roleColors = {
          entry: { ring: '#06b6d4', label: 'ENTRY', glow: 'rgba(6, 182, 212, 0.3)' },
          pivot: { ring: '#eab308', label: 'PIVOT', glow: 'rgba(234, 179, 8, 0.3)' },
          target: { ring: '#a855f7', label: 'TARGET', glow: 'rgba(168, 85, 247, 0.3)' },
        };
        const roleInfo = roleColors[node.role];

        ctx.globalAlpha = alpha;

        // Simulation pulse on current step node
        if (isCurrentSimNode) {
          const pulseSize = size + 15 + Math.sin(time * 4) * 8;
          const pulseGrad = ctx.createRadialGradient(node.x, node.y, size, node.x, node.y, pulseSize);
          pulseGrad.addColorStop(0, 'rgba(0, 255, 136, 0.6)');
          pulseGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = pulseGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Selected/blast glow
        if (isSelected) {
          const selGrad = ctx.createRadialGradient(node.x, node.y, size, node.x, node.y, size + 20);
          selGrad.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
          selGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = selGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 20, 0, Math.PI * 2);
          ctx.fill();
        }

        // Role ring
        if (roleInfo) {
          ctx.fillStyle = roleInfo.glow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = roleInfo.ring;
          ctx.lineWidth = isActiveSimNode ? 3 : 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Main circle
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();

        if (node.risk === 'Critical') {
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Risk propagation % label
        if (currentSelected && graphData?.risk_propagation?.[node.id] && isInBlast) {
          const prob = graphData.risk_propagation[node.id].probability;
          ctx.fillStyle = prob > 50 ? '#ef4444' : prob > 20 ? '#f59e0b' : '#22c55e';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${prob}%`, node.x, node.y + 4);
        }

        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.label.split('\n')[0], node.x, node.y - size - 12);

        if (roleInfo) {
          ctx.fillStyle = roleInfo.ring;
          ctx.font = 'bold 9px Arial';
          ctx.fillText(roleInfo.label, node.x, node.y + size + 14);
        }

        // Blast radius badge
        if (isSelected && graphData?.blast_radii?.[node.id]) {
          const br = graphData.blast_radii[node.id];
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`BLAST: ${br.reachable_count} nodes (${br.percentage}%)`, node.x, node.y + size + 26);
        }

        ctx.globalAlpha = 1.0;
      });

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    // ── Mouse Events ─────────────────────────────────────────────
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check nodes
      let foundNode = null;
      for (let node of nodes) {
        if (Math.hypot(x - node.x, y - node.y) < node.size + 10) {
          foundNode = node;
          break;
        }
      }
      hoveredNodeRef.current = foundNode;
      setHoveredNode(foundNode);

      // Check edges
      if (!foundNode) {
        let foundEdge = null;
        for (let edge of edges) {
          const fromN = nodes.find(n => n.id === edge.from);
          const toN = nodes.find(n => n.id === edge.to);
          if (fromN && toN) {
            const dist = pointToLineDist(x, y, fromN.x, fromN.y, toN.x, toN.y);
            if (dist < 8) {
              foundEdge = edge;
              break;
            }
          }
        }
        hoveredEdgeRef.current = foundEdge;
        setHoveredEdge(foundEdge);
      } else {
        hoveredEdgeRef.current = null;
        setHoveredEdge(null);
      }
    };

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let foundNode = null;
      for (let node of nodes) {
        if (Math.hypot(x - node.x, y - node.y) < node.size + 10) {
          foundNode = node;
          break;
        }
      }

      if (foundNode && selectedNodeRef.current?.id === foundNode.id) {
        selectedNodeRef.current = null;
        setSelectedNode(null);
      } else {
        selectedNodeRef.current = foundNode;
        setSelectedNode(foundNode);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationRef.current);
    };
  }, [graphData, pointToLineDist]);

  const stats = graphData?.statistics || {};
  const simulation = graphData?.simulation || {};
  const mitreData = graphData?.mitre_summary || {};
  const whatIfRecs = graphData?.what_if_recommendations || [];
  const criticalPaths = graphData?.critical_paths || [];

  const startSim = () => { setSimStep(0); setSimPlaying(true); };
  const pauseSim = () => { setSimPlaying(false); };
  const resetSim = () => { setSimPlaying(false); setSimStep(-1); };
  const stepForward = () => {
    if (simulation.steps && simStep < simulation.steps.length - 1) setSimStep(s => s + 1);
  };

  return (
    <div className="w-full bg-black border border-red-900/40 overflow-visible">
      {/* Header */}
      <div className="border-b border-red-900/30 p-4 bg-black/50">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-red-500">ATTACK PATH GRAPH</h2>
          {exposure && (
            <div className="flex gap-6 items-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${exposure.severity === 'CRITICAL' ? 'text-red-500' : exposure.severity === 'HIGH' ? 'text-orange-500' : 'text-yellow-500'}`}>
                  {exposure.exposure_score}
                </div>
                <div className="text-xs text-gray-400">Exposure Score</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${exposure.severity === 'CRITICAL' ? 'text-red-500' : exposure.severity === 'HIGH' ? 'text-orange-500' : 'text-yellow-500'}`}>
                  {exposure.severity}
                </div>
                <div className="text-xs text-gray-400">Severity</div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-2 text-xs mt-2">
          <div className="bg-red-950/30 p-2 rounded border border-red-900/30 text-center">
            <div className="text-red-400 font-bold text-base">{stats.critical_services || 0}</div>
            <div className="text-gray-500">Critical</div>
          </div>
          <div className="bg-orange-950/30 p-2 rounded border border-orange-900/30 text-center">
            <div className="text-orange-400 font-bold text-base">{stats.high_risk_services || 0}</div>
            <div className="text-gray-500">High Risk</div>
          </div>
          <div className="bg-yellow-950/30 p-2 rounded border border-yellow-900/30 text-center">
            <div className="text-yellow-400 font-bold text-base">{stats.total_nodes || 0}</div>
            <div className="text-gray-500">Services</div>
          </div>
          <div className="bg-green-950/30 p-2 rounded border border-green-900/30 text-center">
            <div className="text-green-400 font-bold text-base">{stats.lateral_movement_paths || 0}</div>
            <div className="text-gray-500">Lateral Paths</div>
          </div>
          <div className="bg-blue-950/30 p-2 rounded border border-blue-900/30 text-center">
            <div className="text-blue-400 font-bold text-base">{stats.total_edges || 0}</div>
            <div className="text-gray-500">Connections</div>
          </div>
        </div>
      </div>

      {/* ── Simulation Controls ── */}
      {simulation.steps && simulation.steps.length > 0 && (
        <div className="border-b border-red-900/30 p-3 bg-gradient-to-r from-green-950/30 to-black flex flex-wrap items-center gap-4">
          <span className="text-green-400 font-bold text-sm tracking-wider">ATTACK SIMULATION</span>
          <button onClick={startSim} disabled={simPlaying}
            className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-black text-xs font-bold disabled:opacity-30">
            START
          </button>
          <button onClick={pauseSim} disabled={!simPlaying}
            className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold disabled:opacity-30">
            PAUSE
          </button>
          <button onClick={stepForward}
            className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold ml-2 mr-2">
            STEPS
          </button>
          <button onClick={resetSim}
            className="px-4 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold">
            RESET
          </button>
          <div className="ml-auto text-xs text-gray-400">
            Steps {simStep + 1} / {simulation.steps.length}
            {simStep >= 0 && simulation.steps[simStep] && (
              <span className="ml-2 text-green-400">{simulation.steps[simStep].action}: {simulation.steps[simStep].service}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Simulation Step Description ── */}
      {simStep >= 0 && simulation.steps?.[simStep] && (
        <div className="border-b border-green-900/30 px-4 py-2 bg-green-950/20 text-sm">
          <span className="text-green-400 font-bold mr-2">STEP {simStep + 1}:</span>
          <span className="text-gray-300">{simulation.steps[simStep].description}</span>
          {simulation.steps[simStep].mitre_id && (
            <span className="ml-3 px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 text-xs font-mono">
              {simulation.steps[simStep].mitre_id}
            </span>
          )}
          {simulation.steps[simStep].technique && (
            <span className="ml-2 text-purple-400 text-xs">({simulation.steps[simStep].technique})</span>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="relative bg-black/80 overflow-hidden" style={{ height: '380px' }}>
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />

        {/* Edge Hover Tooltip */}
        {hoveredEdge && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/90 border border-white/20 rounded-lg p-3 text-sm max-w-md z-10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              {hoveredEdge.mitre_id && (
                <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono text-xs font-bold">
                  {hoveredEdge.mitre_id}
                </span>
              )}
              <span className="text-white font-bold">{hoveredEdge.technique || hoveredEdge.type}</span>
              <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${
                hoveredEdge.category === 'credential_reuse' ? 'bg-red-900/50 text-red-300' :
                hoveredEdge.category === 'exploitation' ? 'bg-orange-900/50 text-orange-300' :
                hoveredEdge.category === 'tunneling' ? 'bg-blue-900/50 text-blue-300' :
                hoveredEdge.category === 'exfiltration' ? 'bg-purple-900/50 text-purple-300' :
                'bg-gray-800 text-gray-300'
              }`}>
                {hoveredEdge.category?.toUpperCase()}
              </span>
            </div>
            <div className="text-gray-300 text-xs">{hoveredEdge.label}</div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-red-400">Risk: {hoveredEdge.risk_score}/10</span>
              <span className="text-yellow-400">Difficulty: {hoveredEdge.difficulty}/7</span>
            </div>
          </div>
        )}

        {/* Node Info Panel */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-3 right-3 bg-black/90 border border-green-900/30 rounded-lg p-4 text-sm max-w-xs backdrop-blur-sm">
            <div className="text-green-400 font-bold mb-2 text-base">{hoveredNode.service}</div>
            <div className="space-y-1 text-gray-300 text-xs">
              <div><span className="text-green-400">Port:</span> {hoveredNode.port}</div>
              <div><span className="text-green-400">Risk:</span> {hoveredNode.risk}</div>
              <div><span className="text-green-400">Role:</span> {hoveredNode.role?.toUpperCase()}</div>
              {graphData?.blast_radii?.[hoveredNode.id] && (
                <div><span className="text-red-400">Blast Radius:</span> {graphData.blast_radii[hoveredNode.id].reachable_count} nodes ({graphData.blast_radii[hoveredNode.id].percentage}%)</div>
              )}
            </div>
            <div className="text-gray-500 text-xs mt-2 italic">Click to see blast radius</div>
          </div>
        )}

        {/* Selected Node / Blast Radius Panel */}
        {selectedNode && (
          <div className="absolute top-3 right-3 bg-black/90 border border-red-600/50 rounded-lg p-4 text-sm max-w-xs backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="text-red-400 font-bold text-base">BLAST RADIUS</div>
              <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white text-xs">✕ Close</button>
            </div>
            <div className="text-white font-bold">{selectedNode.service} (Port {selectedNode.port})</div>
            {graphData?.blast_radii?.[selectedNode.id] && (
              <div className="mt-2 space-y-1 text-xs">
                <div className="text-red-400">Reachable: {graphData.blast_radii[selectedNode.id].reachable_count} nodes</div>
                <div className="text-orange-400">Coverage: {graphData.blast_radii[selectedNode.id].percentage}% of network</div>
                <div className={`font-bold ${
                  graphData.blast_radii[selectedNode.id].severity === 'critical' ? 'text-red-500' :
                  graphData.blast_radii[selectedNode.id].severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                }`}>
                  Severity: {graphData.blast_radii[selectedNode.id].severity?.toUpperCase()}
                </div>
              </div>
            )}
            {graphData?.risk_propagation?.[selectedNode.id] && (
              <div className="mt-2 text-xs text-gray-400">
                Compromise probability shown on each node
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-black/80 border border-red-900/30 rounded p-3 text-xs">
          <div className="text-red-400 font-bold mb-1">Edge Colors = Attack Category:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1"><div className="w-3 h-1 bg-red-500 rounded"></div><span className="text-gray-400">Credential Reuse</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-1 bg-orange-500 rounded"></div><span className="text-gray-400">Exploitation</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-1 bg-blue-500 rounded"></div><span className="text-gray-400">Tunneling</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-1 bg-purple-500 rounded"></div><span className="text-gray-400">Exfiltration</span></div>
          </div>
          <div className="mt-1 text-gray-500 italic">Solid = Lateral | Dashed = Horizontal</div>
        </div>
      </div>

      {/* ── Tabbed Bottom Panel ── */}
      <div className="border-t border-red-900/30 bg-black/50">
        <div className="flex border-b border-red-900/20">
          {['chains', 'paths', 'mitre', 'cve', 'whatif'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold tracking-wider transition-colors ${
                activeTab === tab ? 'text-red-400 border-b-2 border-red-500 bg-red-950/20' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {tab === 'chains' ? 'ATTACK CHAINS' : tab === 'paths' ? 'CRITICAL PATHS' : tab === 'mitre' ? 'MITRE ATT&CK' : tab === 'cve' ? `CVE DATABASE${cveData?.total_cves ? ` (${cveData.total_cves})` : ''}` : 'WHAT-IF'}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-64 overflow-y-auto">
          {/* CHAINS TAB */}
          {activeTab === 'chains' && attackChains?.chains && (
            <div>
              {attackChains.classification && (
                <div className="flex gap-3 mb-3">
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/50 border border-cyan-800/40">
                    <span className="text-cyan-400 text-xs font-bold">⬤</span>
                    <span className="text-xs text-gray-300">{attackChains.classification.entry_points || 0} Entry</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-950/50 border border-yellow-800/40">
                    <span className="text-yellow-400 text-xs font-bold">⬤</span>
                    <span className="text-xs text-gray-300">{attackChains.classification.pivot_nodes || 0} Pivot</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-950/50 border border-purple-800/40">
                    <span className="text-purple-400 text-xs font-bold">⬤</span>
                    <span className="text-xs text-gray-300">{attackChains.classification.target_nodes || 0} Target</span>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {attackChains.chains.slice(0, 10).map((chain, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-red-950/10 p-2 rounded border border-red-900/20" title={chain.description}>
                    <span className={`font-bold shrink-0 ${chain.type === 'lateral_movement' ? 'text-red-400' : 'text-orange-400'}`}>
                      {chain.type === 'lateral_movement' ? '⤷' : '↔'}
                    </span>
                    <span className="text-gray-300 flex-1">{chain.from} → {chain.to}</span>
                    {chain.mitre_id && <span className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 text-xs font-mono shrink-0">{chain.mitre_id}</span>}
                    <span className="text-red-400 text-xs shrink-0">{chain.risk_score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CRITICAL PATHS TAB */}
          {activeTab === 'paths' && criticalPaths.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 mb-2">Paths found using BFS (shortest) and Dijkstra (deadliest) algorithms</div>
              {criticalPaths.slice(0, 6).map((path, i) => (
                <div key={i} className={`p-2 rounded border text-sm ${path.type === 'deadliest' ? 'bg-red-950/20 border-red-800/40' : 'bg-blue-950/20 border-blue-800/40'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${path.type === 'deadliest' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                      {path.type === 'deadliest' ? 'x DEADLIEST' : '// SHORTEST'}
                    </span>
                    <span className="text-gray-400 text-xs">{path.hops} hops | Risk: {path.total_risk}</span>
                  </div>
                  <div className="text-gray-300 font-mono text-xs">
                    {path.path.map(p => p.replace('port_', ':')).join(' → ')}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">{path.from_service} → {path.to_service}</div>
                </div>
              ))}
            </div>
          )}

          {/* MITRE ATT&CK TAB */}
          {activeTab === 'mitre' && mitreData.techniques && (
            <div>
              <div className="text-xs text-gray-400 mb-3">{mitreData.total_unique_techniques} unique techniques detected across all attack paths</div>
              {/* Category breakdown */}
              {mitreData.categories && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {Object.entries(mitreData.categories).map(([cat, count]) => (
                    <div key={cat} className={`px-2 py-1 rounded text-xs font-bold ${
                      cat === 'credential_reuse' ? 'bg-red-900/40 text-red-300' :
                      cat === 'exploitation' ? 'bg-orange-900/40 text-orange-300' :
                      cat === 'tunneling' ? 'bg-blue-900/40 text-blue-300' :
                      cat === 'exfiltration' ? 'bg-purple-900/40 text-purple-300' :
                      cat === 'credential_theft' ? 'bg-pink-900/40 text-pink-300' :
                      'bg-green-900/40 text-green-300'
                    }`}>
                      {cat.replace('_', ' ').toUpperCase()}: {count}
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                {mitreData.techniques.map((tech, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 bg-gray-900/50 rounded text-sm">
                    <span className="px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded font-mono text-xs font-bold w-24 text-center">{tech.id}</span>
                    <span className="text-gray-300 flex-1">{tech.name}</span>
                    <span className="text-gray-500 text-xs">{tech.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHAT-IF TAB */}
          {activeTab === 'whatif' && whatIfRecs.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-3">Top ports to close for maximum attack surface reduction:</div>
              <div className="space-y-2">
                {whatIfRecs.map((rec, i) => (
                  <div key={i} className="p-3 rounded bg-gradient-to-r from-red-950/30 to-black border border-red-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-red-400">#{i + 1}</span>
                      <span className="text-white font-bold">Port {rec.removed_port} ({rec.removed_service})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div className="text-center">
                        <div className="text-red-400 font-bold text-base">{rec.paths_eliminated}</div>
                        <div className="text-gray-500">Paths Eliminated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-orange-400 font-bold text-base">-{rec.exposure_reduction} pts</div>
                        <div className="text-gray-500">Exposure Drop</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400 font-bold text-base">{rec.remaining_paths}</div>
                        <div className="text-gray-500">Remaining</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CVE DATABASE TAB */}
          {activeTab === 'cve' && (
            <div>
              {cveData && cveData.total_cves > 0 ? (
                <>
                  {/* CVE Summary Badges */}
                  <div className="flex gap-3 mb-4 flex-wrap">
                    <div className="px-3 py-1.5 rounded bg-red-950/40 border border-red-800/40">
                      <span className="text-red-400 font-bold text-lg mr-1">{cveData.critical_cves || 0}</span>
                      <span className="text-xs text-gray-400">Critical</span>
                    </div>
                    <div className="px-3 py-1.5 rounded bg-orange-950/40 border border-orange-800/40">
                      <span className="text-orange-400 font-bold text-lg mr-1">{cveData.high_cves || 0}</span>
                      <span className="text-xs text-gray-400">High</span>
                    </div>
                    <div className="px-3 py-1.5 rounded bg-yellow-950/40 border border-yellow-800/40">
                      <span className="text-yellow-400 font-bold text-lg mr-1">{cveData.medium_cves || 0}</span>
                      <span className="text-xs text-gray-400">Medium</span>
                    </div>
                    <div className="ml-auto px-3 py-1.5 rounded bg-gray-900 border border-gray-700">
                      <span className="text-white font-bold text-lg mr-1">{cveData.total_cves}</span>
                      <span className="text-xs text-gray-400">Total CVEs</span>
                    </div>
                  </div>

                  {/* CVE List */}
                  <div className="space-y-2">
                    {cveData.all_cves?.map((cve, i) => (
                      <div key={i} className={`p-3 rounded border text-sm ${
                        cve.severity === 'CRITICAL' ? 'bg-red-950/20 border-red-800/40' :
                        cve.severity === 'HIGH' ? 'bg-orange-950/20 border-orange-800/40' :
                        cve.severity === 'MEDIUM' ? 'bg-yellow-950/20 border-yellow-800/40' :
                        'bg-green-950/20 border-green-800/40'
                      }`}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <a href={cve.url} target="_blank" rel="noopener noreferrer"
                            className="font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline">
                            {cve.id}
                          </a>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            cve.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                            cve.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                            cve.severity === 'MEDIUM' ? 'bg-yellow-600 text-black' :
                            'bg-green-600 text-white'
                          }`}>
                            {cve.severity}
                          </span>
                          <span className="text-white font-bold">CVSS {cve.score}</span>
                          <span className="text-gray-500 text-xs ml-auto">Port {cve.port} • {cve.service}</span>
                        </div>
                        <div className="text-gray-400 text-xs mt-1">{cve.description}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <div className="text-2xl mb-2" style={{fontFamily:'monospace',color:'white'}}>[ ? ]</div>
                  <div className="text-sm">{cveData ? 'No CVEs found for discovered services' : 'CVE data will appear after scan completes'}</div>
                  <div className="text-xs text-gray-600 mt-1">Powered by NIST National Vulnerability Database (NVD)</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphView;
