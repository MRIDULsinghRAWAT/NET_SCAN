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

      // ── DRAW ──
      // Deep blue background matching theme
      ctx.fillStyle = '#021024';
      ctx.fillRect(0, 0, width, height);

      // Subtle grid in deep navy
      ctx.strokeStyle = 'rgba(84, 131, 179, 0.04)';
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

      const blastNodes = new Set();
      if (currentSelected && graphData.blast_radii) {
        const br = graphData.blast_radii[currentSelected.id];
        if (br) br.reachable_nodes.forEach(id => blastNodes.add(id));
        blastNodes.add(currentSelected.id);
      }

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

      // ── Draw Edges ──
      edges.forEach((edge) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const isSimEdge = simEdgeSet.has(`${edge.from}->${edge.to}`);
        const isActiveSimEdge = activeSimEdges.has(edge.id);
        const isHoveredEdge = currentHoveredEdge?.id === edge.id;
        const isBlastEdge = currentSelected && blastNodes.has(edge.from) && blastNodes.has(edge.to);

        let lineWidth = 1 + (edge.risk_score || 5) / 4;
        let strokeColor = 'rgba(84, 131, 179, 0.25)';
        let dashPattern = [];

        if (edge.type === 'horizontal_movement') dashPattern = [6, 4];

        const catColors = {
          credential_reuse: 'rgba(239, 68, 68, 0.5)',
          exploitation: 'rgba(249, 115, 22, 0.5)',
          tunneling: 'rgba(84, 131, 179, 0.5)',
          exfiltration: 'rgba(168, 85, 247, 0.5)',
          credential_theft: 'rgba(236, 72, 153, 0.5)',
          discovery: 'rgba(125, 160, 202, 0.5)',
        };
        if (edge.category && catColors[edge.category]) {
          strokeColor = catColors[edge.category];
        }

        if (isHoveredEdge) {
          lineWidth = 4;
          strokeColor = '#C1E8FF';
        } else if (isActiveSimEdge) {
          lineWidth = 4;
          strokeColor = '#7DA0CA';
        } else if (isSimEdge && currentSimStep >= 0) {
          strokeColor = 'rgba(125, 160, 202, 0.3)';
        } else if (isBlastEdge) {
          strokeColor = 'rgba(239, 68, 68, 0.7)';
          lineWidth = 3;
        } else if (currentSelected && !isBlastEdge) {
          strokeColor = 'rgba(5, 38, 89, 0.3)';
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

        // Arrow
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const arrowSize = 12;
        const arrowDist = (toNode.size || 12) + 8;
        const arrowX = toNode.x - Math.cos(angle) * arrowDist;
        const arrowY = toNode.y - Math.sin(angle) * arrowDist;

        ctx.fillStyle = isActiveSimEdge ? '#7DA0CA' : isHoveredEdge ? '#C1E8FF' :
          edge.type === 'lateral_movement' ? '#FF6B8A' : '#5483B3';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle - 0.5), arrowY - arrowSize * Math.sin(angle - 0.5));
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle + 0.5), arrowY - arrowSize * Math.sin(angle + 0.5));
        ctx.closePath();
        ctx.fill();

        // Flowing dot
        if (!currentSelected || isBlastEdge || isActiveSimEdge) {
          const speed = 0.4;
          const t = ((time * speed) + edge.risk_score * 0.1) % 1;
          const dotX = fromNode.x + (toNode.x - fromNode.x) * t;
          const dotY = fromNode.y + (toNode.y - fromNode.y) * t;

          const dotColor = isActiveSimEdge ? '#7DA0CA' :
            edge.type === 'lateral_movement' ? '#FF6B8A' : '#5483B3';

          const gradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 10);
          gradient.addColorStop(0, dotColor);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // ── Draw Nodes ──
      nodes.forEach((node) => {
        const isHovered = currentHovered?.id === node.id;
        const isSelected = currentSelected?.id === node.id;
        const isInBlast = blastNodes.has(node.id);
        const isSimNode = simPathIds.has(node.id);
        const isActiveSimNode = activeSimNodes.has(node.id);
        const isCurrentSimNode = currentSimStep >= 0 && graphData?.simulation?.steps?.[currentSimStep]?.node_id === node.id;

        let size = isHovered || isSelected ? node.size * 1.5 : node.size;
        let alpha = 1.0;

        if (currentSelected && !isInBlast) alpha = 0.15;

        const roleColors = {
          entry: { ring: '#5483B3', label: 'ENTRY', glow: 'rgba(84, 131, 179, 0.3)' },
          pivot: { ring: '#7DA0CA', label: 'PIVOT', glow: 'rgba(125, 160, 202, 0.3)' },
          target: { ring: '#C1E8FF', label: 'TARGET', glow: 'rgba(193, 232, 255, 0.3)' },
        };
        const roleInfo = roleColors[node.role];

        ctx.globalAlpha = alpha;

        if (isCurrentSimNode) {
          const pulseSize = size + 15 + Math.sin(time * 4) * 8;
          const pulseGrad = ctx.createRadialGradient(node.x, node.y, size, node.x, node.y, pulseSize);
          pulseGrad.addColorStop(0, 'rgba(125, 160, 202, 0.6)');
          pulseGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = pulseGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isSelected) {
          const selGrad = ctx.createRadialGradient(node.x, node.y, size, node.x, node.y, size + 20);
          selGrad.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
          selGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = selGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 20, 0, Math.PI * 2);
          ctx.fill();
        }

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

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();

        if (node.risk === 'Critical') {
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(84, 131, 179, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (currentSelected && graphData?.risk_propagation?.[node.id] && isInBlast) {
          const prob = graphData.risk_propagation[node.id].probability;
          ctx.fillStyle = prob > 50 ? '#ef4444' : prob > 20 ? '#f59e0b' : '#22c55e';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${prob}%`, node.x, node.y + 4);
        }

        ctx.fillStyle = '#C1E8FF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.label.split('\n')[0], node.x, node.y - size - 12);

        if (roleInfo) {
          ctx.fillStyle = roleInfo.ring;
          ctx.font = 'bold 9px Arial';
          ctx.fillText(roleInfo.label, node.x, node.y + size + 14);
        }

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

    // Mouse Events
    const handleMouseMove = (e) => {
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
      hoveredNodeRef.current = foundNode;
      setHoveredNode(foundNode);

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

  /* ═══ Glass stat card style helper ═══ */
  const glassStatMini = {
    background: 'rgba(5, 38, 89, 0.35)',
    border: '1px solid rgba(84, 131, 179, 0.18)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 1px 0 rgba(193, 232, 255, 0.04)',
  };

  const glassTooltip = {
    background: 'rgba(2, 16, 36, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(84, 131, 179, 0.2)',
    borderRadius: '14px',
    boxShadow: '0 8px 40px rgba(2, 16, 36, 0.6)',
  };

  return (
    <div className="w-full overflow-visible" style={{
      background: 'rgba(2, 16, 36, 0.45)',
      border: '1px solid rgba(84, 131, 179, 0.15)',
      borderRadius: '18px',
      backdropFilter: 'blur(18px)',
      boxShadow: '0 0 50px rgba(5, 38, 89, 0.4)',
    }}>
      {/* ═══ HEADER — Two Column: Stats Left + Exposure Gauge Right ═══ */}
      <div className="p-5" style={{
        borderBottom: '1px solid rgba(84, 131, 179, 0.15)',
        background: 'linear-gradient(135deg, rgba(5, 38, 89, 0.5) 0%, rgba(2, 16, 36, 0.6) 50%, rgba(5, 38, 89, 0.3) 100%)',
        backdropFilter: 'blur(14px)',
        borderRadius: '18px 18px 0 0',
      }}>
        <div className="flex gap-5 items-start flex-wrap">
          {/* ─── LEFT: Title + Stats ─── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #C1E8FF, #5483B3)' }}></div>
              <div>
                <h2 className="text-2xl font-black tracking-wide" style={{ background: 'linear-gradient(90deg, #C1E8FF, #7DA0CA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ATTACK PATH GRAPH</h2>
                <div className="text-xs mt-0.5" style={{ color: '#5483B3' }}>Kill Chain Topology & Lateral Movement Analysis</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 text-center hover:scale-[1.04] transition-all cursor-default relative overflow-hidden group" style={{ ...glassStatMini, borderColor: 'rgba(239, 107, 138, 0.25)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at center, rgba(239,107,138,0.08) 0%, transparent 70%)' }}></div>
                <div className="font-black text-xl relative" style={{ color: '#FF6B8A' }}>{stats.critical_services || 0}</div>
                <div className="font-semibold" style={{ color: '#5483B3' }}>Critical</div>
              </div>
              <div className="p-2.5 text-center hover:scale-[1.04] transition-all cursor-default relative overflow-hidden group" style={{ ...glassStatMini, borderColor: 'rgba(249, 115, 22, 0.25)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at center, rgba(249,115,22,0.08) 0%, transparent 70%)' }}></div>
                <div className="text-orange-400 font-black text-xl relative">{stats.high_risk_services || 0}</div>
                <div className="font-semibold" style={{ color: '#5483B3' }}>High Risk</div>
              </div>
              <div className="p-2.5 text-center hover:scale-[1.04] transition-all cursor-default relative overflow-hidden group" style={{ ...glassStatMini }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at center, rgba(193,232,255,0.06) 0%, transparent 70%)' }}></div>
                <div className="font-black text-xl relative" style={{ color: '#C1E8FF' }}>{stats.total_nodes || 0}</div>
                <div className="font-semibold" style={{ color: '#5483B3' }}>Services</div>
              </div>
              <div className="p-2.5 text-center hover:scale-[1.04] transition-all cursor-default relative overflow-hidden group" style={{ ...glassStatMini }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at center, rgba(193,232,255,0.06) 0%, transparent 70%)' }}></div>
                <div className="font-black text-xl relative" style={{ color: '#C1E8FF' }}>{stats.lateral_movement_paths || 0}</div>
                <div className="font-semibold" style={{ color: '#5483B3' }}>Lateral Paths</div>
              </div>
              <div className="p-2.5 text-center hover:scale-[1.04] transition-all cursor-default relative overflow-hidden group" style={{ ...glassStatMini }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at center, rgba(125,160,202,0.06) 0%, transparent 70%)' }}></div>
                <div className="font-black text-xl relative" style={{ color: '#7DA0CA' }}>{stats.total_edges || 0}</div>
                <div className="font-semibold" style={{ color: '#5483B3' }}>Connections</div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Exposure Gauge + Scoring Rules ─── */}
          {exposure && (
            <div className="flex-shrink-0 flex items-stretch gap-3">
              {/* Gauge Card */}
              <div className="flex flex-col items-center justify-center relative p-5 rounded-2xl" style={{
                width: '160px',
                minWidth: '160px',
                background: 'rgba(2, 16, 36, 0.6)',
                border: '1px solid rgba(84, 131, 179, 0.2)',
                boxShadow: `0 0 40px ${exposure.severity === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : exposure.severity === 'HIGH' ? 'rgba(249,115,22,0.12)' : 'rgba(234,179,8,0.1)'}, inset 0 1px 0 rgba(193,232,255,0.05)`,
              }}>
                <div className="absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(circle at 50% 40%, ${exposure.severity === 'CRITICAL' ? 'rgba(239,68,68,0.08)' : exposure.severity === 'HIGH' ? 'rgba(249,115,22,0.06)' : 'rgba(234,179,8,0.05)'} 0%, transparent 70%)` }}></div>
                {/* EXPOSURE label */}
                <div className="font-bold tracking-[0.25em] mb-3 relative" style={{ fontSize: '9px', color: '#5483B3' }}>EXPOSURE</div>
                {/* Ring — empty donut, no text inside */}
                <div className="relative" style={{ width: 80, height: 80 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(84,131,179,0.12)" strokeWidth="5" />
                    <circle cx="40" cy="40" r="34" fill="none"
                      stroke={exposure.severity === 'CRITICAL' ? '#ef4444' : exposure.severity === 'HIGH' ? '#f97316' : '#eab308'}
                      strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${Math.min(exposure.exposure_score, 100) / 100 * 213.6} 213.6`}
                      style={{ filter: `drop-shadow(0 0 6px ${exposure.severity === 'CRITICAL' ? 'rgba(239,68,68,0.5)' : exposure.severity === 'HIGH' ? 'rgba(249,115,22,0.4)' : 'rgba(234,179,8,0.35)'})` }}
                    />
                  </svg>
                </div>
                {/* Score number — below ring, own line */}
                <div className="font-black mt-3 relative text-center" style={{
                  fontSize: '30px',
                  lineHeight: '1',
                  letterSpacing: '2px',
                  color: exposure.severity === 'CRITICAL' ? '#ef4444' : exposure.severity === 'HIGH' ? '#f97316' : '#eab308',
                  textShadow: `0 0 14px ${exposure.severity === 'CRITICAL' ? 'rgba(239,68,68,0.4)' : exposure.severity === 'HIGH' ? 'rgba(249,115,22,0.3)' : 'rgba(234,179,8,0.25)'}`,
                }}>
                  {exposure.exposure_score}
                </div>
                {/* Severity badge — separate line below score */}
                <div className="mt-2 px-4 py-1 rounded-full font-black tracking-widest relative" style={{
                  fontSize: '10px',
                  background: exposure.severity === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : exposure.severity === 'HIGH' ? 'rgba(249,115,22,0.12)' : 'rgba(234,179,8,0.1)',
                  border: `1px solid ${exposure.severity === 'CRITICAL' ? 'rgba(239,68,68,0.3)' : exposure.severity === 'HIGH' ? 'rgba(249,115,22,0.25)' : 'rgba(234,179,8,0.2)'}`,
                  color: exposure.severity === 'CRITICAL' ? '#ef4444' : exposure.severity === 'HIGH' ? '#f97316' : '#eab308',
                }}>
                  {exposure.severity}
                </div>
              </div>

              {/* Scoring Rules Card */}
              <div className="p-4 rounded-2xl flex flex-col" style={{
                background: 'rgba(2, 16, 36, 0.5)',
                border: '1px solid rgba(84, 131, 179, 0.15)',
                boxShadow: 'inset 0 1px 0 rgba(193,232,255,0.04)',
              }}>
                <div>
                  <div className="text-[10px] font-bold tracking-[0.15em] mb-3" style={{ color: '#5483B3' }}>SCORING CRITERIA</div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { color: '#ef4444', text: 'Open ports with critical CVEs' },
                      { color: '#f97316', text: 'Lateral movement path count' },
                      { color: '#eab308', text: 'Service vulnerability severity' },
                      { color: '#5483B3', text: 'Blast radius coverage %' },
                      { color: '#7DA0CA', text: 'Network topology depth' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{
                        background: 'rgba(5, 38, 89, 0.4)',
                        border: '1px solid rgba(84, 131, 179, 0.12)',
                      }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }}></div>
                        <span className="text-[11px] font-medium" style={{ color: '#7DA0CA' }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2.5 mt-3" style={{ borderTop: '1px solid rgba(84,131,179,0.1)' }}>
                  <div className="flex gap-3 justify-between text-[10px] font-bold">
                    <span style={{ color: '#22c55e' }}>0-30 LOW</span>
                    <span style={{ color: '#eab308' }}>31-60 MED</span>
                    <span style={{ color: '#f97316' }}>61-80 HIGH</span>
                    <span style={{ color: '#ef4444' }}>81+ CRIT</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Simulation Controls ── */}
      {simulation.steps && simulation.steps.length > 0 && (
        <div className="px-5 py-3" style={{
          borderBottom: '1px solid rgba(84, 131, 179, 0.15)',
          background: 'linear-gradient(90deg, rgba(5, 38, 89, 0.3) 0%, rgba(2, 16, 36, 0.4) 100%)',
          backdropFilter: 'blur(10px)',
        }}>
          {/* Label */}
          <div className="font-bold text-xs tracking-[0.2em] mb-2.5" style={{ color: '#5483B3' }}>ATTACK SIMULATION</div>

          {/* Controls Row */}
          <div className="flex items-center gap-3">
            {/* Glass Pill: START + PAUSE + RESET */}
            <div className="flex items-center rounded-xl overflow-hidden" style={{
              background: 'rgba(5, 38, 89, 0.35)',
              border: '1px solid rgba(84, 131, 179, 0.25)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 4px 20px rgba(2,16,36,0.4), inset 0 1px 0 rgba(193,232,255,0.06)',
            }}>
              <button onClick={startSim} disabled={simPlaying}
                className="px-5 py-2 text-xs font-bold tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
                style={{ color: '#C1E8FF', borderRight: '1px solid rgba(84,131,179,0.2)' }}>
                {simStep >= 0 && !simPlaying ? 'RESUME' : 'START'}
              </button>
              <button onClick={pauseSim} disabled={!simPlaying}
                className="px-5 py-2 text-xs font-bold tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
                style={{ color: '#eab308', borderRight: '1px solid rgba(84,131,179,0.2)' }}>
                PAUSE
              </button>
              <button onClick={resetSim}
                className="px-5 py-2 text-xs font-bold tracking-wider transition-all hover:bg-white/5"
                style={{ color: '#7DA0CA' }}>
                ↺ RESET
              </button>
            </div>

            {/* Step Forward — standalone glass */}
            <button onClick={stepForward}
              className="glass-btn px-4 py-2 rounded-xl text-xs font-bold">
              STEP →
            </button>

            {/* Step Info */}
            <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: '#5483B3' }}>
              <span className="font-mono">{simStep + 1} / {simulation.steps.length}</span>
              {simStep >= 0 && simulation.steps[simStep] && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(5,38,89,0.4)', border: '1px solid rgba(84,131,179,0.15)', color: '#C1E8FF' }}>
                  {simulation.steps[simStep].action}: {simulation.steps[simStep].service}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Simulation Step Description ── */}
      {simStep >= 0 && simulation.steps?.[simStep] && (
        <div className="px-4 py-2 text-sm" style={{
          borderBottom: '1px solid rgba(84, 131, 179, 0.1)',
          background: 'rgba(5, 38, 89, 0.2)',
        }}>
          <span className="font-bold mr-2" style={{ color: '#7DA0CA' }}>STEP {simStep + 1}:</span>
          <span style={{ color: '#C1E8FF' }}>{simulation.steps[simStep].description}</span>
          {simulation.steps[simStep].mitre_id && (
            <span className="ml-3 px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(84, 131, 179, 0.2)', color: '#7DA0CA' }}>
              {simulation.steps[simStep].mitre_id}
            </span>
          )}
          {simulation.steps[simStep].technique && (
            <span className="ml-2 text-xs" style={{ color: '#5483B3' }}>({simulation.steps[simStep].technique})</span>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="relative overflow-hidden" style={{ height: '480px', background: '#021024' }}>
        {/* Atmospheric glow orbs behind canvas */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ top: '10%', left: '15%', background: 'radial-gradient(circle, rgba(84,131,179,0.5) 0%, transparent 70%)' }}></div>
          <div className="absolute w-48 h-48 rounded-full blur-[80px] opacity-15" style={{ bottom: '15%', right: '20%', background: 'radial-gradient(circle, rgba(5,38,89,0.7) 0%, transparent 70%)' }}></div>
          <div className="absolute w-32 h-32 rounded-full blur-[60px] opacity-10" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle, rgba(193,232,255,0.3) 0%, transparent 70%)' }}></div>
        </div>
        {/* Vignette overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(2,16,36,0.5) 100%)' }}></div>
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" style={{ position: 'relative', zIndex: 2 }} />

        {/* Edge Hover Tooltip */}
        {hoveredEdge && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 p-3 text-sm max-w-md z-10" style={glassTooltip}>
            <div className="flex items-center gap-2 mb-2">
              {hoveredEdge.mitre_id && (
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold" style={{ background: 'rgba(84, 131, 179, 0.3)', color: '#7DA0CA' }}>
                  {hoveredEdge.mitre_id}
                </span>
              )}
              <span className="font-bold" style={{ color: '#C1E8FF' }}>{hoveredEdge.technique || hoveredEdge.type}</span>
              <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${hoveredEdge.category === 'credential_reuse' ? 'bg-red-900/50 text-red-300' :
                  hoveredEdge.category === 'exploitation' ? 'bg-orange-900/50 text-orange-300' :
                    hoveredEdge.category === 'tunneling' ? 'text-white' :
                      hoveredEdge.category === 'exfiltration' ? 'bg-purple-900/50 text-purple-300' :
                        'text-gray-300'
                }`} style={hoveredEdge.category === 'tunneling' ? { background: 'rgba(84,131,179,0.3)' } : {}}>
                {hoveredEdge.category?.toUpperCase()}
              </span>
            </div>
            <div className="text-xs" style={{ color: '#7DA0CA' }}>{hoveredEdge.label}</div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-red-400">Risk: {hoveredEdge.risk_score}/10</span>
              <span style={{ color: '#7DA0CA' }}>Difficulty: {hoveredEdge.difficulty}/7</span>
            </div>
          </div>
        )}

        {/* Node Info Panel */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-3 right-3 p-4 text-sm max-w-xs" style={glassTooltip}>
            <div className="font-bold mb-2 text-base" style={{ color: '#C1E8FF' }}>{hoveredNode.service}</div>
            <div className="space-y-1 text-xs" style={{ color: '#7DA0CA' }}>
              <div><span style={{ color: '#C1E8FF' }}>Port:</span> {hoveredNode.port}</div>
              <div><span style={{ color: '#C1E8FF' }}>Risk:</span> {hoveredNode.risk}</div>
              <div><span style={{ color: '#C1E8FF' }}>Role:</span> {hoveredNode.role?.toUpperCase()}</div>
              {graphData?.blast_radii?.[hoveredNode.id] && (
                <div><span className="text-red-400">Blast Radius:</span> {graphData.blast_radii[hoveredNode.id].reachable_count} nodes ({graphData.blast_radii[hoveredNode.id].percentage}%)</div>
              )}
            </div>
            <div className="text-xs mt-2 italic" style={{ color: '#5483B3' }}>Click to see blast radius</div>
          </div>
        )}

        {/* Selected Node / Blast Radius Panel */}
        {selectedNode && (
          <div className="absolute top-3 right-3 p-4 text-sm max-w-xs" style={{ ...glassTooltip, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="flex justify-between items-center mb-2">
              <div className="text-red-400 font-bold text-base">BLAST RADIUS</div>
              <button onClick={() => setSelectedNode(null)} className="glass-btn px-3 py-1 rounded text-xs">✕ Close</button>
            </div>
            <div className="font-bold" style={{ color: '#C1E8FF' }}>{selectedNode.service} (Port {selectedNode.port})</div>
            {graphData?.blast_radii?.[selectedNode.id] && (
              <div className="mt-2 space-y-1 text-xs">
                <div className="text-red-400">Reachable: {graphData.blast_radii[selectedNode.id].reachable_count} nodes</div>
                <div className="text-orange-400">Coverage: {graphData.blast_radii[selectedNode.id].percentage}% of network</div>
                <div className={`font-bold ${graphData.blast_radii[selectedNode.id].severity === 'critical' ? 'text-red-500' :
                    graphData.blast_radii[selectedNode.id].severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                  }`}>
                  Severity: {graphData.blast_radii[selectedNode.id].severity?.toUpperCase()}
                </div>
              </div>
            )}
            {graphData?.risk_propagation?.[selectedNode.id] && (
              <div className="mt-2 text-xs" style={{ color: '#5483B3' }}>
                Compromise probability shown on each node
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 p-3 text-xs" style={{ ...glassTooltip, borderColor: 'rgba(84, 131, 179, 0.15)' }}>
          <div className="font-bold mb-1" style={{ color: '#C1E8FF' }}>Edge Colors = Attack Category:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1"><div className="w-3 h-1 bg-red-500 rounded"></div><span style={{ color: '#7DA0CA' }}>Credential Reuse</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-1 bg-orange-500 rounded"></div><span style={{ color: '#7DA0CA' }}>Exploitation</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-1 rounded" style={{ background: '#5483B3' }}></div><span style={{ color: '#7DA0CA' }}>Tunneling</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-1 bg-purple-500 rounded"></div><span style={{ color: '#7DA0CA' }}>Exfiltration</span></div>
          </div>
          <div className="mt-1 italic" style={{ color: '#5483B3' }}>Solid = Lateral | Dashed = Horizontal</div>
        </div>
      </div>

      {/* ── Tabbed Bottom Panel ── */}
      <div style={{ borderTop: '1px solid rgba(84, 131, 179, 0.15)', background: 'rgba(2, 16, 36, 0.5)', borderRadius: '0 0 18px 18px' }}>
        <div className="flex" style={{ borderBottom: '1px solid rgba(84, 131, 179, 0.12)', background: 'linear-gradient(90deg, rgba(5, 38, 89, 0.2) 0%, transparent 100%)' }}>
          {['chains', 'paths', 'mitre', 'cve', 'whatif'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-bold tracking-wider transition-all relative group`}
              style={{
                color: activeTab === tab ? '#C1E8FF' : '#5483B3',
                borderBottom: activeTab === tab ? '2px solid #5483B3' : '2px solid transparent',
                background: activeTab === tab ? 'rgba(5, 38, 89, 0.3)' : 'transparent',
              }}>
              {tab === 'chains' ? 'ATTACK CHAINS' : tab === 'paths' ? 'CRITICAL PATHS' : tab === 'mitre' ? 'MITRE ATT&CK' : tab === 'cve' ? `CVE DATABASE${cveData?.total_cves ? ` (${cveData.total_cves})` : ''}` : 'WHAT-IF'}
              <span className="absolute bottom-0 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{ background: 'linear-gradient(90deg, #C1E8FF, #5483B3)' }}></span>
            </button>
          ))}
        </div>

        <div className="p-4 max-h-64 overflow-y-auto custom-scrollbar">
          {/* CHAINS TAB */}
          {activeTab === 'chains' && attackChains?.chains && (
            <div>
              {attackChains.classification && (
                <div className="flex gap-3 mb-3">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(84, 131, 179, 0.15)', border: '1px solid rgba(84, 131, 179, 0.25)' }}>
                    <span className="text-xs font-bold" style={{ color: '#5483B3' }}>⬤</span>
                    <span className="text-xs" style={{ color: '#C1E8FF' }}>{attackChains.classification.entry_points || 0} Entry</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(125, 160, 202, 0.1)', border: '1px solid rgba(125, 160, 202, 0.25)' }}>
                    <span className="text-xs font-bold" style={{ color: '#7DA0CA' }}>⬤</span>
                    <span className="text-xs" style={{ color: '#C1E8FF' }}>{attackChains.classification.pivot_nodes || 0} Pivot</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(193, 232, 255, 0.08)', border: '1px solid rgba(193, 232, 255, 0.2)' }}>
                    <span className="text-xs font-bold" style={{ color: '#C1E8FF' }}>⬤</span>
                    <span className="text-xs" style={{ color: '#C1E8FF' }}>{attackChains.classification.target_nodes || 0} Target</span>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {attackChains.chains.slice(0, 10).map((chain, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg" title={chain.description}
                    style={{ background: 'rgba(5, 38, 89, 0.25)', border: '1px solid rgba(84, 131, 179, 0.12)' }}>
                    <span className={`font-bold shrink-0 ${chain.type === 'lateral_movement' ? 'text-red-400' : 'text-orange-400'}`}>
                      {chain.type === 'lateral_movement' ? '⤷' : '↔'}
                    </span>
                    <span className="flex-1" style={{ color: '#C1E8FF' }}>{chain.from} → {chain.to}</span>
                    {chain.mitre_id && <span className="px-1.5 py-0.5 rounded text-xs font-mono shrink-0" style={{ background: 'rgba(84, 131, 179, 0.25)', color: '#7DA0CA' }}>{chain.mitre_id}</span>}
                    <span className="text-red-400 text-xs shrink-0">{chain.risk_score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CRITICAL PATHS TAB */}
          {activeTab === 'paths' && criticalPaths.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs mb-2" style={{ color: '#5483B3' }}>Paths found using BFS (shortest) and Dijkstra (deadliest) algorithms</div>
              {criticalPaths.slice(0, 6).map((path, i) => (
                <div key={i} className={`p-2 rounded-lg text-sm`} style={{
                  background: path.type === 'deadliest' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(5, 38, 89, 0.3)',
                  border: `1px solid ${path.type === 'deadliest' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(84, 131, 179, 0.15)'}`,
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${path.type === 'deadliest' ? 'bg-red-600 text-white' : 'text-white'}`}
                      style={path.type !== 'deadliest' ? { background: '#052659' } : {}}>
                      {path.type === 'deadliest' ? 'x DEADLIEST' : '// SHORTEST'}
                    </span>
                    <span className="text-xs" style={{ color: '#5483B3' }}>{path.hops} hops | Risk: {path.total_risk}</span>
                  </div>
                  <div className="font-mono text-xs" style={{ color: '#C1E8FF' }}>
                    {path.path.map(p => p.replace('port_', ':')).join(' → ')}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#5483B3' }}>{path.from_service} → {path.to_service}</div>
                </div>
              ))}
            </div>
          )}

          {/* MITRE ATT&CK TAB */}
          {activeTab === 'mitre' && mitreData.techniques && (
            <div>
              <div className="text-xs mb-3" style={{ color: '#5483B3' }}>{mitreData.total_unique_techniques} unique techniques detected across all attack paths</div>
              {mitreData.categories && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {Object.entries(mitreData.categories).map(([cat, count]) => (
                    <div key={cat} className={`px-2 py-1 rounded-lg text-xs font-bold ${cat === 'credential_reuse' ? 'bg-red-900/40 text-red-300' :
                        cat === 'exploitation' ? 'bg-orange-900/40 text-orange-300' :
                          cat === 'tunneling' ? 'text-white' :
                            cat === 'exfiltration' ? 'bg-purple-900/40 text-purple-300' :
                              cat === 'credential_theft' ? 'bg-pink-900/40 text-pink-300' :
                                'text-white'
                      }`} style={['tunneling', 'discovery'].includes(cat) ? { background: 'rgba(84,131,179,0.25)', color: '#C1E8FF' } : {}}>
                      {cat.replace('_', ' ').toUpperCase()}: {count}
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                {mitreData.techniques.map((tech, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg text-sm" style={{ background: 'rgba(5, 38, 89, 0.3)' }}>
                    <span className="px-1.5 py-0.5 rounded font-mono text-xs font-bold w-24 text-center" style={{ background: 'rgba(84, 131, 179, 0.25)', color: '#7DA0CA' }}>{tech.id}</span>
                    <span className="flex-1" style={{ color: '#C1E8FF' }}>{tech.name}</span>
                    <span className="text-xs" style={{ color: '#5483B3' }}>{tech.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHAT-IF TAB */}
          {activeTab === 'whatif' && whatIfRecs.length > 0 && (
            <div>
              <div className="text-xs mb-3" style={{ color: '#5483B3' }}>Top ports to close for maximum attack surface reduction:</div>
              <div className="space-y-2">
                {whatIfRecs.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(2, 16, 36, 0.5) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-red-400">#{i + 1}</span>
                      <span className="font-bold" style={{ color: '#C1E8FF' }}>Port {rec.removed_port} ({rec.removed_service})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div className="text-center">
                        <div className="text-red-400 font-bold text-base">{rec.paths_eliminated}</div>
                        <div style={{ color: '#5483B3' }}>Paths Eliminated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-orange-400 font-bold text-base">-{rec.exposure_reduction} pts</div>
                        <div style={{ color: '#5483B3' }}>Exposure Drop</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-base" style={{ color: '#7DA0CA' }}>{rec.remaining_paths}</div>
                        <div style={{ color: '#5483B3' }}>Remaining</div>
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
                    <div className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <span className="text-red-400 font-bold text-lg mr-1">{cveData.critical_cves || 0}</span>
                      <span className="text-xs" style={{ color: '#5483B3' }}>Critical</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                      <span className="text-orange-400 font-bold text-lg mr-1">{cveData.high_cves || 0}</span>
                      <span className="text-xs" style={{ color: '#5483B3' }}>High</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                      <span className="text-yellow-400 font-bold text-lg mr-1">{cveData.medium_cves || 0}</span>
                      <span className="text-xs" style={{ color: '#5483B3' }}>Medium</span>
                    </div>
                    <div className="ml-auto px-3 py-1.5 rounded-lg" style={glassStatMini}>
                      <span className="font-bold text-lg mr-1" style={{ color: '#C1E8FF' }}>{cveData.total_cves}</span>
                      <span className="text-xs" style={{ color: '#5483B3' }}>Total CVEs</span>
                    </div>
                  </div>

                  {/* CVE List */}
                  <div className="space-y-2">
                    {cveData.all_cves?.map((cve, i) => (
                      <div key={i} className={`p-3 rounded-lg text-sm`} style={{
                        background: cve.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' :
                          cve.severity === 'HIGH' ? 'rgba(249, 115, 22, 0.08)' :
                            cve.severity === 'MEDIUM' ? 'rgba(234, 179, 8, 0.08)' :
                              'rgba(5, 38, 89, 0.3)',
                        border: `1px solid ${cve.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' :
                            cve.severity === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' :
                              cve.severity === 'MEDIUM' ? 'rgba(234, 179, 8, 0.2)' :
                                'rgba(84, 131, 179, 0.15)'
                          }`,
                      }}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <a href={cve.url} target="_blank" rel="noopener noreferrer"
                            className="font-mono font-bold hover:underline" style={{ color: '#7DA0CA' }}>
                            {cve.id}
                          </a>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${cve.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                              cve.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                                cve.severity === 'MEDIUM' ? 'bg-yellow-600 text-black' :
                                  'bg-green-600 text-white'
                            }`}>
                            {cve.severity}
                          </span>
                          <span className="font-bold" style={{ color: '#C1E8FF' }}>CVSS {cve.score}</span>
                          <span className="text-xs ml-auto" style={{ color: '#5483B3' }}>Port {cve.port} • {cve.service}</span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#7DA0CA' }}>{cve.description}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8" style={{ color: '#5483B3' }}>
                  <div className="text-2xl mb-2" style={{ fontFamily: 'monospace', color: '#C1E8FF' }}>[ ? ]</div>
                  <div className="text-sm">{cveData ? 'No CVEs found for discovered services' : 'CVE data will appear after scan completes'}</div>
                  <div className="text-xs mt-1" style={{ color: 'rgba(84, 131, 179, 0.5)' }}>Powered by NIST National Vulnerability Database (NVD)</div>
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
