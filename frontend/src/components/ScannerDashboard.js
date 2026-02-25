import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:5000';

const ScannerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [target, setTarget] = useState('127.0.0.1');
  const [startPort, setStartPort] = useState(1);
  const [endPort, setEndPort] = useState(1024);
  const [threads, setThreads] = useState(100);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle | connecting | connected | disconnected
  const [openPorts, setOpenPorts] = useState({});

  // Refs to keep track of subscriptions / timers
  const eventSourceRef = useRef(null);
  const retriesRef = useRef(0);
  const backoffTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const scanTargetRef = useRef(null); // track the current scan target

  // -------- Polling Fallback --------
  // If SSE disconnects, poll the backend for the status and results
  const startPolling = useCallback((tgt) => {
    stopPolling();
    const poll = async () => {
      try {
        // Check scan status
        const statusRes = await axios.get(`${API}/api/scan-status`);
        const status = statusRes.data;

        if (!status.running) {
          // Scan finished — fetch the final results
          try {
            const resultsRes = await axios.get(`${API}/api/start-scan`);
            const results = resultsRes.data;
            if (results && results.target === tgt) {
              setData(results);
              setOpenPorts(results.discovered_services || {});
            }
          } catch (e) {
            console.warn('Could not fetch final results', e);
          }
          setLoading(false);
          setConnectionStatus('idle');
          stopPolling();
          return;
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
      // Schedule next poll
      pollTimerRef.current = setTimeout(poll, 2000);
    };
    pollTimerRef.current = setTimeout(poll, 2000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // -------- SSE Stream --------
  const connectStream = useCallback((tgt) => {
    setConnectionStatus('connecting');
    const es = new EventSource(`${API}/api/scan-stream?target=${encodeURIComponent(tgt)}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionStatus('connected');
      retriesRef.current = 0;
      // Stop polling since SSE is working
      stopPolling();
    };

    es.onmessage = (e) => {
      try {
        const obj = JSON.parse(e.data);
        if (obj.type === 'port') {
          setOpenPorts((prev) => ({ ...(prev || {}), [obj.port]: obj.service }));
          setData((prev) => ({
            ...(prev || {}),
            discovered_services: {
              ...(prev?.discovered_services || {}),
              [obj.port]: obj.service,
            },
          }));
        } else if (obj.type === 'complete') {
          setData({
            target: obj.target,
            discovered_services: obj.discovered_services || {},
          });
          setOpenPorts(obj.discovered_services || {});
          setLoading(false);
          setConnectionStatus('idle');
          stopPolling();
          // close ES after a short delay
          setTimeout(() => {
            try { es.close(); } catch (ex) { }
            eventSourceRef.current = null;
          }, 200);
          if (backoffTimerRef.current) {
            clearTimeout(backoffTimerRef.current);
            backoffTimerRef.current = null;
          }
        }
      } catch (err) {
        console.error('SSE parse error', err, e.data);
      }
    };

    es.onerror = (err) => {
      console.error('SSE connection error', err);
      setConnectionStatus('disconnected');
      try { es.close(); } catch (ex) { }
      eventSourceRef.current = null;

      // attempt reconnect with exponential backoff
      const maxRetries = 4;
      if (retriesRef.current < maxRetries) {
        const delay = Math.min(15000, Math.pow(2, retriesRef.current) * 1000);
        retriesRef.current += 1;
        backoffTimerRef.current = setTimeout(() => connectStream(tgt), delay);
      } else {
        console.warn('SSE: max retries reached, falling back to polling');
        // Fall back to polling for results
        startPolling(tgt);
      }
    };
  }, [stopPolling, startPolling]);

  // -------- Start Scan --------
  const startScan = async () => {
    console.log(">>> Button Clicked: Starting Request...");
    setLoading(true);
    setError(null);
    setData(null);
    setOpenPorts({});
    scanTargetRef.current = target;

    // Close any existing SSE connection and stop polling
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch (e) { }
      eventSourceRef.current = null;
    }
    if (backoffTimerRef.current) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }
    stopPolling();

    try {
      const payload = {
        target,
        start: Number(startPort),
        end: Number(endPort),
        threads: Number(threads),
      };

      const res = await axios.post(`${API}/api/start-scan`, payload, {
        timeout: 120000,
      });

      console.log('>>> Start response:', res.status, res.data);

      // Initialize display with the new target
      setData({ target, discovered_services: {} });

      // Start listening to SSE for live updates
      retriesRef.current = 0;
      connectStream(target);

      // Also start polling as a safety net in case SSE fails immediately
      startPolling(target);
    } catch (err) {
      console.error('>>> Scanner Error:', err);
      setError(
        err.response?.data?.message || err.message || 'Backend Offline: Check your Flask Terminal.'
      );
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch (e) { }
      }
      if (backoffTimerRef.current) {
        clearTimeout(backoffTimerRef.current);
      }
      stopPolling();
    };
  }, [stopPolling]);

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
        className={`px-10 py-4 font-bold rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg ${loading
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
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <strong>Connection:</strong>{' '}
                  <span className={`ml-2 font-mono ${connectionStatus === 'connected' ? 'text-green-300' : connectionStatus === 'connecting' ? 'text-yellow-300' : 'text-red-300'}`}>
                    {connectionStatus}
                  </span>
                </div>
                <div className="text-sm opacity-70">Target: {data.target}</div>
              </div>

              <div className="mb-3">
                <strong>Open Ports:</strong>
                {Object.keys(openPorts || {}).length > 0 ? (
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {Object.entries(openPorts).sort((a, b) => Number(a[0]) - Number(b[0])).map(([p, s]) => (
                      <li key={p}>{p}: {s}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="italic opacity-60 mt-1">No open ports discovered yet.</div>
                )}
              </div>

              <div className="text-xs opacity-80">
                <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
              </div>
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