import React, { useState } from 'react';
import { PrometheusTelemetry } from '../types';
import { Cpu, HardDrive, Network, Activity, Play, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatBytes, formatBitrate, formatUptimeSeconds } from '../utils/formatters';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area } from 'recharts';

interface PrometheusTabProps {
  telemetry: PrometheusTelemetry;
  endpoint: string;
}

export const PrometheusTab: React.FC<PrometheusTabProps> = ({ telemetry, endpoint }) => {
  const { nodeMetrics, history, isLive } = telemetry;

  const [customQuery, setCustomQuery] = useState('100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)');
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const chartData = (history || []).map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    cpu: h.cpu,
    memory: h.memory,
    netRxMb: Number((h.netRx / (1024 * 1024)).toFixed(2)),
    netTxMb: Number((h.netTx / (1024 * 1024)).toFixed(2)),
    load: h.load1,
  }));

  const handleRunQuery = async (queryText = customQuery) => {
    setIsQuerying(true);
    setQueryError(null);
    try {
      const res = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'prometheus',
          url: `${endpoint.replace(/\/+$/, '')}/api/v1/query?query=${encodeURIComponent(queryText)}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.sampleData) {
        setQueryResult(data.sampleData);
      } else {
        setQueryError(data.message || 'Failed to evaluate PromQL query');
        setQueryResult(data.sampleData || null);
      }
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setIsQuerying(false);
    }
  };

  const presetQueries = [
    { name: 'CPU Usage %', query: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)' },
    { name: 'RAM Available', query: 'node_memory_MemAvailable_bytes' },
    { name: 'Disk Free %', query: '(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100' },
    { name: 'Rx Network Rate', query: 'sum(rate(node_network_receive_bytes_total[1m]))' },
    { name: 'Load Average 1m', query: 'node_load1' },
  ];

  return (
    <div className="space-y-4 font-mono">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0D1117] text-[#4F9CF9] border border-[#30363D]">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">PROMETHEUS TSDB & NODE EXPORTER</h2>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">{nodeMetrics.instanceName} • ENDPOINT: {endpoint}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`px-2 py-0.5 uppercase font-bold text-white ${
            isLive ? 'bg-[#238636]' : 'bg-[#D29922]'
          }`}>
            {isLive ? '● LIVE PROMETHEUS' : '○ FALLBACK TSDB'}
          </span>
          <span className="text-[#8B949E] bg-[#0D1117] px-2 py-0.5 border border-[#30363D]">
            UPTIME: {formatUptimeSeconds(nodeMetrics.uptimeSeconds)}
          </span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Cpu className="h-3.5 w-3.5 text-[#4F9CF9]" /> CPU UTILIZATION
            </span>
            <span className="text-[#4F9CF9] font-bold">{nodeMetrics.cpuPercent}%</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {nodeMetrics.cpuPercent}%
          </div>
          <div className="mt-2 w-full bg-[#0D1117] h-1.5">
            <div
              className={`h-full ${
                nodeMetrics.cpuPercent > 85 ? 'bg-[#F85149]' : nodeMetrics.cpuPercent > 70 ? 'bg-[#D29922]' : 'bg-[#4F9CF9]'
              }`}
              style={{ width: `${nodeMetrics.cpuPercent}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>LOAD 1M: {nodeMetrics.load1}</span>
            <span>LOAD 15M: {nodeMetrics.load15}</span>
          </div>
        </div>

        {/* Memory */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Activity className="h-3.5 w-3.5 text-[#7EE787]" /> MEMORY (RAM)
            </span>
            <span className="text-[#7EE787] font-bold">{nodeMetrics.memoryPercent}%</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {formatBytes(nodeMetrics.memoryUsedBytes)}
          </div>
          <div className="mt-2 w-full bg-[#0D1117] h-1.5">
            <div
              className={`h-full ${
                nodeMetrics.memoryPercent > 85 ? 'bg-[#F85149]' : 'bg-[#7EE787]'
              }`}
              style={{ width: `${nodeMetrics.memoryPercent}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>USED: {formatBytes(nodeMetrics.memoryUsedBytes)}</span>
            <span>TOTAL: {formatBytes(nodeMetrics.memoryTotalBytes)}</span>
          </div>
        </div>

        {/* Disk */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <HardDrive className="h-3.5 w-3.5 text-[#D29922]" /> STORAGE (/)
            </span>
            <span className="text-[#D29922] font-bold">{nodeMetrics.diskPercent}%</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {formatBytes(nodeMetrics.diskUsedBytes)}
          </div>
          <div className="mt-2 w-full bg-[#0D1117] h-1.5">
            <div
              className="bg-[#D29922] h-full"
              style={{ width: `${nodeMetrics.diskPercent}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>USED: {formatBytes(nodeMetrics.diskUsedBytes)}</span>
            <span>TOTAL: {formatBytes(nodeMetrics.diskTotalBytes)}</span>
          </div>
        </div>

        {/* Network I/O */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Network className="h-3.5 w-3.5 text-[#4F9CF9]" /> NETWORK BANDWIDTH
            </span>
            <span className="text-[#4F9CF9] font-bold">I/O</span>
          </div>
          <div className="text-xl font-bold text-white mt-1">
            RX: {formatBitrate(nodeMetrics.networkRxBytesPerSec)}
          </div>
          <div className="text-xs text-[#8B949E] mt-1">
            TX: {formatBitrate(nodeMetrics.networkTxBytesPerSec)}
          </div>
          <div className="mt-3 text-[10px] text-[#8B949E] flex justify-between">
            <span>LOAD 5M: {nodeMetrics.load5}</span>
            <span>INTERVAL: 4S</span>
          </div>
        </div>
      </div>

      {/* Real-Time Prometheus Multi-Metric Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU & Memory Trends */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between mb-3 border-b border-[#30363D] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-[#4F9CF9]" />
              CPU & MEMORY HISTORY (%)
            </h3>
            <span className="text-[10px] text-[#8B949E]">50 SAMPLES</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
                <XAxis dataKey="time" stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#161B22', borderColor: '#30363D', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace', color: '#E0E0E0' }} />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#4F9CF9" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="memory" name="Memory %" stroke="#7EE787" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Bandwidth Trends */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between mb-3 border-b border-[#30363D] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Network className="h-3.5 w-3.5 text-[#D29922]" />
              NETWORK TRAFFIC HISTORY (MB/S)
            </h3>
            <span className="text-[10px] text-[#8B949E]">node_network_bytes</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="promRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F9CF9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4F9CF9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="promTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D29922" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D29922" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
                <XAxis dataKey="time" stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} unit=" MB/s" />
                <Tooltip contentStyle={{ backgroundColor: '#161B22', borderColor: '#30363D', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace', color: '#E0E0E0' }} />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="netRxMb" name="RX (MB/s)" stroke="#4F9CF9" fill="url(#promRx)" strokeWidth={1.5} isAnimationActive={false} />
                <Area type="monotone" dataKey="netTxMb" name="TX (MB/s)" stroke="#D29922" fill="url(#promTx)" strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PromQL Interactive Query Console */}
      <div className="bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center justify-between mb-3 border-b border-[#30363D] pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-[#4F9CF9]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">INTERACTIVE PROMQL QUERY RUNNER</h3>
          </div>
          <span className="text-[10px] text-[#8B949E] uppercase">Real-time instant query evaluation</span>
        </div>

        {/* Preset query chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {presetQueries.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setCustomQuery(p.query);
                handleRunQuery(p.query);
              }}
              className="px-2 py-1 text-[10px] uppercase bg-[#0D1117] hover:bg-[#21262D] text-[#E0E0E0] border border-[#30363D] transition-all"
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Query Input Bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="e.g. 100 - (avg(rate(node_cpu_seconds_total{mode='idle'}[1m])) * 100)"
            className="flex-1 px-3 py-2 bg-[#0D1117] border border-[#30363D] text-white font-mono text-[11px] focus:outline-none focus:border-[#4F9CF9] transition-colors"
          />
          <button
            onClick={() => handleRunQuery()}
            disabled={isQuerying}
            className="px-4 py-2 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] text-[#4F9CF9] font-bold text-[11px] uppercase flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Play className={`h-3 w-3 ${isQuerying ? 'animate-spin' : ''}`} />
            <span>{isQuerying ? 'EVALUATING...' : 'RUN QUERY'}</span>
          </button>
        </div>

        {/* Error or Result Display */}
        {queryError && (
          <div className="mt-3 p-2.5 bg-[#0D1117] border border-[#F85149] text-[#F85149] text-[10px] flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{queryError}</span>
          </div>
        )}

        {queryResult && (
          <div className="mt-3 bg-[#0D1117] p-3 border border-[#30363D] overflow-x-auto max-h-60">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363D] text-[10px] text-[#8B949E]">
              <span className="flex items-center gap-1 text-[#7EE787] font-bold">
                <CheckCircle2 className="h-3 w-3" />
                STATUS: {queryResult.status || 'OK'}
              </span>
              <span>TYPE: {queryResult.data?.resultType || 'vector'}</span>
            </div>
            <pre className="text-[10px] font-mono text-[#7EE787] whitespace-pre-wrap">
              {JSON.stringify(queryResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

