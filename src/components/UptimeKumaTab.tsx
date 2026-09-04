import React, { useState } from 'react';
import { UptimeKumaTelemetry } from '../types';
import { Clock, CheckCircle2, XCircle, Shield, Globe, Search } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface UptimeKumaTabProps {
  telemetry: UptimeKumaTelemetry;
  endpoint: string;
}

export const UptimeKumaTab: React.FC<UptimeKumaTabProps> = ({ telemetry, endpoint }) => {
  const { overallUptimePercent, upCount, downCount, monitors, latencyHistory, isLive } = telemetry;
  const [filterName, setFilterName] = useState('');

  const chartData = (latencyHistory || []).map((l) => ({
    time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: l.avgLatency,
  }));

  const filteredMonitors = (monitors || []).filter(
    (m) =>
      m?.name?.toLowerCase().includes(filterName.toLowerCase()) ||
      m?.url?.toLowerCase().includes(filterName.toLowerCase()) ||
      (m?.tags && m.tags.some((t) => t?.toLowerCase().includes(filterName.toLowerCase())))
  );

  return (
    <div className="space-y-4 font-mono">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0D1117] text-[#7EE787] border border-[#30363D]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white">UPTIME KUMA AVAILABILITY</h2>
              <span className="text-[9px] px-1.5 py-0.2 bg-[#0D1117] text-[#7EE787] border border-[#30363D]">
                {overallUptimePercent}% UPTIME
              </span>
            </div>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">TARGET: {endpoint} • SYNTHETIC HEARTBEAT</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`px-2 py-0.5 uppercase font-bold text-white ${
            isLive ? 'bg-[#238636]' : 'bg-[#D29922]'
          }`}>
            {isLive ? '● LIVE HEARTBEAT API' : '○ SIMULATED UPTIME'}
          </span>
          <span className="text-[#8B949E] bg-[#0D1117] px-2 py-0.5 border border-[#30363D]">
            {monitors.length} MONITORS
          </span>
        </div>
      </div>

      {/* Monitor Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Operational / UP */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold text-[#7EE787]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#7EE787]" /> OPERATIONAL SERVICES
            </span>
            <span className="text-[#7EE787] font-bold">UP</span>
          </div>
          <div className="text-3xl font-bold text-[#7EE787] mt-1">
            {upCount} <span className="text-xs font-normal text-[#8B949E]">/ {monitors.length}</span>
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E]">
            {((upCount / (monitors.length || 1)) * 100).toFixed(1)}% OF FLEET ONLINE
          </div>
        </div>

        {/* Down / Incidents */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold text-[#F85149]">
              <XCircle className="h-3.5 w-3.5 text-[#F85149]" /> OUTAGES / DEGRADED
            </span>
            <span className="text-[#F85149] font-bold">DOWN</span>
          </div>
          <div className="text-3xl font-bold text-[#F85149] mt-1">
            {downCount}
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E]">
            {downCount === 0 ? 'NO ACTIVE OUTAGES' : 'ACTION RECOMMENDED'}
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold text-[#4F9CF9]">
              <Globe className="h-3.5 w-3.5 text-[#4F9CF9]" /> AVERAGE RESPONSE
            </span>
            <span className="text-[#4F9CF9] font-bold">RTT</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {Math.round(monitors.reduce((acc, m) => acc + (m.ping || 0), 0) / (monitors.length || 1))}ms
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E]">
            HTTP/TCP HEARTBEATS
          </div>
        </div>

        {/* Overall 30d Uptime */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold text-[#4F9CF9]">
              <Shield className="h-3.5 w-3.5 text-[#4F9CF9]" /> 30-DAY SLA
            </span>
            <span className="text-[#4F9CF9] font-bold">SLA</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            99.94%
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E]">
            TARGET SLA: 99.90%
          </div>
        </div>
      </div>

      {/* Latency History Line Chart */}
      <div className="bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center justify-between mb-3 border-b border-[#30363D] pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[#7EE787]" />
              SERVICE HEARTBEAT RESPONSE LATENCY (MS)
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Real-time latency fluctuation across synthetic healthchecks</p>
          </div>
          <span className="text-[10px] text-[#7EE787] font-bold uppercase">● LIVE FEED</span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="time" stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} unit="ms" />
              <Tooltip contentStyle={{ backgroundColor: '#161B22', borderColor: '#30363D', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace', color: '#E0E0E0' }} />
              <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#7EE787" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monitors List Table */}
      <div className="bg-[#161B22] border border-[#30363D]">
        <div className="p-3 border-b border-[#30363D] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-[#7EE787]" />
              ACTIVE UPTIME MONITORS & SSL STATUS
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Status, response time, and SSL certificate health</p>
          </div>
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Search monitors or tags..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="pl-7 pr-3 py-1 bg-[#0D1117] border border-[#30363D] text-[11px] text-white focus:outline-none focus:border-[#7EE787]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-[#E0E0E0]">
            <thead className="bg-[#0D1117] text-[#8B949E] uppercase text-[10px] tracking-wider border-b border-[#30363D]">
              <tr>
                <th className="px-4 py-2.5">MONITOR</th>
                <th className="px-4 py-2.5">TYPE</th>
                <th className="px-4 py-2.5">STATUS</th>
                <th className="px-4 py-2.5">PING LATENCY</th>
                <th className="px-4 py-2.5">24H UPTIME</th>
                <th className="px-4 py-2.5">SSL CERT</th>
                <th className="px-4 py-2.5">TAGS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]/60 font-mono">
              {filteredMonitors.map((m) => (
                <tr key={m.id} className="hover:bg-[#0D1117]/60 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-white">{m.name}</div>
                    <div className="text-[10px] text-[#8B949E] truncate max-w-xs">{m.url}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[#8B949E]">
                    <span className="px-1.5 py-0.2 bg-[#0D1117] text-[9px] uppercase font-bold text-[#8B949E] border border-[#30363D]">
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {m.status === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 text-[9px] font-bold uppercase bg-[#238636] text-white">
                        <span className="h-1 w-1 rounded-full bg-white" />
                        UP
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 text-[9px] font-bold uppercase bg-[#F85149] text-white">
                        <span className="h-1 w-1 rounded-full bg-white" />
                        DOWN
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[#4F9CF9] font-bold">
                    {m.ping}ms
                  </td>
                  <td className="px-4 py-2.5 text-[#E0E0E0]">
                    {m.uptime24h}%
                  </td>
                  <td className="px-4 py-2.5">
                    {m.certExpiryDays !== null && m.certExpiryDays !== undefined ? (
                      <span
                        className={`px-1.5 py-0.2 text-[9px] border ${
                          m.certExpiryDays < 15
                            ? 'bg-[#0D1117] text-[#F85149] border-[#F85149]'
                            : m.certExpiryDays < 30
                            ? 'bg-[#0D1117] text-[#D29922] border-[#D29922]'
                            : 'bg-[#0D1117] text-[#8B949E] border-[#30363D]'
                        }`}
                      >
                        {m.certExpiryDays} DAYS
                      </span>
                    ) : (
                      <span className="text-[#8B949E] text-[9px]">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {m.tags?.map((t) => (
                        <span key={t} className="px-1.5 py-0.2 text-[9px] bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

