import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const GraphBackground = () => {
  const graphRef = useRef();
  const [dimensions, setDimensions] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 800, height: typeof window !== 'undefined' ? window.innerHeight : 600 });

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    // Reference image jaisa dense look dene ke liye 450+ nodes
    const nodeCount = 480; 

    for (let i = 0; i < nodeCount; i++) {
      const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      nodes.push({ id: ip, name: ip, val: 1 });
    }

    // Dense connections create karna
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
    // 1. Charge ko kam kiya taaki bheed na dikhe
    graphRef.current.d3Force('charge').strength(-30); 
    // 2. Links ko lamba kiya taaki jaal poori screen par faile
    graphRef.current.d3Force('link').distance(150);
    // 3. Center force ko zero kiya taaki nodes beech mein na rukein
    graphRef.current.d3Force('center', null);
  }, []);

  useEffect(() => {
    // Resize handler to make canvas fill viewport
    const onResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-black pointer-events-none">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#000000"
        // force graph to explicitly size to viewport
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: '100vw', height: '100vh' }}
        
        // Lines styling: Ekdum patli aur halki
        linkColor={(link) => link.isCritical ? "rgba(255, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.015)"}
        linkWidth={0.4}
        
        // Red Attack Path particles
        linkDirectionalParticles={(link) => link.isCritical ? 2 : 0}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleColor={() => "#ff0000"}
        linkDirectionalParticleWidth={1.5}

        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 11 / globalScale;
          
          // Chhoti red dot
          ctx.beginPath();
          ctx.arc(node.x, node.y, 0.8, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
          ctx.fill();

          // IP text ko floating words ki jagah dalna
          ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Random red/white mix color for IPs
          ctx.fillStyle = node.id.startsWith('192') ? "rgba(255, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.15)";
          
          ctx.fillText(label, node.x, node.y + 4);
        }}
        
        // Physics settings: Nodes ko float karne do
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.05}
        cooldownTicks={200}
      />
    </div>
  );
};

export default GraphBackground;