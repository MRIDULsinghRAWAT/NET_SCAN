import React from 'react';

const About = () => {
  /* ═══ Glass card style helpers ═══ */
  const glassCard = {
    background: 'rgba(5, 38, 89, 0.35)',
    border: '1px solid rgba(84, 131, 179, 0.18)',
    borderRadius: '18px',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: '0 8px 32px rgba(2, 16, 36, 0.4), inset 0 1px 0 rgba(193, 232, 255, 0.05)',
  };

  const glassCardAccent = (accentColor) => ({
    ...glassCard,
    borderColor: accentColor,
    boxShadow: `0 8px 32px rgba(2, 16, 36, 0.4), inset 0 1px 0 rgba(193, 232, 255, 0.05), 0 0 20px ${accentColor}15`,
  });

  const sectionTitle = {
    background: 'linear-gradient(90deg, #C1E8FF, #7DA0CA)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  const features = [
    {
      icon: '01',
      title: 'Multi-Threaded TCP Scanner',
      desc: 'High-performance port scanning with configurable thread pools (up to 1000 threads). Scans all 65,535 ports with real-time Server-Sent Events (SSE) streaming to the frontend.',
      color: '#C1E8FF',
    },
    {
      icon: '02',
      title: 'Kill Chain Classification',
      desc: 'Heuristic classification engine that categorizes every discovered service into Entry Points (initial access), Pivot Nodes (lateral movement), or Target Nodes (high-value assets) based on real-world attack patterns.',
      color: '#5483B3',
    },
    {
      icon: '03',
      title: 'Attack Path Graph Engine',
      desc: 'Force-directed graph visualization built on HTML5 Canvas with physics simulation. Displays attack chains, lateral movement paths, blast radii, and MITRE ATT&CK technique mappings in real-time.',
      color: '#7DA0CA',
    },
    {
      icon: '04',
      title: 'Network Exposure Score (NES)',
      desc: 'Composite scoring algorithm that quantifies network risk on a 0-100 scale based on critical services, high-risk ports, and lateral movement path density. Classified as LOW / MEDIUM / HIGH / CRITICAL.',
      color: '#ef4444',
    },
    {
      icon: '05',
      title: 'CVE Enrichment (NVD API)',
      desc: 'Integrates with the NIST National Vulnerability Database (NVD API v2.0) to enrich scan results with real-world CVE data, CVSS scores, and severity ratings for each discovered service.',
      color: '#f97316',
    },
    {
      icon: '06',
      title: 'Automated PDF Reports',
      desc: 'Generates professional 8-page security assessment reports with executive summaries, exposed service matrices, kill chain analysis, threat intelligence, and prioritized mitigation recommendations.',
      color: '#eab308',
    },
  ];

  const algorithms = [
    { name: 'BFS (Breadth-First Search)', usage: 'Finding shortest attack paths (minimum hops)', complexity: 'O(V + E)' },
    { name: 'Modified Dijkstra', usage: 'Finding deadliest paths (maximum cumulative risk)', complexity: 'O((V+E) log V)' },
    { name: 'Blast Radius (BFS)', usage: 'Calculating reachable node set from any compromised node', complexity: 'O(V × (V + E))' },
    { name: 'Risk Propagation', usage: 'Cascading compromise probability with decay factor', complexity: 'O(V + E)' },
    { name: 'What-If Analysis', usage: 'Iterative node removal to find highest-impact ports to close', complexity: 'O(V × E)' },
    { name: 'Force-Directed Layout', usage: 'Physics-based graph visualization with spring forces', complexity: 'O(V² + E)' },
  ];

  const techStack = [
    { category: 'Backend', items: [
      { name: 'Python 3.10+', role: 'Core language' },
      { name: 'Flask', role: 'REST API + SSE streaming' },
      { name: 'Threading', role: 'Concurrent port scanning' },
      { name: 'FPDF2', role: 'PDF report generation' },
      { name: 'Socket', role: 'TCP connect scanning' },
    ]},
    { category: 'Frontend', items: [
      { name: 'React 18', role: 'UI framework' },
      { name: 'HTML5 Canvas', role: 'Graph visualization engine' },
      { name: 'Tailwind CSS', role: 'Glassmorphism design system' },
      { name: 'Axios', role: 'HTTP client' },
      { name: 'React Router v7', role: 'Client-side routing' },
    ]},
    { category: 'External', items: [
      { name: 'NIST NVD API v2.0', role: 'CVE vulnerability database' },
      { name: 'MITRE ATT&CK', role: 'Technique classification framework' },
      { name: 'Lockheed Kill Chain', role: 'Attack phase modeling' },
    ]},
  ];

  const pipelineSteps = [
    { step: '01', title: 'Port Scanning', desc: 'Multi-threaded TCP connect scan discovers open ports and grabs service banners in real-time.', color: '#5483B3' },
    { step: '02', title: 'Risk Analysis', desc: 'Each service is assigned a risk level (Critical/High/Medium/Low) based on known vulnerability patterns.', color: '#7DA0CA' },
    { step: '03', title: 'Kill Chain Classification', desc: 'Services are classified into Entry, Pivot, or Target roles using heuristic port-to-role mapping.', color: '#C1E8FF' },
    { step: '04', title: 'Attack Graph Generation', desc: 'Directed graph built with nodes (services) and edges (attack vectors), enriched with MITRE ATT&CK techniques.', color: '#ef4444' },
    { step: '05', title: 'Advanced Analysis', desc: 'BFS shortest paths, Dijkstra deadliest paths, blast radius, risk propagation, and what-if analysis computed.', color: '#f97316' },
    { step: '06', title: 'CVE Enrichment', desc: 'Real-world vulnerabilities fetched from NIST NVD and mapped to discovered services with CVSS scores.', color: '#eab308' },
  ];

  return (
    <div className="pt-32 pb-20 min-h-screen text-white w-full relative">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20 animate-pulse" style={{background: 'radial-gradient(circle, rgba(84,131,179,0.5) 0%, transparent 70%)'}}></div>
        <div className="absolute bottom-1/3 left-1/5 w-80 h-80 rounded-full blur-[100px] opacity-15 animate-pulse" style={{background: 'radial-gradient(circle, rgba(5,38,89,0.6) 0%, transparent 70%)', animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-6xl mx-auto px-6">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* HERO SECTION */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="text-center mb-20">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.3em] mb-6" style={{
            background: 'rgba(84, 131, 179, 0.15)',
            border: '1px solid rgba(84, 131, 179, 0.25)',
            color: '#7DA0CA',
          }}>
            ABOUT THE PROJECT
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6" style={sectionTitle}>
            NET_SCAN
          </h1>
          <p className="text-xl md:text-2xl font-light max-w-3xl mx-auto leading-relaxed" style={{color: '#7DA0CA'}}>
            Automated Lateral Movement Detection &amp; Cyber Kill Chain Modeling Platform
          </p>
          <div className="w-24 h-1 mx-auto mt-8 rounded-full" style={{background: 'linear-gradient(90deg, #5483B3, #C1E8FF, #5483B3)'}}></div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PROJECT DESCRIPTION */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-16 p-8" style={glassCard}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-10 rounded-full" style={{background: 'linear-gradient(180deg, #C1E8FF, #5483B3)'}}></div>
            <h2 className="text-2xl font-black tracking-wide" style={sectionTitle}>What is NET_SCAN?</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed" style={{color: '#C1E8FF'}}>
            <p>
              <strong style={{color: '#fff'}}>NET_SCAN</strong> is a real-time network intelligence platform that transforms 
              traditional port scanning into actionable security intelligence. Unlike conventional tools like Nmap or Nessus that 
              produce flat lists of open ports, NET_SCAN automatically <strong style={{color: '#7DA0CA'}}>chains discovered services 
              into realistic attack scenarios</strong> using the Lockheed Martin Cyber Kill Chain model and MITRE ATT&amp;CK framework.
            </p>
            <p>
              The system performs multi-threaded TCP port scanning with heuristic banner grabbing, then feeds the results through 
              a <strong style={{color: '#7DA0CA'}}>5-stage intelligence pipeline</strong> that classifies services into kill chain 
              roles (Entry Point, Pivot Node, Target Node), generates directed attack graphs with MITRE technique annotations, 
              calculates blast radii, computes network exposure scores, and enriches findings with real-world CVE data from the 
              NIST National Vulnerability Database.
            </p>
            <p>
              Everything is visualized through an <strong style={{color: '#7DA0CA'}}>interactive force-directed attack graph</strong> rendered 
              on HTML5 Canvas with physics simulation, real-time attack simulation playback, and comprehensive tabbed analysis panels 
              covering attack chains, critical paths, MITRE heatmaps, CVE databases, and what-if mitigation scenarios.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* KEY PROBLEM */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="p-6" style={glassCardAccent('rgba(239, 68, 68, 0.3)')}>
            <h3 className="text-lg font-black mb-4 text-red-400">The Problem</h3>
            <ul className="space-y-3 text-sm" style={{color: '#C1E8FF'}}>
              <li className="flex gap-2">
                <span className="text-red-400 flex-shrink-0">✗</span>
                <span>Traditional scanners produce flat lists of open ports with no context on how they relate to each other</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-400 flex-shrink-0">✗</span>
                <span>Security teams manually map attack paths — a time-consuming and error-prone process</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-400 flex-shrink-0">✗</span>
                <span>No automated way to identify lateral movement opportunities between services</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-400 flex-shrink-0">✗</span>
                <span>Missing connection between port scan results and standardized attack frameworks (MITRE ATT&amp;CK)</span>
              </li>
            </ul>
          </div>
          <div className="p-6" style={glassCardAccent('rgba(34, 197, 94, 0.3)')}>
            <h3 className="text-lg font-black mb-4 text-green-400">Our Solution</h3>
            <ul className="space-y-3 text-sm" style={{color: '#C1E8FF'}}>
              <li className="flex gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>Automated kill chain classification maps every service to its role in an attack scenario</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>Graph algorithms discover shortest and deadliest attack paths automatically</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>Lateral movement paths detected with MITRE ATT&amp;CK technique annotations</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <span>Network Exposure Score (NES) provides a single quantified risk metric (0-100)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CORE FEATURES */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-10 rounded-full" style={{background: 'linear-gradient(180deg, #C1E8FF, #5483B3)'}}></div>
            <h2 className="text-2xl font-black tracking-wide" style={sectionTitle}>Core Features</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="p-5 group hover:scale-[1.02] transition-all duration-300 cursor-default" style={glassCard}>
                <div className="text-lg font-black mb-3 w-9 h-9 rounded-lg flex items-center justify-center" style={{background: 'rgba(84, 131, 179, 0.15)', border: '1px solid rgba(84, 131, 179, 0.25)', color: f.color}}>{f.icon}</div>
                <h3 className="font-black text-base mb-2" style={{color: f.color}}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{color: 'rgba(193, 232, 255, 0.75)'}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* INTELLIGENCE PIPELINE */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-10 rounded-full" style={{background: 'linear-gradient(180deg, #C1E8FF, #5483B3)'}}></div>
            <h2 className="text-2xl font-black tracking-wide" style={sectionTitle}>Intelligence Pipeline</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pipelineSteps.map((s, i) => (
              <div key={i} className="p-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300" style={glassCard}>
                <div className="absolute top-3 right-4 font-black text-4xl opacity-[0.07]" style={{color: s.color}}>{s.step}</div>
                <div className="text-xs font-bold tracking-[0.2em] mb-2" style={{color: s.color}}>STEP {s.step}</div>
                <h3 className="font-bold text-sm mb-2" style={{color: '#C1E8FF'}}>{s.title}</h3>
                <p className="text-xs leading-relaxed" style={{color: 'rgba(193, 232, 255, 0.65)'}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ALGORITHMS */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-10 rounded-full" style={{background: 'linear-gradient(180deg, #C1E8FF, #5483B3)'}}></div>
            <h2 className="text-2xl font-black tracking-wide" style={sectionTitle}>Algorithms Used</h2>
          </div>
          <div className="overflow-hidden" style={{...glassCard, padding: 0}}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{background: 'rgba(5, 38, 89, 0.5)', borderBottom: '1px solid rgba(84, 131, 179, 0.2)'}}>
                  <th className="text-left px-5 py-3 font-bold text-xs tracking-wider" style={{color: '#7DA0CA'}}>ALGORITHM</th>
                  <th className="text-left px-5 py-3 font-bold text-xs tracking-wider" style={{color: '#7DA0CA'}}>APPLICATION</th>
                  <th className="text-left px-5 py-3 font-bold text-xs tracking-wider" style={{color: '#7DA0CA'}}>COMPLEXITY</th>
                </tr>
              </thead>
              <tbody>
                {algorithms.map((a, i) => (
                  <tr key={i} className="hover:bg-white/[0.03] transition-all" style={{borderBottom: '1px solid rgba(84, 131, 179, 0.08)'}}>
                    <td className="px-5 py-3 font-bold" style={{color: '#C1E8FF'}}>{a.name}</td>
                    <td className="px-5 py-3" style={{color: 'rgba(193, 232, 255, 0.7)'}}>{a.usage}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{color: '#7DA0CA'}}>{a.complexity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* NES SCORING */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-16 p-8" style={glassCard}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-10 rounded-full" style={{background: 'linear-gradient(180deg, #ef4444, #eab308)'}}></div>
            <h2 className="text-2xl font-black tracking-wide" style={sectionTitle}>Network Exposure Score (NES)</h2>
          </div>
          <p className="text-sm mb-6 leading-relaxed" style={{color: 'rgba(193, 232, 255, 0.8)'}}>
            NES is a composite scoring algorithm that quantifies overall network risk on a 0-100 scale. It is computed using:
          </p>
          <div className="p-4 rounded-xl mb-6 font-mono text-center text-sm" style={{
            background: 'rgba(2, 16, 36, 0.6)',
            border: '1px solid rgba(84, 131, 179, 0.2)',
            color: '#C1E8FF',
          }}>
            NES = min( critical_services × 20 + high_risk_services × 10 + lateral_paths × 5, 100 )
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { range: '0 - 30', label: 'LOW', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)' },
              { range: '31 - 60', label: 'MEDIUM', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.25)' },
              { range: '61 - 80', label: 'HIGH', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)' },
              { range: '81 - 100', label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)' },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl text-center" style={{background: s.bg, border: `1px solid ${s.border}`}}>
                <div className="font-black text-lg" style={{color: s.color}}>{s.range}</div>
                <div className="text-xs font-bold tracking-wider mt-1" style={{color: s.color}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TECH STACK */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-10 rounded-full" style={{background: 'linear-gradient(180deg, #C1E8FF, #5483B3)'}}></div>
            <h2 className="text-2xl font-black tracking-wide" style={sectionTitle}>Technology Stack</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {techStack.map((cat, i) => (
              <div key={i} className="p-5" style={glassCard}>
                <h3 className="font-black text-sm tracking-[0.2em] mb-4" style={{color: '#5483B3'}}>{cat.category.toUpperCase()}</h3>
                <div className="space-y-2">
                  {cat.items.map((item, j) => (
                    <div key={j} className="flex justify-between items-center p-2.5 rounded-lg" style={{
                      background: 'rgba(2, 16, 36, 0.4)',
                      border: '1px solid rgba(84, 131, 179, 0.1)',
                    }}>
                      <span className="font-bold text-xs" style={{color: '#C1E8FF'}}>{item.name}</span>
                      <span className="text-xs" style={{color: '#5483B3'}}>{item.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ARCHITECTURE */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-16 p-8" style={glassCard}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-10 rounded-full" style={{background: 'linear-gradient(180deg, #C1E8FF, #5483B3)'}}></div>
            <h2 className="text-2xl font-black tracking-wide" style={sectionTitle}>System Architecture</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Backend Modules', value: '5', detail: 'engine.py, analyzer.py, graph_gen.py, cve_lookup.py, pdf_generator.py' },
              { label: 'Frontend Components', value: '6', detail: 'App, Hero, Dashboard, GraphView, Navbar, Background' },
              { label: 'Total Codebase', value: '~4,300', detail: 'Lines across 15+ source files in Python & JavaScript' },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-xl text-center" style={{
                background: 'rgba(2, 16, 36, 0.5)',
                border: '1px solid rgba(84, 131, 179, 0.15)',
              }}>
                <div className="font-black text-3xl mb-1" style={{color: '#C1E8FF'}}>{s.value}</div>
                <div className="text-xs font-bold tracking-wider mb-2" style={{color: '#5483B3'}}>{s.label}</div>
                <div className="text-[11px] leading-snug" style={{color: 'rgba(125, 160, 202, 0.6)'}}>{s.detail}</div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl font-mono text-xs leading-relaxed" style={{
            background: 'rgba(2, 16, 36, 0.6)',
            border: '1px solid rgba(84, 131, 179, 0.15)',
            color: 'rgba(193, 232, 255, 0.7)',
          }}>
            <div style={{color: '#5483B3'}}>{'// Data Flow'}</div>
            <div><span style={{color: '#7DA0CA'}}>User Input</span> → <span style={{color: '#C1E8FF'}}>Flask API</span> → <span style={{color: '#7DA0CA'}}>TCP Scanner (Threaded)</span> → <span style={{color: '#C1E8FF'}}>SSE Stream</span></div>
            <div className="ml-4">→ <span style={{color: '#f97316'}}>Kill Chain Analyzer</span> → <span style={{color: '#ef4444'}}>Attack Graph Engine</span></div>
            <div className="ml-4">→ <span style={{color: '#eab308'}}>CVE Enrichment (NVD)</span> → <span style={{color: '#22c55e'}}>Canvas Visualization</span></div>
            <div className="ml-4">→ <span style={{color: '#C1E8FF'}}>PDF Security Report</span></div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MITRE ATT&CK MAPPING */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-16 p-8" style={glassCard}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-10 rounded-full" style={{background: 'linear-gradient(180deg, #ef4444, #f97316)'}}></div>
            <h2 className="text-2xl font-black tracking-wide" style={sectionTitle}>MITRE ATT&amp;CK Integration</h2>
          </div>
          <p className="text-sm mb-5 leading-relaxed" style={{color: 'rgba(193, 232, 255, 0.8)'}}>
            Every attack edge in the graph is annotated with MITRE ATT&amp;CK technique identifiers, categorized into six attack categories:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { category: 'Credential Reuse', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', example: 'T1078 - Valid Accounts' },
              { category: 'Exploitation', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', example: 'T1210 - Exploitation of Remote Services' },
              { category: 'Tunneling', color: '#5483B3', bg: 'rgba(84, 131, 179, 0.15)', example: 'T1572 - Protocol Tunneling' },
              { category: 'Exfiltration', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', example: 'T1048 - Exfiltration Over Alternative Protocol' },
              { category: 'Credential Theft', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', example: 'T1110 - Brute Force' },
              { category: 'Discovery', color: '#7DA0CA', bg: 'rgba(125, 160, 202, 0.1)', example: 'T1046 - Network Service Discovery' },
            ].map((c, i) => (
              <div key={i} className="p-3 rounded-xl" style={{background: c.bg, border: `1px solid ${c.color}30`}}>
                <div className="font-bold text-xs mb-1" style={{color: c.color}}>{c.category}</div>
                <div className="text-[11px] font-mono" style={{color: 'rgba(193, 232, 255, 0.5)'}}>{c.example}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* DISCLAIMER */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="p-6" style={{
          ...glassCard,
          borderColor: 'rgba(234, 179, 8, 0.25)',
          background: 'rgba(234, 179, 8, 0.05)',
        }}>
          <h3 className="font-black text-sm mb-3" style={{color: '#eab308'}}>DISCLAIMER</h3>
          <p className="text-xs leading-relaxed" style={{color: 'rgba(193, 232, 255, 0.7)'}}>
            NET_SCAN is an automated security assessment tool designed for authorized network reconnaissance only. 
            This tool performs passive TCP port scanning and does not exploit any vulnerabilities. 
            Users must obtain explicit written authorization before scanning any network they do not own. 
            The authors are not responsible for misuse of this tool. All findings should be validated by 
            qualified cybersecurity professionals before taking remediation action.
          </p>
        </div>

      </div>
    </div>
  );
};

export default About;
