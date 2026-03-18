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
    setResults(null); // Purana data clear karne ke liye
    
    try {
      // Backend api/start-scan ko call karna
      // Ensure kar ki tera Flask server port 5000 par chal raha hai
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
        {/* Project Branding */}
        <h1 className="text-6xl md:text-8xl font-black text-white mb-4 tracking-tighter uppercase">
          NET_SCAN : <span className="text-gray-600">Graph Intelligent Attack Path Analyzer</span>
        </h1>
        <p className="text-xl text-gray-400 font-bold mb-10 tracking-[0.3em] uppercase">
          Mridul | Shiva | Akshat
        </p>

        <div className="flex gap-6 justify-center">
          <button className="px-10 py-3 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all font-black text-xs tracking-widest uppercase">
            INFORMATION
          </button>
          <button 
            onClick={triggerScanner}
            className="px-10 py-3 bg-white text-black rounded-full hover:bg-red-600 hover:text-white transition-all font-black text-xs tracking-widest uppercase shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {loading ? "INITIALIZING..." : "VULNERABILITY"}
          </button>
        </div>

        {/* 🛠️ LIVE SCANNER TERMINAL WINDOW */}
        {showScanner && (
          <div className="fixed inset-x-0 bottom-0 h-1/3 bg-black/95 border-t border-red-900/50 p-6 z-50 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <span className="text-red-500 font-mono text-xs font-bold tracking-widest uppercase">
                {loading ? ">>> RUNNING SECURITY ASSESSMENT..." : ">>> SCAN COMPLETED"}
              </span>
              <button 
                onClick={() => setShowScanner(false)} 
                className="text-white hover:text-red-500 font-black text-xs tracking-tighter"
              >
                CLOSE [X]
              </button>
            </div>
            
            <div className="font-mono text-[11px] text-red-400 text-left overflow-y-auto h-full pb-10 custom-scrollbar">
              {loading ? (
                <div className="animate-pulse">
                  [SYSTEM] Accessing network packets...<br/>
                  [SYSTEM] Identifying critical attack paths...<br/>
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