import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const GraphBackground = () => {
  const graphRef = useRef();
  const [dimensions, setDimensions] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 800, height: typeof window !== 'undefined' ? window.innerHeight : 600 });

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const nodeCount = 480;

    for (let i = 0; i < nodeCount; i++) {
      const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      nodes.push({ id: ip, name: ip, val: 1 });
    }

    for (let i = 0; i < nodeCount; i++) {
      const targetCount = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < targetCount; j++) {
        const target = nodes[Math.floor(Math.random() * nodeCount)].id;
        if (nodes[i].id !== target) {
          links.push({
            source: nodes[i].id,
            target: target,
            isCritical: Math.random() > 0.7
          });
        }
      }
    }
    return { nodes, links };
  }, []);

  useEffect(() => {
    graphRef.current.d3Force('charge').strength(-30);
    graphRef.current.d3Force('link').distance(150);
    graphRef.current.d3Force('center', null);
  }, []);

  useEffect(() => {
    const onResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{background: 'linear-gradient(135deg, #021024 0%, #031B35 50%, #021024 100%)'}}>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#021024"
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: '100vw', height: '100vh' }}

        /* Lines: deep blue palette edges */
        linkColor={(link) => link.isCritical ? "rgba(84, 131, 179, 0.25)" : "rgba(5, 38, 89, 0.15)"}
        linkWidth={0.5}

        /* Particles: steel blue flowing dots */
        linkDirectionalParticles={(link) => link.isCritical ? 2 : 0}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleColor={() => "#7DA0CA"}
        linkDirectionalParticleWidth={1.5}

        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 11 / globalScale;

          // Node dots — steel blue with subtle glow
          ctx.beginPath();
          ctx.arc(node.x, node.y, 0.8, 0, 2 * Math.PI);
          ctx.fillStyle = node.id.startsWith('192') ? "rgba(193, 232, 255, 0.6)" : "rgba(84, 131, 179, 0.4)";
          ctx.fill();

          // IP text in palette blues
          ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = node.id.startsWith('192') ? "rgba(193, 232, 255, 0.35)" : "rgba(84, 131, 179, 0.2)";
          ctx.fillText(label, node.x, node.y + 4);
        }}

        d3AlphaDecay={0.01}
        d3VelocityDecay={0.05}
        cooldownTicks={200}
      />
    </div>
  );
};

export default GraphBackground;