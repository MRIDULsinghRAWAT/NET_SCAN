import React, { useEffect, useRef, useState } from 'react';

const GraphView = ({ graphData, exposure, attackChains }) => {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Simple force-directed graph simulation
  useEffect(() => {
    if (!graphData || !canvasRef.current) {
      console.log('>>> GraphView: Missing data or canvas ref', { graphData, canvasRef: canvasRef.current });
      return;
    }

    console.log('>>> GraphView: Initializing with data:', graphData);
    console.log('>>> Nodes count:', graphData.nodes?.length);
    console.log('>>> Edges count:', graphData.edges?.length);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    // Canvas setup
    const width = canvas.width;
    const height = canvas.height;

    // Initialize node positions if not already done
    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];

    console.log('>>> Graph rendering: width=', width, 'height=', height, 'nodes=', nodes.length);

    // Better initial positioning - arrange in circle
    if (!nodes.some(n => n.x !== undefined)) {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;

      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2;
        node.x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50;
        node.y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50;
        node.vx = 0;
        node.vy = 0;
      });
    }

    const simulation = () => {
      // Apply forces
      nodes.forEach((node, i) => {
        // Stronger repulsion between nodes
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.hypot(dx, dy) || 1;
            const force = 200 / (dist * dist + 100); // Increased force, with minimum distance
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }
        });

        // Attraction to edges
        edges.forEach((edge) => {
          if (edge.from === node.id) {
            const toNode = nodes.find(n => n.id === edge.to);
            if (toNode) {
              const dx = toNode.x - node.x;
              const dy = toNode.y - node.y;
              const dist = Math.hypot(dx, dy) || 1;
              const force = (dist - 100) * 0.1; // Spring force towards target distance of 100px
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
              const force = (dist - 100) * 0.1;
              node.vx += (dx / dist) * force;
              node.vy += (dy / dist) * force;
            }
          }
        });

        // Gentle center attraction (not too strong)
        node.vx += (width / 2 - node.x) * 0.01;
        node.vy += (height / 2 - node.y) * 0.01;

        // Damping
        node.vx *= 0.85;
        node.vy *= 0.85;

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Boundary conditions with padding
        const padding = 50;
        if (node.x < padding) node.x = padding;
        if (node.x > width - padding) node.x = width - padding;
        if (node.y < padding) node.y = padding;
        if (node.y > height - padding) node.y = height - padding;
      });

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Apply zoom and pan
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw edges
      edges.forEach((edge) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        if (fromNode && toNode) {
          ctx.strokeStyle = selectedEdge?.id === edge.id ? '#00FF00' : '#555555';
          ctx.lineWidth = selectedEdge?.id === edge.id ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.stroke();

          // Arrow
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

      // Draw nodes
      nodes.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const size = isHovered ? node.size * 1.5 : node.size;

        // Node circle
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect for critical nodes
        if (node.risk === 'Critical') {
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Border for all nodes
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        if (isHovered || nodes.length <= 8) { // Show labels if few nodes or hovered
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(node.label.split('\n')[0], node.x, node.y - size - 8);
        }
      });

      ctx.restore();

      // Continue animation if still moving
      const stillMoving = nodes.some(n => Math.abs(n.vx) > 0.5 || Math.abs(n.vy) > 0.5);
      if (stillMoving) {
        animationId = requestAnimationFrame(simulation);
      }
    };

    simulation();

    // Mouse events
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      let found = null;
      for (let node of nodes) {
        const dist = Math.hypot(x - node.x, y - node.y);
        if (dist < node.size + 10) {
          found = node;
          break;
        }
      }
      setHoveredNode(found);
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [graphData, hoveredNode, selectedEdge, pan, zoom]);

  const stats = graphData?.statistics || {};

  return (
    <div className="w-full h-full flex flex-col bg-black border border-red-900/40">
      {/* Header */}
      <div className="border-b border-red-900/30 p-4 bg-black/50">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-red-500">ATTACK PATH GRAPH</h2>
          {exposure && (
            <div className="flex gap-6 items-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  exposure.severity === 'CRITICAL' ? 'text-red-500' :
                  exposure.severity === 'HIGH' ? 'text-orange-500' :
                  'text-yellow-500'
                }`}>
                  {exposure.exposure_score}
                </div>
                <div className="text-xs text-gray-400">Exposure Score</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  exposure.severity === 'CRITICAL' ? 'text-red-500' :
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
        <div className="grid grid-cols-5 gap-2 text-xs">
          <div className="bg-red-950/30 p-2 rounded border border-red-900/30">
            <div className="text-red-400 font-bold">{stats.critical_services || 0}</div>
            <div className="text-gray-500">Critical</div>
          </div>
          <div className="bg-orange-950/30 p-2 rounded border border-orange-900/30">
            <div className="text-orange-400 font-bold">{stats.high_risk_services || 0}</div>
            <div className="text-gray-500">High Risk</div>
          </div>
          <div className="bg-yellow-950/30 p-2 rounded border border-yellow-900/30">
            <div className="text-yellow-400 font-bold">{stats.total_nodes || 0}</div>
            <div className="text-gray-500">Services</div>
          </div>
          <div className="bg-green-950/30 p-2 rounded border border-green-900/30">
            <div className="text-green-400 font-bold">{stats.lateral_movement_paths || 0}</div>
            <div className="text-gray-500">Lateral Paths</div>
          </div>
          <div className="bg-blue-950/30 p-2 rounded border border-blue-900/30">
            <div className="text-blue-400 font-bold">{stats.total_edges || 0}</div>
            <div className="text-gray-500">Connections</div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-black/80">
        <canvas
          ref={canvasRef}
          width={1200}
          height={600}
          className="w-full h-full cursor-crosshair"
        />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-black/80 border border-red-900/30 rounded p-3 text-xs">
          <div className="text-red-400 font-bold mb-2">Legend:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span className="text-gray-300">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
              <span className="text-gray-300">High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
              <span className="text-gray-300">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span className="text-gray-300">Low</span>
            </div>
          </div>
        </div>

        {/* Info Panel (Right Side) */}
        {hoveredNode && (
          <div className="absolute top-3 right-3 bg-black/80 border border-green-900/30 rounded p-3 text-xs max-w-xs">
            <div className="text-green-400 font-bold mb-2">{hoveredNode.service}</div>
            <div className="space-y-1 text-gray-300">
              <div><span className="text-green-400">Port:</span> {hoveredNode.port}</div>
              <div><span className="text-green-400">Risk:</span> {hoveredNode.risk}</div>
              {hoveredNode.vulnerabilities && hoveredNode.vulnerabilities.length > 0 && (
                <div className="mt-2">
                  <div className="text-red-400 font-bold text-xs">Vulnerabilities:</div>
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
        <div className="border-t border-red-900/30 p-4 bg-black/50 max-h-32 overflow-y-auto">
          <div className="text-sm font-bold text-red-400 mb-2">Attack Chains ({attackChains.total_chains}):</div>
          <div className="space-y-1 text-xs">
            {attackChains.chains.slice(0, 5).map((chain, i) => (
              <div key={i} className="text-gray-300">
                <span className="text-red-400">{chain.type.replace('_', ' ')}:</span> {chain.from} → {chain.to}
              </div>
            ))}
            {attackChains.chains.length > 5 && (
              <div className="text-gray-500 italic">+{attackChains.chains.length - 5} more chains...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphView;
