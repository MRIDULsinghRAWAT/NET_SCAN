import React, { useState } from 'react';
import axios from 'axios';
import GraphBackground from './GraphBackground';

const Hero = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const triggerScanner = async () => {
    setShowScanner(true);
    setLoading(true);
    setResults(null);

    try {
      const response = await axios.get('http://127.0.0.1:5000/api/start-scan');
      setResults(response.data);
    } catch (err) {
      console.error("Scanner Error:", err);
      setResults({ error: "Failed to connect to backend engine. Check Flask server." });
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-transparent">
      {/* Dynamic IP Graph Background */}
      <GraphBackground />

      <div className="relative z-10 text-center px-4">
        {/* Main Title Block with Glow */}
        <div className="flex flex-col items-center justify-center mb-16 px-4 relative">
          {/* Glow effect behind title */}
          <div className="absolute inset-0 -z-10 blur-[80px]">
            <div className="absolute inset-0 rounded-full" style={{background: 'radial-gradient(ellipse at center, rgba(84,131,179,0.25) 0%, transparent 70%)'}}></div>
          </div>

          <h1 className="text-4xl md:text-7xl lg:text-[7rem] font-black text-white uppercase tracking-tighter leading-[1.1] text-center max-w-screen-xl relative"
              style={{
                background: 'linear-gradient(135deg, #C1E8FF 0%, #7DA0CA 40%, #5483B3 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(84,131,179,0.3))'
              }}>
            NET_SCAN : <br className="hidden md:block" />
            <span className="md:text-6xl lg:text-[5rem] tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #7DA0CA 0%, #5483B3 50%, #C1E8FF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
              Graph-Intelligent Attack Path Analyzer
            </span>
          </h1>
        </div>

        <div className="flex gap-6 justify-center mt-10 md:mt-16 relative z-10">
          <button className="glass-btn px-10 py-3 rounded-full text-xs uppercase">
            INFORMATION
          </button>
          <button
            onClick={triggerScanner}
            className="glass-btn-primary px-10 py-3 rounded-full text-xs uppercase"
          >
            {loading ? "INITIALIZING..." : "VULNERABILITY"}
          </button>
        </div>

        {/* LIVE SCANNER TERMINAL WINDOW */}
        {showScanner && (
          <div className="fixed inset-x-0 bottom-0 h-1/3 z-50 mx-4 mb-4"
               style={{
                 background: 'rgba(2, 16, 36, 0.8)',
                 backdropFilter: 'blur(24px) saturate(1.4)',
                 WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                 border: '1px solid rgba(84, 131, 179, 0.2)',
                 borderRadius: '18px',
                 boxShadow: '0 -8px 40px rgba(2, 16, 36, 0.6), 0 0 30px rgba(84, 131, 179, 0.1)'
               }}>
            <div className="flex justify-between items-center mb-4 pb-2 p-4" style={{borderBottom: '1px solid rgba(84, 131, 179, 0.2)'}}>
              <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{color: '#C1E8FF'}}>
                {loading ? ">>> RUNNING SECURITY ASSESSMENT..." : ">>> SCAN COMPLETED"}
              </span>
              <button
                onClick={() => setShowScanner(false)}
                className="glass-btn px-3 py-1 rounded-lg text-xs hover:scale-110 transition-transform"
              >
                CLOSE [X]
              </button>
            </div>

            <div className="font-mono text-[11px] text-left overflow-y-auto h-full pb-10 custom-scrollbar p-4" style={{color: 'rgba(193, 232, 255, 0.8)'}}>
              {loading ? (
                <div className="animate-pulse">
                  [SYSTEM] Accessing network packets...<br />
                  [SYSTEM] Identifying critical attack paths...<br />
                  [SYSTEM] Fetching vulnerability data from main.py...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">
                  {results ? JSON.stringify(results, null, 2) : "No scan results found."}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Hero;