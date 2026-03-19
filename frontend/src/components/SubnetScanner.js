import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import NetworkTopology from './NetworkTopology';

const API = 'http://127.0.0.1:5000';

const SubnetScanner = () => {
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [threads, setThreads] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [topologyData, setTopologyData] = useState(null);
  const [subnetInfo, setSubnetInfo] = useState(null);
  const [discoveredHosts, setDiscoveredHosts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const eventSourceRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Polling fallback
  const startPolling = useCallback((sub) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    const poll = async () => {
      try {
        const statusRes = await axios.get(`${API}/api/subnet-status`);
        if (!statusRes.data.running) {
          // Fetch final results
          try {
            const results = await axios.get(`${API}/api/subnet-scan`);
            if (results.data && results.data.topology) {
              setTopologyData(results.data.topology);
              setSubnetInfo({
                subnet: results.data.subnet,
                hosts_found: results.data.hosts_found,
                scan_time: results.data.scan_time,
              });
            }
          } catch (e) {
            console.warn('Could not fetch subnet results', e);
          }
          setLoading(false);
          setConnectionStatus('idle');
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          return;
        }
      } catch (e) {
        console.warn('Subnet poll error:', e);
      }
      pollTimerRef.current = setTimeout(poll, 3000);
    };
    pollTimerRef.current = setTimeout(poll, 3000);
  }, []);

  // SSE stream connection
  const connectStream = useCallback((streamKey) => {
    setConnectionStatus('connecting');
    const es = new EventSource(`${API}/api/subnet-stream?key=${encodeURIComponent(streamKey)}`);
    eventSourceRef.current = es;

    es.onopen = () => setConnectionStatus('connected');

    es.onmessage = (e) => {
      try {
        const obj = JSON.parse(e.data);

        if (obj.type === 'host_discovered') {
          setDiscoveredHosts(prev => [...prev, obj.host]);
        }
        else if (obj.type === 'subnet_complete') {
          setTopologyData(obj.topology);
          setSubnetInfo({
            subnet: obj.subnet,
            hosts_found: obj.hosts_found,
          });
          setLoading(false);
          setConnectionStatus('idle');
          try { es.close(); } catch (ex) {}
          eventSourceRef.current = null;
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        }
      } catch (err) {
        console.error('Subnet SSE parse error', err);
      }
    };

    es.onerror = () => {
      setConnectionStatus('disconnected');
      try { es.close(); } catch (ex) {}
      eventSourceRef.current = null;
    };
  }, []);

  const startSubnetScan = async () => {
    setLoading(true);
    setError(null);
    setTopologyData(null);
    setSubnetInfo(null);
    setDiscoveredHosts([]);

    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch (e) {}
      eventSourceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    try {
      const res = await axios.post(`${API}/api/subnet-scan`, {
        subnet,
        threads: Number(threads),
      }, { timeout: 120000 });

      console.log('>>> Subnet scan started:', res.data);

      if (res.data.stream_key) {
        connectStream(res.data.stream_key);
      }
      startPolling(subnet);
    } catch (err) {
      console.error('>>> Subnet scan error:', err);
      setError(err.response?.data?.error || err.message || 'Backend offline');
      setLoading(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) try { eventSourceRef.current.close(); } catch (e) {}
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  return (
    <div className="pt-40 min-h-screen bg-black text-white flex flex-col items-center selection:bg-cyan-600 pb-20">

      <h1 className={`text-4xl font-black mb-10 tracking-widest border-b-4 border-cyan-600 ${loading ? 'animate-pulse text-cyan-500' : ''}`}>
        SUBNET SCANNER
      </h1>

      {/* Input Controls */}
      <div className="flex gap-3 mb-6 flex-wrap justify-center">
        <input
          className="px-4 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm w-64"
          value={subnet}
          onChange={(e) => setSubnet(e.target.value)}
          placeholder="Subnet (e.g. 192.168.1.0/24)"
        />
        <input
          className="w-24 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm"
          type="number"
          value={threads}
          onChange={(e) => setThreads(e.target.value)}
          min={1} max={50}
          placeholder="Threads"
        />
        <button
          onClick={startSubnetScan}
          disabled={loading}
          className={`px-10 py-3 font-bold rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg ${
            loading
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-cyan-600 hover:bg-cyan-700 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
          }`}
        >
          {loading ? ">>> SCANNING SUBNET..." : "SCAN SUBNET"}
        </button>
      </div>

      {/* Common subnet shortcuts */}
      <div className="flex gap-2 mb-8 flex-wrap justify-center">
        {['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24', '172.16.0.0/24'].map(s => (
          <button
            key={s}
            onClick={() => setSubnet(s)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              subnet === s ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700' : 'bg-zinc-900 text-gray-500 border border-zinc-800 hover:text-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="w-full max-w-7xl mb-4 text-white bg-red-600/30 border border-red-600 p-3 rounded text-sm font-bold">
          ERROR: {error}
        </div>
      )}

      {/* Live host discovery feed */}
      {loading && discoveredHosts.length > 0 && (
        <div className="w-full max-w-7xl mb-4 border border-cyan-900/40 bg-black/80 rounded-lg p-4 max-h-48 overflow-y-auto">
          <div className="text-cyan-400 font-bold text-xs tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            LIVE DISCOVERY ({discoveredHosts.length} hosts found)
          </div>
          <div className="space-y-1 font-mono text-xs">
            {discoveredHosts.map((host, i) => (
              <div key={i} className="flex gap-4 text-green-400">
                <span className="text-cyan-400">[+]</span>
                <span className="text-white font-bold w-36">{host.ip}</span>
                <span className="text-gray-400">{host.hostname}</span>
                <span className="text-yellow-400">{host.port_count} ports</span>
                <span style={{ color: host.risk_level === 'Critical' ? '#ef4444' : host.risk_level === 'High' ? '#f97316' : '#eab308' }}>
                  {host.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && discoveredHosts.length === 0 && (
        <div className="w-full max-w-7xl mb-4 border border-cyan-900/40 bg-black/80 rounded-lg p-6 text-center">
          <div className="animate-pulse text-cyan-400 font-mono">
            <p>[...] Scanning subnet for live hosts...</p>
            <p className="text-gray-500 text-xs mt-2">This may take a minute depending on subnet size</p>
          </div>
        </div>
      )}

      {/* Network Topology Visualization */}
      {topologyData && (
        <div className="w-full max-w-7xl shadow-2xl">
          <NetworkTopology topologyData={topologyData} subnetInfo={subnetInfo} />
        </div>
      )}
    </div>
  );
};

export default SubnetScanner;
