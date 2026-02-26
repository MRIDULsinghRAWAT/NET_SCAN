import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getScanResults } from '../services/api';

const API = 'http://127.0.0.1:5000';

const ScannerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [target, setTarget] = useState('127.0.0.1');
  const [startPort, setStartPort] = useState(1);
  const [endPort, setEndPort] = useState(1024);
  const [threads, setThreads] = useState(100);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [openPorts, setOpenPorts] = useState({});
  const [allPorts, setAllPorts] = useState({});

  // Refs to keep track of subscriptions / timers
  const eventSourceRef = useRef(null);
  const retriesRef = useRef(0);
  const backoffTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const scanTargetRef = useRef(null);

  // -------- Polling Fallback --------
  const startPolling = useCallback((tgt) => {
    stopPolling();
    const poll = async () => {
      try {
        const statusRes = await axios.get(`${API}/api/scan-status`);
        const status = statusRes.data;

        if (!status.running) {
          try {
            const results = await getScanResults(tgt);
            if (results && results.target === tgt) {
              setData(results);
              setOpenPorts(results.open_ports || results.discovered_services || {});
              setAllPorts(results.all_ports || {});
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
      stopPolling();
    };

    es.onmessage = (e) => {
      try {
        const obj = JSON.parse(e.data);
        if (obj.type === 'port') {
          setOpenPorts((prev) => ({
            ...(prev || {}),
            [obj.port]: {
              port: obj.port,
              service: obj.service,
              status: 'open',
              vulnerabilities: obj.vulnerabilities || []
            }
          }));
          setAllPorts((prev) => ({
            ...(prev || {}),
            [obj.port]: {
              port: obj.port,
              service: obj.service,
              status: 'open',
              vulnerabilities: obj.vulnerabilities || []
            }
          }));
          setData((prev) => {
            const updated = { ...(prev || {}) };
            if (!updated.scan_summary) {
              updated.scan_summary = { total_ports_scanned: 0, open_ports: 0, closed_ports: 0, filtered_ports: 0 };
            }
            updated.scan_summary.open_ports = Object.keys({ ...(prev?.open_ports || {}), [obj.port]: true }).length;
            return updated;
          });
        } else if (obj.type === 'complete') {
          setData((prev) => ({
            target: obj.target,
            open_ports: obj.open_ports || {},
            closed_ports: obj.closed_ports || {},
            filtered_ports: obj.filtered_ports || {},
            all_ports: obj.all_ports || {},
            scan_summary: obj.scan_summary || prev?.scan_summary || {},
          }));
          setOpenPorts(obj.open_ports || {});
          setAllPorts(obj.all_ports || {});
          setLoading(false);
          setConnectionStatus('idle');
          stopPolling();
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

      const maxRetries = 4;
      if (retriesRef.current < maxRetries) {
        const delay = Math.min(15000, Math.pow(2, retriesRef.current) * 1000);
        retriesRef.current += 1;
        backoffTimerRef.current = setTimeout(() => connectStream(tgt), delay);
      } else {
        console.warn('SSE: max retries reached, falling back to polling');
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
    setAllPorts({});
    scanTargetRef.current = target;

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

      setData({
        target,
        scan_summary: {
          total_ports_scanned: 0,
          open_ports: 0,
          closed_ports: 0,
          filtered_ports: 0
        },
        open_ports: {},
        closed_ports: {},
        filtered_ports: {},
        all_ports: {}
      });

      retriesRef.current = 0;
      connectStream(target);
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
    <div className="pt-40 min-h-screen bg-black text-white flex flex-col items-center selection:bg-red-600 pb-20">

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
      <div className="mt-12 w-full max-w-6xl border border-red-900/40 bg-black/80 backdrop-blur-xl p-8 rounded-lg font-mono text-sm shadow-2xl relative overflow-hidden max-h-[700px] flex flex-col">

        {/* Terminal Header Decor */}
        <div className="flex justify-between mb-6 border-b border-red-900/30 pb-3 flex-shrink-0">
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

        {/* Content Area - Scrollable */}
        <div className="overflow-auto flex-1 text-red-500/90 custom-scrollbar pr-3">
          {loading && (
            <div className="animate-pulse space-y-1 text-xs">
              <p>[INFO] Requesting access to main.py...</p>
              <p>[WARN] Scanning subnet for critical paths...</p>
              <p>[INFO] Reading scan_output.json from data folder...</p>
            </div>
          )}

          {error && (
            <div className="text-white bg-red-600/20 border border-red-600 p-4 rounded uppercase font-bold animate-bounce text-xs">
              ERROR: {error}
            </div>
          )}

          {data && (
            <div className="text-green-400 p-3 bg-green-950/20 rounded border border-green-900/30 text-xs space-y-3">
              {/* Scan Summary */}
              <div className="border-b border-green-900/30 pb-3">
                <strong className="text-green-300">Scan Summary:</strong>
                <div className="ml-4 text-xs mt-2 grid grid-cols-2 gap-2">
                  <div>Total Ports: {data.scan_summary?.total_ports_scanned || Object.keys(data.all_ports || {}).length}</div>
                  <div className="text-green-400">
                    Open: <span className="font-bold">{data.scan_summary?.open_ports || Object.keys(data.open_ports || {}).length}</span>
                  </div>
                  <div className="text-yellow-400">
                    Closed: <span className="font-bold">{data.scan_summary?.closed_ports || Object.keys(data.closed_ports || {}).length}</span>
                  </div>
                  <div className="text-orange-400">
                    Filtered: <span className="font-bold">{data.scan_summary?.filtered_ports || Object.keys(data.filtered_ports || {}).length}</span>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-between text-xs border-b border-green-900/30 pb-2">
                <div>
                  <strong>Connection:</strong>{' '}
                  <span className={`ml-2 font-mono ${connectionStatus === 'connected' ? 'text-green-300' : connectionStatus === 'connecting' ? 'text-yellow-300' : 'text-red-300'}`}>
                    {connectionStatus}
                  </span>
                </div>
                <div className="opacity-70">Target: {data.target}</div>
              </div>

              {/* Open Ports Section */}
              {data.open_ports && Object.keys(data.open_ports).length > 0 && (
                <div className="border-l-2 border-green-500 pl-3">
                  <strong className="text-green-300">✓ OPEN PORTS ({Object.keys(data.open_ports).length}):</strong>
                  <div className="mt-2 space-y-1">
                    {Object.entries(data.open_ports)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([p, info]) => {
                        const portInfo = typeof info === 'string' ? { service: info, vulnerabilities: [] } : info;
                        return (
                          <div key={p} className="bg-green-950/30 p-1.5 rounded border border-green-900/50 text-xs">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-green-300">{p}: {portInfo.service || 'Unknown'}</span>
                              <span className="text-green-400 text-xs">OPEN</span>
                            </div>
                            {portInfo.vulnerabilities && portInfo.vulnerabilities.length > 0 && (
                              <div className="mt-0.5 ml-2 text-red-400 text-xs space-y-0.5">
                                {portInfo.vulnerabilities.slice(0, 3).map((vuln, idx) => (
                                  <div key={idx}>⚠ {vuln}</div>
                                ))}
                                {portInfo.vulnerabilities.length > 3 && (
                                  <div className="text-red-500">... +{portInfo.vulnerabilities.length - 3} more</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Closed Ports Section */}
              {data.closed_ports && Object.keys(data.closed_ports).length > 0 && (
                <div className="border-l-2 border-yellow-600 pl-3">
                  <strong className="text-yellow-400">✗ CLOSED PORTS ({Object.keys(data.closed_ports).length}):</strong>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(data.closed_ports)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .slice(0, 20)
                      .map(([p, info]) => {
                        const portInfo = typeof info === 'string' ? { service: info } : info;
                        return (
                          <div key={p} className="text-yellow-600">
                            {p}: {portInfo.service || 'Unknown'}
                          </div>
                        );
                      })}
                    {Object.keys(data.closed_ports).length > 20 && (
                      <div className="text-yellow-600 text-xs italic col-span-2">
                        ... and {Object.keys(data.closed_ports).length - 20} more closed ports
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filtered Ports Section */}
              {data.filtered_ports && Object.keys(data.filtered_ports).length > 0 && (
                <div className="border-l-2 border-orange-600 pl-3">
                  <strong className="text-orange-400">~ FILTERED PORTS ({Object.keys(data.filtered_ports).length}):</strong>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(data.filtered_ports)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .slice(0, 20)
                      .map(([p, info]) => {
                        const portInfo = typeof info === 'string' ? { service: info } : info;
                        return (
                          <div key={p} className="text-orange-600">
                            {p}: {portInfo.service || 'Unknown'}
                          </div>
                        );
                      })}
                    {Object.keys(data.filtered_ports).length > 20 && (
                      <div className="text-orange-600 text-xs italic col-span-2">
                        ... and {Object.keys(data.filtered_ports).length - 20} more filtered ports
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No results yet */}
              {Object.keys(data.open_ports || {}).length === 0 &&
                Object.keys(data.closed_ports || {}).length === 0 &&
                Object.keys(data.filtered_ports || {}).length === 0 && (
                <div className="text-yellow-600 italic text-xs">Awaiting scan results...</div>
              )}
            </div>
          )}

          {!data && !loading && !error && (
            <span className="opacity-40 animate-pulse italic text-xs">
              {">>>"} SYSTEM STANDBY... AWAITING COMMAND: RUN SCAN
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerDashboard;
