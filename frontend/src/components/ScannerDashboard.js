import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getScanResults } from '../services/api';
import GraphView from './Graphview';

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
  const [graphData, setGraphData] = useState(null);
  const [exposure, setExposure] = useState(null);
  const [attackChains, setAttackChains] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [showGraph, setShowGraph] = useState(false);

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
        }
        else if (obj.type === 'analysis') {
          console.log('>>> Received analysis:', obj);
          setAnalysisData(obj.analysis);
        }
        else if (obj.type === 'graph') {
          console.log('>>> Received graph data:', obj);
          setGraphData(obj.graph);
          setExposure(obj.exposure_score);
          setAttackChains(obj.attack_chains);
          setShowGraph(true);  // AUTO-SHOW GRAPH!
          console.log('>>> Graph tab activated automatically');
        }
        else if (obj.type === 'complete') {
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
    setGraphData(null);
    setExposure(null);
    setAttackChains(null);
    setAnalysisData(null);
    setShowGraph(false);
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

      {/* Terminal Display OR Graph View */}
      <div className="mt-8 w-full max-w-7xl border border-red-900/40 bg-black/80 backdrop-blur-xl p-6 rounded-lg font-mono text-sm shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col">

        {/* Tab Navigation */}
        {graphData && (
          <div className="flex gap-2 mb-4 border-b border-red-900/30 pb-3 flex-shrink-0">
            <button
              onClick={() => setShowGraph(false)}
              className={`px-4 py-2 font-bold transition-all ${
                !showGraph
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 text-gray-400 hover:text-white'
              }`}
            >
              PORT RESULTS
            </button>
            <button
              onClick={() => setShowGraph(true)}
              className={`px-4 py-2 font-bold transition-all ${
                showGraph
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 text-gray-400 hover:text-white'
              }`}
            >
              ATTACK GRAPH
            </button>
          </div>
        )}

        {/* Terminal Header */}
        {!showGraph && (
          <div className="flex justify-between mb-4 border-b border-red-900/30 pb-3 flex-shrink-0">
            <p className="text-red-500 font-bold tracking-widest text-lg flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
              SCAN RESULTS
            </p>
            <div className="flex gap-2 opacity-50">
              <div className="w-2.5 h-2.5 bg-red-900 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-red-700 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="overflow-auto flex-1 text-red-500/90 custom-scrollbar pr-3">
          {showGraph && graphData ? (
            <GraphView graphData={graphData} exposure={exposure} attackChains={attackChains} />
          ) : (
            <>
              {loading && (
            <div className="animate-pulse space-y-2 text-sm">
              <p>[...] Scanning network...</p>
              <p>[...] Analyzing ports...</p>
            </div>
          )}

          {error && (
            <div className="text-white bg-red-600/30 border border-red-600 p-3 rounded text-sm font-bold">
              ERROR: {error}
            </div>
          )}

          {data && (
            <div className="text-green-400 bg-green-950/10 rounded border border-green-900/30 p-3 space-y-3">

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 text-sm pb-3 border-b border-green-900/20">
                <div className="bg-green-950/20 p-2 rounded">
                  <div className="text-green-300 font-bold text-lg">{data.scan_summary?.total_ports_scanned || 0}</div>
                  <div className="text-xs text-green-500">Total Ports</div>
                </div>
                <div className="bg-green-950/20 p-2 rounded">
                  <div className="text-green-400 font-bold text-lg">{data.scan_summary?.open_ports || 0}</div>
                  <div className="text-xs text-green-500">Open Ports</div>
                </div>
                <div className="bg-green-950/20 p-2 rounded">
                  <div className="text-yellow-400 font-bold text-lg">{data.scan_summary?.closed_ports || 0}</div>
                  <div className="text-xs text-yellow-500">Closed + Filtered</div>
                </div>
                <div className="bg-blue-950/20 p-2 rounded">
                  <div className="text-blue-400 font-bold text-lg">{data.target}</div>
                  <div className="text-xs text-blue-500">Target IP</div>
                </div>
                <div className="bg-green-950/20 p-2 rounded col-span-2">
                  <div className={`font-bold text-lg ${connectionStatus === 'connected' ? 'text-green-300' : connectionStatus === 'connecting' ? 'text-yellow-300' : 'text-red-300'}`}>{connectionStatus}</div>
                  <div className="text-xs text-green-500">Connection Status</div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-2 gap-4">

                {/* LEFT COLUMN - Open Ports */}
                {data.open_ports && Object.keys(data.open_ports).length > 0 && (
                  <div className="border-l-2 border-green-500 pl-3 py-2">
                    <strong className="text-green-300 text-base block mb-2">OPEN PORTS ({Object.keys(data.open_ports).length}):</strong>
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {Object.entries(data.open_ports)
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([p, info]) => {
                          const portInfo = typeof info === 'string' ? { service: info, vulnerabilities: [] } : info;
                          return (
                            <div key={p} className="text-sm bg-green-950/40 p-2 rounded">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-green-300 font-bold text-base">{p}</span>
                                <span className="text-green-400 text-xs font-bold">{portInfo.service || 'Unknown'}</span>
                              </div>
                              {portInfo.vulnerabilities && portInfo.vulnerabilities.length > 0 && (
                                <div className="text-red-400 text-xs ml-2 space-y-0.5">
                                  {portInfo.vulnerabilities.slice(0, 2).map((vuln, idx) => (
                                    <div key={idx}>- {vuln}</div>
                                  ))}
                                  {portInfo.vulnerabilities.length > 2 && (
                                    <div className="text-red-500">+{portInfo.vulnerabilities.length - 2} more</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* RIGHT COLUMN - Closed and Filtered Ports */}
                <div className="space-y-3">

                  {/* Closed Ports */}
                  {data.closed_ports && Object.keys(data.closed_ports).length > 0 && (
                    <div className="border-l-2 border-yellow-600 pl-3 py-2">
                      <strong className="text-yellow-400 text-base block mb-2">CLOSED PORTS ({Object.keys(data.closed_ports).length}):</strong>
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {Object.entries(data.closed_ports)
                          .sort((a, b) => Number(a[0]) - Number(b[0]))
                          .slice(0, 60)
                          .map(([p]) => (
                            <div key={p} className="text-yellow-600 bg-yellow-950/30 px-2 py-1.5 rounded text-center text-sm font-semibold border border-yellow-900/50 hover:bg-yellow-950/50 transition">
                              {p}
                            </div>
                          ))}
                      </div>
                      {Object.keys(data.closed_ports).length > 60 && (
                        <div className="text-yellow-600 text-sm text-center italic mt-2">
                          +{Object.keys(data.closed_ports).length - 60} more
                        </div>
                      )}
                    </div>
                  )}

                  {/* Filtered Ports */}
                  {data.filtered_ports && Object.keys(data.filtered_ports).length > 0 && (
                    <div className="border-l-2 border-orange-600 pl-3 py-2">
                      <strong className="text-orange-400 text-base block mb-2">FILTERED PORTS ({Object.keys(data.filtered_ports).length}):</strong>
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {Object.entries(data.filtered_ports)
                          .sort((a, b) => Number(a[0]) - Number(b[0]))
                          .slice(0, 60)
                          .map(([p]) => (
                            <div key={p} className="text-orange-600 bg-orange-950/30 px-2 py-1.5 rounded text-center text-sm font-semibold border border-orange-900/50 hover:bg-orange-950/50 transition">
                              {p}
                            </div>
                          ))}
                      </div>
                      {Object.keys(data.filtered_ports).length > 60 && (
                        <div className="text-orange-600 text-sm text-center italic mt-2">
                          +{Object.keys(data.filtered_ports).length - 60} more
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>

              {/* Empty State */}
              {Object.keys(data.open_ports || {}).length === 0 &&
                Object.keys(data.closed_ports || {}).length === 0 &&
                Object.keys(data.filtered_ports || {}).length === 0 && (
                <div className="text-yellow-600 italic text-base text-center py-4">Awaiting scan results...</div>
              )}
            </div>
          )}

          {!data && !loading && !error && (
            <span className="opacity-40 animate-pulse italic text-base">
              {">>>"} READY FOR SCAN
            </span>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerDashboard;
