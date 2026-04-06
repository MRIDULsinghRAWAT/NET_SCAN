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
  const [threads, setThreads] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [openPorts, setOpenPorts] = useState({});
  const [allPorts, setAllPorts] = useState({});
  const [graphData, setGraphData] = useState(null);
  const [exposure, setExposure] = useState(null);
  const [attackChains, setAttackChains] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showLateral, setShowLateral] = useState(false);
  const [cveData, setCveData] = useState(null);

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
          if (obj.cve_data) setCveData(obj.cve_data);
          console.log('>>> Graph data ready, lateral movement button will appear');
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
    setShowLateral(false);
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

  // -------- Download Report --------
  const downloadReport = async () => {
    try {
      window.open(`${API}/api/download-report`, '_blank');
    } catch (e) {
      console.error(e);
      alert('Failed to download report.');
    }
  };

  /* ═════════════════════════════════════════════════════════════
     GLASS STAT CARD — reusable inline style helper
     ═════════════════════════════════════════════════════════════ */
  const glassStatStyle = {
    background: 'rgba(5, 38, 89, 0.35)',
    border: '1px solid rgba(84, 131, 179, 0.18)',
    borderRadius: '14px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 1px 0 rgba(193, 232, 255, 0.05)',
  };

  return (
    <div className="pt-40 min-h-screen text-white flex flex-col items-center pb-20 relative" style={{background: 'transparent'}}>
      {/* Glow elements for Scanner page */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-80 h-80 rounded-full blur-[100px] opacity-25 animate-pulse" style={{background: 'radial-gradient(circle, rgba(84,131,179,0.4) 0%, transparent 70%)'}}></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-20 animate-pulse" style={{background: 'radial-gradient(circle, rgba(5,38,89,0.5) 0%, transparent 70%)', animationDelay: '1s'}}></div>
      </div>

      {/* Dynamic Header with Glow */}
      <div className="relative mb-10">
        <div className="absolute inset-0 -z-10 blur-[60px]">
          <div className="absolute inset-0 rounded-full" style={{background: 'radial-gradient(ellipse at center, rgba(84,131,179,0.2) 0%, transparent 70%)'}}></div>
        </div>
        <h1 className="text-4xl font-black tracking-widest gradient-text inline-block pb-2" style={{borderBottom: '4px solid #5483B3'}}>
          ADVANCED SCANNER ENGINE
        </h1>
      </div>

      {/* Input Controls — Glass Card */}
      <div className="flex gap-3 mb-6 p-5 w-full max-w-4xl" style={{
        ...glassStatStyle,
        borderRadius: '18px',
      }}>
        <input className="px-4 py-2.5 rounded-xl text-sm flex-grow"
          style={{
            background: 'rgba(2, 16, 36, 0.6)',
            border: '1px solid rgba(84, 131, 179, 0.2)',
            color: '#C1E8FF',
            backdropFilter: 'blur(8px)',
          }}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target IP (e.g. 192.168.1.10)"
        />
        <input className="w-24 px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: 'rgba(2, 16, 36, 0.6)',
            border: '1px solid rgba(84, 131, 179, 0.2)',
            color: '#C1E8FF',
          }}
          type="number" value={startPort} onChange={(e) => setStartPort(e.target.value)}
          min={1} max={65535} placeholder="Start"
        />
        <input className="w-24 px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: 'rgba(2, 16, 36, 0.6)',
            border: '1px solid rgba(84, 131, 179, 0.2)',
            color: '#C1E8FF',
          }}
          type="number" value={endPort} onChange={(e) => setEndPort(e.target.value)}
          min={1} max={65535} placeholder="End"
        />
        <input className="w-24 px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: 'rgba(2, 16, 36, 0.6)',
            border: '1px solid rgba(84, 131, 179, 0.2)',
            color: '#C1E8FF',
          }}
          type="number" value={threads} onChange={(e) => setThreads(e.target.value)}
          min={1} max={1000} placeholder="Threads"
        />
      </div>

      {/* Trigger Buttons */}
      <div className="flex gap-4">
        <button
          onClick={startScan}
          disabled={loading}
          className={`glass-btn-primary px-10 py-4 font-bold rounded-xl transition-all duration-300 transform active:scale-95 ${loading
            ? "opacity-50 cursor-not-allowed"
            : ""
            }`}
        >
          {loading ? ">>> SCANNING NETWORK..." : "LAUNCH SYSTEM SCAN"}
        </button>

        {!loading && data && data.open_ports && Object.keys(data.open_ports).length > 0 && (
          <button
            onClick={downloadReport}
            className="glass-btn px-8 py-4 font-bold rounded-xl transition-all duration-300 transform active:scale-95"
          >
            DOWNLOAD PDF REPORT
          </button>
        )}
      </div>

      {/* ====== INLINE GRAPH VIEW ====== */}
      {graphData && (
        <div className="mt-8 w-full max-w-7xl z-10 relative" style={{
          background: 'rgba(2, 16, 36, 0.45)',
          border: '1px solid rgba(84, 131, 179, 0.15)',
          borderRadius: '18px',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 0 50px rgba(5, 38, 89, 0.4), 0 8px 32px rgba(2, 16, 36, 0.6)',
        }}>
          <GraphView graphData={graphData} exposure={exposure} attackChains={attackChains} cveData={cveData} />
        </div>
      )}

      {/* Terminal Display — Glass Panel */}
      <div className="mt-8 w-full max-w-7xl p-6 relative overflow-hidden max-h-[85vh] flex flex-col z-10 font-mono text-sm"
           style={{
             background: 'rgba(2, 16, 36, 0.5)',
             border: '1px solid rgba(84, 131, 179, 0.15)',
             borderRadius: '18px',
             backdropFilter: 'blur(18px) saturate(1.3)',
             WebkitBackdropFilter: 'blur(18px) saturate(1.3)',
             boxShadow: '0 0 50px rgba(5, 38, 89, 0.4), 0 8px 32px rgba(2, 16, 36, 0.6), inset 0 1px 0 rgba(193, 232, 255, 0.05)',
           }}>

        {/* Terminal Header */}
        <div className="flex justify-between mb-4 pb-3 flex-shrink-0" style={{borderBottom: '1px solid rgba(84, 131, 179, 0.2)'}}>
          <p className="font-bold tracking-widest text-lg flex items-center gap-2" style={{color: '#C1E8FF'}}>
            <span className="w-2 h-2 rounded-full animate-ping" style={{background: '#5483B3'}}></span>
            SCAN RESULTS
          </p>
          <div className="flex gap-2 opacity-50">
            <div className="w-2.5 h-2.5 rounded-full" style={{background: '#C1E8FF'}}></div>
            <div className="w-2.5 h-2.5 rounded-full" style={{background: '#7DA0CA'}}></div>
            <div className="w-2.5 h-2.5 rounded-full" style={{background: '#5483B3'}}></div>
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-auto flex-1 custom-scrollbar pr-3" style={{color: 'rgba(193, 232, 255, 0.9)'}}>
          <>
            {loading && (
              <div className="animate-pulse space-y-2 text-sm">
                <p>[...] Scanning network...</p>
                <p>[...] Analyzing ports...</p>
              </div>
            )}

            {error && (
              <div className="text-white p-3 rounded-xl text-sm font-bold" style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}>
                ERROR: {error}
              </div>
            )}


            {data && (
              <div className="rounded p-3 space-y-3" style={{color: '#C1E8FF'}}>

                {/* Stats Bar — Glass Cards */}
                <div className="grid grid-cols-3 gap-4 text-sm pb-3" style={{borderBottom: '1px solid rgba(84, 131, 179, 0.15)'}}>
                  <div className="p-3 rounded-xl hover:scale-[1.02] transition-all cursor-default" style={glassStatStyle}>
                    <div className="font-bold text-lg" style={{color: '#C1E8FF'}}>{data.scan_summary?.total_ports_scanned || 0}</div>
                    <div className="text-xs" style={{color: 'rgba(125, 160, 202, 0.6)'}}>Total Ports</div>
                  </div>
                  <div className="p-3 rounded-xl hover:scale-[1.02] transition-all cursor-default" style={glassStatStyle}>
                    <div className="font-bold text-lg" style={{color: '#C1E8FF'}}>{data.scan_summary?.open_ports || 0}</div>
                    <div className="text-xs" style={{color: 'rgba(125, 160, 202, 0.6)'}}>Open Ports</div>
                  </div>
                  <div className="p-3 rounded-xl hover:scale-[1.02] transition-all cursor-default" style={glassStatStyle}>
                    <div className="font-bold text-lg" style={{color: '#7DA0CA'}}>{data.scan_summary?.closed_ports || 0}</div>
                    <div className="text-xs" style={{color: 'rgba(125, 160, 202, 0.6)'}}>Closed + Filtered</div>
                  </div>
                  <div className="p-3 rounded-xl hover:scale-[1.02] transition-all cursor-default" style={glassStatStyle}>
                    <div className="font-bold text-lg" style={{color: '#7DA0CA'}}>{data.target}</div>
                    <div className="text-xs" style={{color: 'rgba(125, 160, 202, 0.6)'}}>Target IP</div>
                  </div>
                  <div className="p-3 rounded-xl hover:scale-[1.02] transition-all cursor-default col-span-2" style={glassStatStyle}>
                    <div className={`font-bold text-lg`} style={{
                      color: connectionStatus === 'connected' ? '#C1E8FF' : connectionStatus === 'connecting' ? '#7DA0CA' : '#5483B3'
                    }}>{connectionStatus}</div>
                    <div className="text-xs" style={{color: 'rgba(125, 160, 202, 0.6)'}}>Connection Status</div>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-4">

                  {/* LEFT COLUMN - Open Ports */}
                  {data.open_ports && Object.keys(data.open_ports).length > 0 && (
                    <div className="py-2 pl-3" style={{borderLeft: '2px solid #5483B3'}}>
                      <strong className="text-base block mb-2" style={{color: '#C1E8FF'}}>OPEN PORTS ({Object.keys(data.open_ports).length}):</strong>
                      <div className="space-y-1.5 max-h-96 overflow-y-auto">
                        {Object.entries(data.open_ports)
                          .sort((a, b) => Number(a[0]) - Number(b[0]))
                          .map(([p, info]) => {
                            const portInfo = typeof info === 'string' ? { service: info, vulnerabilities: [] } : info;
                            return (
                              <div key={p} className="text-sm p-3 rounded-xl transition-all hover:scale-[1.01]" style={{
                                ...glassStatStyle,
                              }}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-base" style={{color: '#C1E8FF'}}>{p}</span>
                                  <span className="text-xs font-bold" style={{color: '#7DA0CA'}}>{portInfo.service || 'Unknown'}</span>
                                </div>
                                {portInfo.vulnerabilities && portInfo.vulnerabilities.length > 0 && (
                                  <div className="text-xs ml-2 space-y-0.5" style={{color: '#FF6B8A'}}>
                                    {portInfo.vulnerabilities.slice(0, 2).map((vuln, idx) => (
                                      <div key={idx}>- {vuln}</div>
                                    ))}
                                    {portInfo.vulnerabilities.length > 2 && (
                                      <div style={{color: '#FF6B8A'}}>+{portInfo.vulnerabilities.length - 2} more</div>
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
                      <div className="py-2 pl-3" style={{borderLeft: '2px solid #7DA0CA'}}>
                        <strong className="text-base block mb-2" style={{color: '#7DA0CA'}}>CLOSED PORTS ({Object.keys(data.closed_ports).length}):</strong>
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {Object.entries(data.closed_ports)
                            .sort((a, b) => Number(a[0]) - Number(b[0]))
                            .slice(0, 60)
                            .map(([p]) => (
                              <div key={p} className="px-2 py-1.5 rounded-lg text-center text-sm font-semibold transition-all hover:scale-105" style={{
                                background: 'rgba(5, 38, 89, 0.4)',
                                border: '1px solid rgba(125, 160, 202, 0.2)',
                                color: '#7DA0CA',
                                backdropFilter: 'blur(8px)',
                              }}>
                                {p}
                              </div>
                            ))}
                        </div>
                        {Object.keys(data.closed_ports).length > 60 && (
                          <div className="text-sm text-center italic mt-2" style={{color: '#7DA0CA'}}>
                            +{Object.keys(data.closed_ports).length - 60} more
                          </div>
                        )}
                      </div>
                    )}

                    {/* Filtered Ports */}
                    {data.filtered_ports && Object.keys(data.filtered_ports).length > 0 && (
                      <div className="py-2 pl-3" style={{borderLeft: '2px solid #5483B3'}}>
                        <strong className="text-base block mb-2" style={{color: '#5483B3'}}>FILTERED PORTS ({Object.keys(data.filtered_ports).length}):</strong>
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {Object.entries(data.filtered_ports)
                            .sort((a, b) => Number(a[0]) - Number(b[0]))
                            .slice(0, 60)
                            .map(([p]) => (
                              <div key={p} className="px-2 py-1.5 rounded-lg text-center text-sm font-semibold transition-all hover:scale-105" style={{
                                background: 'rgba(5, 38, 89, 0.3)',
                                border: '1px solid rgba(84, 131, 179, 0.2)',
                                color: '#5483B3',
                                backdropFilter: 'blur(8px)',
                              }}>
                                {p}
                              </div>
                            ))}
                        </div>
                        {Object.keys(data.filtered_ports).length > 60 && (
                          <div className="text-sm text-center italic mt-2" style={{color: '#5483B3'}}>
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
                    <div className="italic text-base text-center py-4" style={{color: '#5483B3'}}>Awaiting scan results...</div>
                  )}
              </div>
            )}

            {!data && !loading && !error && (
              <span className="opacity-40 animate-pulse italic text-base">
                {">>>"} READY FOR SCAN
              </span>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

export default ScannerDashboard;
