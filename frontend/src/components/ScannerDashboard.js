import React, { useState } from 'react';
import axios from 'axios';

const ScannerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [target, setTarget] = useState('127.0.0.1');
  const [startPort, setStartPort] = useState(1);
  const [endPort, setEndPort] = useState(1024);
  const [threads, setThreads] = useState(100);

  const startScan = async () => {
    // 1. Instant Feedback
    console.log(">>> Button Clicked: Starting Request...");
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      // 2. Direct Backend Call with user parameters (POST)
      const payload = {
        target,
        start: Number(startPort),
        end: Number(endPort),
        threads: Number(threads),
      };

      const res = await axios.post('http://127.0.0.1:5000/api/start-scan', payload, {
        timeout: 120000 // allow up to 2 minutes for longer scans
      });

      console.log('>>> Data Received:', res.data);
      setData(res.data);
    } catch (err) {
      console.error('>>> Scanner Error:', err);
      setError(err.response?.data?.message || err.message || 'Backend Offline: Check your Flask Terminal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-40 min-h-screen bg-black text-white flex flex-col items-center selection:bg-red-600">
      
      {/* Dynamic Header */}
      <h1 className={`text-4xl font-black mb-10 tracking-widest border-b-4 border-red-600 ${loading ? 'animate-pulse text-red-500' : ''}`}>
        ADVANCED SCANNER ENGINE
      </h1>
      
      {/* Input Controls */}
      <div className="flex gap-3 mb-6">
        <input className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target IP (e.g. 192.168.1.10)"
        />
        <input className="w-24 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm"
          type="number" value={startPort} onChange={(e) => setStartPort(e.target.value)}
          min={1} max={65535} placeholder="Start"
        />
        <input className="w-24 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm"
          type="number" value={endPort} onChange={(e) => setEndPort(e.target.value)}
          min={1} max={65535} placeholder="End"
        />
        <input className="w-24 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm"
          type="number" value={threads} onChange={(e) => setThreads(e.target.value)}
          min={1} max={1000} placeholder="Threads"
        />
      </div>

      {/* Trigger Button */}
      <button 
        onClick={startScan}
        disabled={loading}
        className={`px-10 py-4 font-bold rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg ${
          loading 
          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
          : "bg-red-600 hover:bg-red-700 hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]"
        }`}
      >
          {loading ? ">>> SCANNING NETWORK..." : "LAUNCH SYSTEM SCAN"}
      </button>

      {/* Terminal Display */}
      <div className="mt-12 w-full max-w-5xl border border-red-900/40 bg-black/80 backdrop-blur-xl p-8 rounded-lg font-mono text-sm shadow-2xl relative overflow-hidden">
        
        {/* Terminal Header Decor */}
        <div className="flex justify-between mb-6 border-b border-red-900/30 pb-3">
          <p className="text-red-500 font-bold tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
            LIVE ATTACK PATH OUTPUT
          </p>
          <div className="flex gap-2 opacity-50">
            <div className="w-3 h-3 bg-red-900 rounded-full"></div>
            <div className="w-3 h-3 bg-red-700 rounded-full"></div>
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
        </div>

        {/* Content Area */}
        <pre className="overflow-auto max-h-[450px] leading-relaxed text-red-500/90 custom-scrollbar">
          {loading && (
            <div className="animate-pulse space-y-1">
              <p>[INFO] Requesting access to main.py...</p>
              <p>[WARN] Scanning subnet for critical paths...</p>
              <p>[INFO] Reading scan_output.json from data folder...</p>
            </div>
          )}
          
          {error && (
            <div className="text-white bg-red-600/20 border border-red-600 p-4 rounded uppercase font-bold animate-bounce">
              ERROR: {error}
            </div>
          )}
          
          {data && (
            <div className="text-green-400 p-2 bg-green-950/20 rounded border border-green-900/30">
              {JSON.stringify(data, null, 2)}
            </div>
          )}

          {!data && !loading && !error && (
            <span className="opacity-40 animate-pulse italic">
              {">>>"} SYSTEM STANDBY... AWAITING COMMAND: RUN SCAN
            </span>
          )}
        </pre>
      </div>
    </div>
  );
};

export default ScannerDashboard;