import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * NetworkTopology Component
 * ─────────────────────────
 * Canvas-based network topology visualizer that shows discovered hosts
 * as nodes and their relationships as edges.
 */
const NetworkTopology = ({ topologyData, subnetInfo }) => {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const hoveredNodeRef = useRef(null);
  const selectedNodeRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const animationRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => { hoveredNodeRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);

  useEffect(() => {
    if (!topologyData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const parent = canvas.parentElement;
    if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    } else {
      canvas.width = 1200;
      canvas.height = 600;
    }
    const width = canvas.width;
    const height = canvas.height;

    const nodes = (topologyData.nodes || []).map(n => ({ ...n }));
    const edges = topologyData.edges || [];
    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Init positions in circle layout
    if (!initializedRef.current) {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.32;
      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        node.x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 30;
        node.y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 30;
        node.vx = 0;
        node.vy = 0;
      });
      initializedRef.current = true;
    }

    let settled = false;
    let frameCount = 0;

    const typeColors = {
      webserver: '#3b82f6',
      database: '#a855f7',
      fileserver: '#eab308',
      server: '#22c55e',
      workstation: '#06b6d4',
      dns: '#f97316',
      mailserver: '#ec4899',
      unknown: '#6b7280',
    };

    const edgeTypeColors = {
      smb: 'rgba(234, 179, 8, 0.5)',
      ssh: 'rgba(34, 197, 94, 0.5)',
      web: 'rgba(59, 130, 246, 0.4)',
      db_access: 'rgba(168, 85, 247, 0.6)',
      remote: 'rgba(239, 68, 68, 0.5)',
      dns: 'rgba(249, 115, 22, 0.3)',
      mail: 'rgba(236, 72, 153, 0.4)',
    };

    const render = () => {
      frameCount++;
      const time = Date.now() / 1000;

      // Physics sim
      if (!settled) {
        nodes.forEach((node) => {
          // Repulsion
          nodes.forEach((other) => {
            if (node === other) return;
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.hypot(dx, dy) || 1;
            const force = 2000 / (dist * dist + 80);
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          });
          // Attraction from edges
          edges.forEach((edge) => {
            let other = null;
            if (edge.from === node.id) other = nodes.find(n => n.id === edge.to);
            else if (edge.to === node.id) other = nodes.find(n => n.id === edge.from);
            if (other) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const dist = Math.hypot(dx, dy) || 1;
              const force = (dist - 200) * 0.03;
              node.vx += (dx / dist) * force;
              node.vy += (dy / dist) * force;
            }
          });
          // Center gravity
          node.vx += (width / 2 - node.x) * 0.003;
          node.vy += (height / 2 - node.y) * 0.003;
          // Damping
          node.vx *= 0.8;
          node.vy *= 0.8;
          node.x += node.vx;
          node.y += node.vy;
          const pad = 80;
          node.x = Math.max(pad, Math.min(width - pad, node.x));
          node.y = Math.max(pad, Math.min(height - pad, node.y));
        });
        if (frameCount > 80 && !nodes.some(n => Math.abs(n.vx) > 0.2 || Math.abs(n.vy) > 0.2)) {
          settled = true;
        }
      }

      // ── DRAW ──
      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.015)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 50) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 50) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
      }

      const currentHovered = hoveredNodeRef.current;
      const currentSelected = selectedNodeRef.current;

      // Connected nodes for selected
      const connectedSet = new Set();
      if (currentSelected) {
        connectedSet.add(currentSelected.id);
        edges.forEach(e => {
          if (e.from === currentSelected.id) connectedSet.add(e.to);
          if (e.to === currentSelected.id) connectedSet.add(e.from);
        });
      }

      // ── Draw Edges ──
      edges.forEach((edge) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const isConnected = currentSelected && connectedSet.has(edge.from) && connectedSet.has(edge.to);
        let alpha = currentSelected ? (isConnected ? 1.0 : 0.08) : 0.6;

        const color = edgeTypeColors[edge.type] || 'rgba(100,100,100,0.3)';
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = isConnected ? color.replace(/[\d.]+\)$/, '0.9)') : color;
        ctx.lineWidth = isConnected ? 2.5 : 1.5;

        // Dashed for DNS/web connections
        if (edge.type === 'dns' || edge.type === 'web') {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated flow dot
        if (!currentSelected || isConnected) {
          const speed = 0.3 + (edge.risk || 3) * 0.03;
          const t = ((time * speed) + (edge.risk || 0) * 0.2) % 1;
          const dotX = fromNode.x + (toNode.x - fromNode.x) * t;
          const dotY = fromNode.y + (toNode.y - fromNode.y) * t;

          const dotColor = edge.type === 'db_access' ? '#a855f7' :
            edge.type === 'smb' ? '#eab308' :
            edge.type === 'remote' ? '#ef4444' :
            edge.type === 'ssh' ? '#22c55e' : '#6b7280';

          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Edge label on hover
        if (isConnected) {
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          const labelWidth = ctx.measureText(edge.label).width + 12;
          ctx.fillRect(midX - labelWidth / 2, midY - 8, labelWidth, 16);
          ctx.fillStyle = '#fff';
          ctx.font = '9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(edge.label, midX, midY + 3);
        }

        ctx.globalAlpha = 1.0;
      });

      // ── Draw Nodes ──
      nodes.forEach((node) => {
        const isHovered = currentHovered?.id === node.id;
        const isSelected = currentSelected?.id === node.id;
        const isConnected = currentSelected ? connectedSet.has(node.id) : true;
        const alpha = currentSelected ? (isConnected ? 1.0 : 0.12) : 1.0;

        ctx.globalAlpha = alpha;

        const size = isHovered || isSelected ? (node.size || 20) * 1.3 : (node.size || 20);
        const color = typeColors[node.host_type] || '#6b7280';

        // Glow for selected
        if (isSelected) {
          const glow = ctx.createRadialGradient(node.x, node.y, size, node.x, node.y, size + 25);
          glow.addColorStop(0, color.replace(')', ', 0.4)').replace('rgb', 'rgba'));
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 25, 0, Math.PI * 2);
          ctx.fill();
        }

        // Risk ring
        ctx.strokeStyle = node.risk_color || '#666';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Main circle
        const grad = ctx.createRadialGradient(node.x - size * 0.3, node.y - size * 0.3, 0, node.x, node.y, size);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color.replace(')', ', 0.6)').replace('rgb', 'rgba').replace('#', ''));

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Icon text inside node (professional text labels)
        const iconLabel = node.icon || '?';
        const fontSize = Math.max(8, Math.min(size * 0.55, 14));
        ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(iconLabel, node.x, node.y);

        // IP label below
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(node.ip, node.x, node.y - size - 10);

        // Host type label
        ctx.fillStyle = color;
        ctx.font = 'bold 8px Arial';
        ctx.fillText(node.host_type.toUpperCase(), node.x, node.y + size + 14);

        // Port count badge
        if (node.port_count > 0) {
          ctx.fillStyle = node.risk_color || '#666';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`${node.port_count} ports`, node.x, node.y + size + 24);
        }

        ctx.globalAlpha = 1.0;
      });

      // Title
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('NETWORK TOPOLOGY', 15, 25);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    // Mouse events
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let found = null;
      for (let node of nodes) {
        if (Math.hypot(x - node.x, y - node.y) < (node.size || 20) + 10) {
          found = node;
          break;
        }
      }
      hoveredNodeRef.current = found;
      setHoveredNode(found);
    };

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let found = null;
      for (let node of nodes) {
        if (Math.hypot(x - node.x, y - node.y) < (node.size || 20) + 10) {
          found = node;
          break;
        }
      }
      if (found && selectedNodeRef.current?.id === found.id) {
        selectedNodeRef.current = null;
        setSelectedNode(null);
      } else {
        selectedNodeRef.current = found;
        setSelectedNode(found);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationRef.current);
    };
  }, [topologyData]);

  const stats = topologyData?.statistics || {};

  return (
    <div className="w-full bg-black border border-cyan-900/40 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-cyan-900/30 p-4 bg-gradient-to-r from-cyan-950/30 to-black">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <h2 className="text-2xl font-bold text-cyan-400 tracking-widest">NETWORK TOPOLOGY</h2>
          </div>
          {subnetInfo && (
            <div className="text-xs text-gray-400">
              <span className="text-cyan-400 font-bold">{subnetInfo.subnet}</span>
              <span className="mx-2">|</span>
              <span>{subnetInfo.hosts_found} hosts discovered</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-2 text-xs">
          <div className="bg-cyan-950/30 p-2 rounded border border-cyan-900/30 text-center">
            <div className="text-cyan-400 font-bold text-base">{stats.total_hosts || 0}</div>
            <div className="text-gray-500">Hosts</div>
          </div>
          <div className="bg-blue-950/30 p-2 rounded border border-blue-900/30 text-center">
            <div className="text-blue-400 font-bold text-base">{stats.total_connections || 0}</div>
            <div className="text-gray-500">Connections</div>
          </div>
          <div className="bg-red-950/30 p-2 rounded border border-red-900/30 text-center">
            <div className="text-red-400 font-bold text-base">{stats.risk_distribution?.Critical || 0}</div>
            <div className="text-gray-500">Critical</div>
          </div>
          <div className="bg-orange-950/30 p-2 rounded border border-orange-900/30 text-center">
            <div className="text-orange-400 font-bold text-base">{stats.risk_distribution?.High || 0}</div>
            <div className="text-gray-500">High Risk</div>
          </div>
          <div className="bg-yellow-950/30 p-2 rounded border border-yellow-900/30 text-center">
            <div className="text-yellow-400 font-bold text-base">{stats.risk_distribution?.Medium || 0}</div>
            <div className="text-gray-500">Medium</div>
          </div>
          <div className="bg-green-950/30 p-2 rounded border border-green-900/30 text-center">
            <div className="text-green-400 font-bold text-base">{stats.risk_distribution?.Low || 0}</div>
            <div className="text-gray-500">Low</div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-black/80 overflow-hidden" style={{ height: '500px' }}>
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />

        {/* Node hover tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-3 right-3 bg-black/95 border border-cyan-900/40 rounded-lg p-4 text-sm max-w-xs backdrop-blur-sm">
            <div className="text-cyan-400 font-bold mb-2 text-base flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: typeColors[hoveredNode.host_type] || '#6b7280', color: '#fff' }}>{hoveredNode.icon}</span>
              {hoveredNode.ip}
            </div>
            <div className="space-y-1 text-gray-300 text-xs">
              <div><span className="text-cyan-400">Hostname:</span> {hoveredNode.hostname}</div>
              <div><span className="text-cyan-400">Type:</span> {hoveredNode.host_type}</div>
              <div><span className="text-cyan-400">Risk:</span> <span style={{ color: hoveredNode.risk_color }}>{hoveredNode.risk_level} ({hoveredNode.risk_score}/100)</span></div>
              <div><span className="text-cyan-400">Open Ports:</span> {hoveredNode.port_count}</div>
              {hoveredNode.open_ports?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {hoveredNode.open_ports.map((p, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-xs">
                      {p.port}/{p.service}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-gray-500 text-xs mt-2 italic">Click to see connections</div>
          </div>
        )}

        {/* Selected node panel */}
        {selectedNode && (
          <div className="absolute top-3 right-3 bg-black/95 border border-cyan-600/50 rounded-lg p-4 text-sm max-w-xs backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="text-cyan-400 font-bold text-base flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: typeColors[selectedNode.host_type] || '#6b7280', color: '#fff' }}>{selectedNode.icon}</span>
                {selectedNode.ip}
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
            </div>
            <div className="space-y-1 text-xs">
              <div className="text-gray-400"><span className="text-cyan-400">Hostname:</span> {selectedNode.hostname}</div>
              <div className="text-gray-400"><span className="text-cyan-400">Type:</span> {selectedNode.host_type}</div>
              <div style={{ color: selectedNode.risk_color }} className="font-bold">{selectedNode.risk_level} Risk ({selectedNode.risk_score}/100)</div>
              {selectedNode.open_ports?.length > 0 && (
                <div className="mt-2">
                  <div className="text-cyan-400 font-bold mb-1">Open Ports:</div>
                  <div className="space-y-0.5">
                    {selectedNode.open_ports.map((p, i) => (
                      <div key={i} className="flex justify-between text-gray-300">
                        <span>{p.port}</span>
                        <span className="text-gray-500">{p.service}</span>
                        <span className={`text-xs px-1 rounded ${p.role === 'entry' ? 'bg-cyan-900/40 text-cyan-300' : p.role === 'pivot' ? 'bg-yellow-900/40 text-yellow-300' : p.role === 'target' ? 'bg-purple-900/40 text-purple-300' : 'bg-gray-800 text-gray-400'}`}>
                          {p.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-black/80 border border-cyan-900/30 rounded p-3 text-xs">
          <div className="text-cyan-400 font-bold mb-2">Host Types:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-gray-400">Web Server</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-gray-400">Database</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span className="text-gray-400">File Server</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-gray-400">Server</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-cyan-500" /><span className="text-gray-400">Workstation</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-gray-400">DNS</span></div>
          </div>
          <div className="mt-2 text-cyan-400 font-bold mb-1">Connections:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-yellow-500" /><span className="text-gray-400">SMB</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-purple-500" /><span className="text-gray-400">DB Access</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-green-500" /><span className="text-gray-400">SSH</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-red-500" /><span className="text-gray-400">Remote</span></div>
          </div>
        </div>
      </div>

      {/* Host List */}
      {topologyData?.nodes?.length > 0 && (
        <div className="border-t border-cyan-900/30 p-4 max-h-48 overflow-y-auto bg-black/50">
          <div className="text-cyan-400 font-bold text-xs tracking-wider mb-2">DISCOVERED HOSTS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {topologyData.nodes.map((node, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-gray-900/50 border border-gray-800 text-xs hover:border-cyan-800/40 transition-colors cursor-pointer"
                onClick={() => setSelectedNode(node)}>
                <span className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono font-bold text-white shrink-0" style={{ background: typeColors[node.host_type] || '#6b7280' }}>{node.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold truncate">{node.ip}</div>
                  <div className="text-gray-500 truncate">{node.hostname}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold" style={{ color: node.risk_color }}>{node.risk_level}</div>
                  <div className="text-gray-500">{node.port_count} ports</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkTopology;
