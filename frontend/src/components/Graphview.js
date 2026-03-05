import React, { useEffect, useRef, useState } from 'react';

const GraphView = ({ graphData, exposure, attackChains }) => {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const hoveredNodeRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const animationRef = useRef(null);
  const initializedRef = useRef(false);

  // Keep hoveredNode ref in sync with state
  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);

  // Force-directed graph simulation — runs ONCE when graphData changes
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Fix Canvas Aspect Ratio dynamically to prevent squashing
    const parent = canvas.parentElement;
    if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    } else {
      // Fallback dimensions if parent hasn't rendered yet
      canvas.width = 1200;
      canvas.height = 400;
    }

    const width = canvas.width;
    const height = canvas.height;

    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];
    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Initialize node positions — arrange in circle (only on first load)
    if (!initializedRef.current || !nodes.some(n => n.x !== undefined)) {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.38;

      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2;
        node.x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 30;
        node.y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 30;
        node.vx = 0;
        node.vy = 0;
      });
      initializedRef.current = true;
    }

    let settled = false;

    const render = () => {
      if (!settled) {
        // Apply forces only while simulation is still settling
        nodes.forEach((node, i) => {
          nodes.forEach((other, j) => {
            if (i !== j) {
              const dx = node.x - other.x;
              const dy = node.y - other.y;
              const dist = Math.hypot(dx, dy) || 1;
              const force = 1000 / (dist * dist + 50);
              node.vx += (dx / dist) * force;
              node.vy += (dy / dist) * force;
            }
          });

          edges.forEach((edge) => {
            if (edge.from === node.id) {
              const toNode = nodes.find(n => n.id === edge.to);
              if (toNode) {
                const dx = toNode.x - node.x;
                const dy = toNode.y - node.y;
                const dist = Math.hypot(dx, dy) || 1;
                const force = (dist - 200) * 0.05;
                node.vx += (dx / dist) * force;
                node.vy += (dy / dist) * force;
              }
            }
            if (edge.to === node.id) {
              const fromNode = nodes.find(n => n.id === edge.from);
              if (fromNode) {
                const dx = fromNode.x - node.x;
                const dy = fromNode.y - node.y;
                const dist = Math.hypot(dx, dy) || 1;
                const force = (dist - 200) * 0.05;
                node.vx += (dx / dist) * force;
                node.vy += (dy / dist) * force;
              }
            }
          });

          node.vx += (width / 2 - node.x) * 0.005;
          node.vy += (height / 2 - node.y) * 0.005;
          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x += node.vx;
          node.y += node.vy;

          const padding = 60;
          if (node.x < padding) node.x = padding;
          if (node.x > width - padding) node.x = width - padding;
          if (node.y < padding) node.y = padding;
          if (node.y > height - padding) node.y = height - padding;
        });

        // Check if simulation has settled
        const stillMoving = nodes.some(n => Math.abs(n.vx) > 0.5 || Math.abs(n.vy) > 0.5);
        if (!stillMoving) settled = true;
      }

      // Always draw current frame
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw edges
      edges.forEach((edge) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        if (fromNode && toNode) {
          ctx.strokeStyle = '#555555';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.stroke();

          const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
          const arrowSize = 15;
          ctx.fillStyle = edge.type === 'lateral_movement' ? '#FF6B6B' : '#FFA500';
          ctx.beginPath();
          ctx.moveTo(toNode.x, toNode.y);
          ctx.lineTo(toNode.x - arrowSize * Math.cos(angle - Math.PI / 6), toNode.y - arrowSize * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(toNode.x - arrowSize * Math.cos(angle + Math.PI / 6), toNode.y - arrowSize * Math.sin(angle + Math.PI / 6));
          ctx.fill();
        }
      });

      // Draw nodes — read hovered from ref (no re-render!)
      const currentHovered = hoveredNodeRef.current;
      nodes.forEach((node) => {
        const isHovered = currentHovered?.id === node.id;
        const size = isHovered ? node.size * 1.5 : node.size;

        const roleColors = {
          entry: { ring: '#06b6d4', label: 'ENTRY', glow: 'rgba(6, 182, 212, 0.3)' },
          pivot: { ring: '#eab308', label: 'PIVOT', glow: 'rgba(234, 179, 8, 0.3)' },
          target: { ring: '#a855f7', label: 'TARGET', glow: 'rgba(168, 85, 247, 0.3)' },
        };
        const roleInfo = roleColors[node.role];

        if (roleInfo) {
          ctx.fillStyle = roleInfo.glow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = roleInfo.ring;
          ctx.lineWidth = 2;
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

        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.label.split('\n')[0], node.x, node.y - size - 12);

        if (roleInfo) {
          ctx.fillStyle = roleInfo.ring;
          ctx.font = 'bold 9px Arial';
          ctx.fillText(roleInfo.label, node.x, node.y + size + 14);
        }
      });

      // Keep looping for hover highlight updates even after settling
      animationRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    animationRef.current = requestAnimationFrame(render);

    // Mouse events — only updates the ref, does NOT trigger re-render of simulation
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let found = null;
      for (let node of nodes) {
        const dist = Math.hypot(x - node.x, y - node.y);
        if (dist < node.size + 10) {
          found = node;
          break;
        }
      }
      hoveredNodeRef.current = found;
      setHoveredNode(found);
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  const stats = graphData?.statistics || {};

  return (
    <div className="w-full h-full bg-black border border-red-900/40 overflow-auto">
      {/* Header */}
      <div className="border-b border-red-900/30 p-4 bg-black/50">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-red-500">ATTACK PATH GRAPH</h2>
          {exposure && (
            <div className="flex gap-6 items-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${exposure.severity === 'CRITICAL' ? 'text-red-500' :
                  exposure.severity === 'HIGH' ? 'text-orange-500' :
                    'text-yellow-500'
                  }`}>
                  {exposure.exposure_score}
                </div>
                <div className="text-xs text-gray-400">Exposure Score</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${exposure.severity === 'CRITICAL' ? 'text-red-500' :
                  exposure.severity === 'HIGH' ? 'text-orange-500' :
                    'text-yellow-500'
                  }`}>
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

      {/* Canvas */}
      <div className="relative bg-black/80 h-[300px]">
        <canvas
          ref={canvasRef}
          width={1200}
          height={300}
          className="w-full h-full cursor-crosshair"
        />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-black/80 border border-red-900/30 rounded p-4 text-sm">
          <div className="text-red-400 font-bold mb-2 text-base">Risk Level:</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
              <span className="text-gray-300">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-600 rounded-full"></div>
              <span className="text-gray-300">High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded-full"></div>
              <span className="text-gray-300">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
              <span className="text-gray-300">Low</span>
            </div>
          </div>
          <div className="text-cyan-400 font-bold mt-3 mb-2 text-base">Kill Chain Role:</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-cyan-400"></div>
              <span className="text-gray-300">Entry Point</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-yellow-400"></div>
              <span className="text-gray-300">Pivot Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-purple-400"></div>
              <span className="text-gray-300">Target</span>
            </div>
          </div>
        </div>

        {/* Info Panel (Right Side) */}
        {hoveredNode && (
          <div className="absolute top-3 right-3 bg-black/80 border border-green-900/30 rounded p-4 text-sm max-w-xs">
            <div className="text-green-400 font-bold mb-2 text-base">{hoveredNode.service}</div>
            <div className="space-y-1 text-gray-300">
              <div><span className="text-green-400">Port:</span> {hoveredNode.port}</div>
              <div><span className="text-green-400">Risk:</span> {hoveredNode.risk}</div>
              {hoveredNode.vulnerabilities && hoveredNode.vulnerabilities.length > 0 && (
                <div className="mt-2">
                  <div className="text-red-400 font-bold">Vulnerabilities:</div>
                  {hoveredNode.vulnerabilities.map((v, i) => (
                    <div key={i} className="text-red-300">• {v}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Attack Chains List */}
      {attackChains && attackChains.chains && attackChains.chains.length > 0 && (
        <div className="border-t border-red-900/30 p-5 bg-black/50 max-h-56 overflow-y-auto">
          {/* Kill Chain Classification Badges */}
          {attackChains.classification && (
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/50 border border-red-800/40">
                <span className="text-red-400 text-sm font-bold">⬤</span>
                <span className="text-sm text-gray-300">{attackChains.classification.entry_points || 0} Entry Points</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-yellow-950/50 border border-yellow-800/40">
                <span className="text-yellow-400 text-sm font-bold">⬤</span>
                <span className="text-sm text-gray-300">{attackChains.classification.pivot_nodes || 0} Pivot Nodes</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-purple-950/50 border border-purple-800/40">
                <span className="text-purple-400 text-sm font-bold">⬤</span>
                <span className="text-sm text-gray-300">{attackChains.classification.target_nodes || 0} Targets</span>
              </div>
            </div>
          )}

          <div className="text-lg font-bold text-red-400 mb-3">Attack Chains ({attackChains.total_chains}):</div>
          <div className="space-y-1.5 text-base">
            {attackChains.chains.slice(0, 8).map((chain, i) => (
              <div key={i} className="text-gray-300 flex items-start gap-2" title={chain.description}>
                <span className={`font-bold shrink-0 ${chain.type === 'lateral_movement' ? 'text-red-400' : 'text-orange-400'}`}>
                  {chain.type === 'lateral_movement' ? '⤷' : '↔'}
                </span>
                <span>{chain.from} → {chain.to}</span>
              </div>
            ))}
            {attackChains.chains.length > 8 && (
              <div className="text-gray-500 italic">+{attackChains.chains.length - 8} more chains...</div>
            )}
          </div>

          {/* Full Kill Chain Paths */}
          {attackChains.full_attack_paths && attackChains.full_attack_paths.length > 0 && (
            <div className="mt-4 pt-4 border-t border-red-900/20">
              <div className="text-lg font-bold text-orange-400 mb-3">Kill Chain Paths:</div>
              <div className="space-y-1.5 text-base">
                {attackChains.full_attack_paths.slice(0, 3).map((path, i) => (
                  <div key={i} className="text-gray-300" title={path.description}>
                    <span className="text-cyan-400 font-mono">{path.name}</span>
                  </div>
                ))}
                {attackChains.full_attack_paths.length > 3 && (
                  <div className="text-gray-500 italic">+{attackChains.full_attack_paths.length - 3} more paths...</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GraphView;
