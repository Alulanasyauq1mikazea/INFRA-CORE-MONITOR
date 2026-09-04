import React, { useState } from 'react';
import { MikroTikTelemetry } from '../types';
import { Radio, ArrowDownLeft, ArrowUpRight, Cpu, Thermometer, Shield, Network, Activity, Search } from 'lucide-react';
import { formatBytes, formatBitrate } from '../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface MikroTikTabProps {
  telemetry: MikroTikTelemetry;
  host: string;
}

export const MikroTikTab: React.FC<MikroTikTabProps> = ({ telemetry, host }) => {
  const { system, interfaces, dhcpLeases, trafficHistory, isLive } = telemetry;
  const [interfaceFilter, setInterfaceFilter] = useState('');
  const [dhcpFilter, setDhcpFilter] = useState('');

  const chartData = (trafficHistory || []).map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    rxMb: Number((t.totalRxBps / (1024 * 1024)).toFixed(2)),
    txMb: Number((t.totalTxBps / (1024 * 1024)).toFixed(2)),
  }));

  const filteredInterfaces = (interfaces || []).filter((i) =>
    i.name.toLowerCase().includes(interfaceFilter.toLowerCase()) ||
    (i.comment && i.comment.toLowerCase().includes(interfaceFilter.toLowerCase()))
  );

  const filteredDhcp = (dhcpLeases || []).filter((l) =>
    l.address.includes(dhcpFilter) ||
    (l.hostName && l.hostName.toLowerCase().includes(dhcpFilter.toLowerCase())) ||
    (l.macAddress && l.macAddress.toLowerCase().includes(dhcpFilter.toLowerCase()))
  );

  return (
    <div className="space-y-4 font-mono">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0D1117] text-[#D29922] border border-[#30363D]">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white">{system.boardName}</h2>
              <span className="text-[9px] px-1.5 py-0.2 bg-[#0D1117] text-[#D29922] border border-[#30363D]">
                ROUTEROS {system.version}
              </span>
            </div>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">{system.model} • TARGET: {host}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`px-2 py-0.5 uppercase font-bold text-white ${
            isLive ? 'bg-[#238636]' : 'bg-[#D29922]'
          }`}>
            {isLive ? '● LIVE REST API' : '○ FALLBACK ROUTEROS'}
          </span>
          <span className="text-[#8B949E] bg-[#0D1117] px-2 py-0.5 border border-[#30363D]">
            UPTIME: {system.uptime}
          </span>
        </div>
      </div>

      {/* Hardware Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU & Frequency */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Cpu className="h-3.5 w-3.5 text-[#D29922]" /> CPU CORE LOAD
            </span>
            <span className="text-[#D29922] font-bold">{system.cpuLoad}%</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {system.cpuLoad}%
          </div>
          <div className="mt-2 w-full bg-[#0D1117] h-1.5">
            <div
              className="bg-[#D29922] h-full"
              style={{ width: `${system.cpuLoad}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>CORES: {system.cpuCount}X @ {system.cpuFrequencyMhz}MHZ</span>
          </div>
        </div>

        {/* Memory */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Activity className="h-3.5 w-3.5 text-[#4F9CF9]" /> FREE MEMORY
            </span>
            <span className="text-[#4F9CF9] font-bold">
              {Math.round((system.freeMemoryBytes / system.totalMemoryBytes) * 100)}% FREE
            </span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {formatBytes(system.freeMemoryBytes)}
          </div>
          <div className="mt-2 w-full bg-[#0D1117] h-1.5">
            <div
              className="bg-[#4F9CF9] h-full"
              style={{ width: `${100 - (system.freeMemoryBytes / system.totalMemoryBytes) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>TOTAL: {formatBytes(system.totalMemoryBytes)}</span>
          </div>
        </div>

        {/* Temperature & Health */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Thermometer className="h-3.5 w-3.5 text-[#F85149]" /> THERMAL & PSU
            </span>
            <span className="text-[#F85149] font-bold">{system.temperatureCelsius || 41}°C</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {system.temperatureCelsius || 41}°C
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>VOLTAGE: {system.voltageVolts || 24.2}V</span>
            <span className="text-[#7EE787]">PSU NOMINAL</span>
          </div>
          <div className="mt-1 text-[9px] text-[#8B949E]">
            HDD: {formatBytes(system.freeHddBytes)} FREE
          </div>
        </div>

        {/* Firewall Connection Tracking */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Shield className="h-3.5 w-3.5 text-[#7EE787]" /> CONNECTIONS
            </span>
            <span className="text-[#7EE787] font-bold">FASTTRACK</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {system.activeConnections}
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>STATE: ESTABLISHED</span>
            <span className="text-[#4F9CF9]">TRACKING ON</span>
          </div>
          <div className="mt-1 text-[9px] text-[#8B949E]">
            NAT TRANSLATION ACTIVE
          </div>
        </div>
      </div>

      {/* Live Interface Bandwidth Area Chart */}
      <div className="bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center justify-between mb-3 border-b border-[#30363D] pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-[#D29922]" />
              AGGREGATE ROUTER THROUGHPUT (MB/S)
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Total RX / TX Rates across physical ports</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="text-[#4F9CF9] flex items-center gap-1">● TOTAL RX</span>
            <span className="text-[#D29922] flex items-center gap-1">● TOTAL TX</span>
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="mktRx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F9CF9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4F9CF9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mktTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D29922" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#D29922" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="time" stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} unit=" MB/s" />
              <Tooltip contentStyle={{ backgroundColor: '#161B22', borderColor: '#30363D', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace', color: '#E0E0E0' }} />
              <Area type="monotone" dataKey="rxMb" name="RX (MB/s)" stroke="#4F9CF9" fill="url(#mktRx)" strokeWidth={1.5} isAnimationActive={false} />
              <Area type="monotone" dataKey="txMb" name="TX (MB/s)" stroke="#D29922" fill="url(#mktTx)" strokeWidth={1.5} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interfaces Telemetry Table */}
      <div className="bg-[#161B22] border border-[#30363D]">
        <div className="p-3 border-b border-[#30363D] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Network className="h-3.5 w-3.5 text-[#D29922]" />
              ROUTER INTERFACES & TRAFFIC MONITOR
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Per-interface physical link status, throughput, and packet rates</p>
          </div>
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Filter interfaces..."
              value={interfaceFilter}
              onChange={(e) => setInterfaceFilter(e.target.value)}
              className="pl-7 pr-3 py-1 bg-[#0D1117] border border-[#30363D] text-[11px] text-white focus:outline-none focus:border-[#D29922]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-[#E0E0E0]">
            <thead className="bg-[#0D1117] text-[#8B949E] uppercase text-[10px] tracking-wider border-b border-[#30363D]">
              <tr>
                <th className="px-4 py-2.5">INTERFACE</th>
                <th className="px-4 py-2.5">TYPE</th>
                <th className="px-4 py-2.5">LINK STATUS</th>
                <th className="px-4 py-2.5">DOWNLOAD (RX)</th>
                <th className="px-4 py-2.5">UPLOAD (TX)</th>
                <th className="px-4 py-2.5">PACKETS/SEC</th>
                <th className="px-4 py-2.5">COMMENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]/60 font-mono">
              {filteredInterfaces.map((item) => (
                <tr key={item.name} className="hover:bg-[#0D1117]/60 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-white">
                    {item.name}
                  </td>
                  <td className="px-4 py-2.5 text-[#8B949E]">
                    <span className="px-1.5 py-0.2 bg-[#0D1117] text-[9px] text-[#8B949E] border border-[#30363D]">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {item.running ? (
                      <span className="flex items-center gap-1.5 text-[#7EE787] text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#7EE787]" />
                        RUNNING
                      </span>
                    ) : item.disabled ? (
                      <span className="text-[#8B949E] text-[10px]">DISABLED</span>
                    ) : (
                      <span className="text-[#D29922] text-[10px]">NO LINK</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[#4F9CF9] font-bold">
                    <div className="flex items-center gap-1">
                      <ArrowDownLeft className="h-3 w-3" />
                      {formatBitrate(item.rxBytesPerSec)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[#D29922] font-bold">
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {formatBitrate(item.txBytesPerSec)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[#8B949E] text-[10px]">
                    RX: {item.rxPacketsPerSec} / TX: {item.txPacketsPerSec}
                  </td>
                  <td className="px-4 py-2.5 text-[#8B949E] text-[10px]">
                    {item.comment || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DHCP Active Leases Table */}
      <div className="bg-[#161B22] border border-[#30363D]">
        <div className="p-3 border-b border-[#30363D] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Network className="h-3.5 w-3.5 text-[#4F9CF9]" />
              ACTIVE DHCP LEASES & NETWORK CLIENTS
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">IP to MAC bindings assigned by DHCP Server</p>
          </div>
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Search hostname or IP..."
              value={dhcpFilter}
              onChange={(e) => setDhcpFilter(e.target.value)}
              className="pl-7 pr-3 py-1 bg-[#0D1117] border border-[#30363D] text-[11px] text-white focus:outline-none focus:border-[#4F9CF9]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-[#E0E0E0]">
            <thead className="bg-[#0D1117] text-[#8B949E] uppercase text-[10px] tracking-wider border-b border-[#30363D]">
              <tr>
                <th className="px-4 py-2.5">IP ADDRESS</th>
                <th className="px-4 py-2.5">MAC ADDRESS</th>
                <th className="px-4 py-2.5">HOSTNAME</th>
                <th className="px-4 py-2.5">DHCP SERVER</th>
                <th className="px-4 py-2.5">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]/60 font-mono">
              {filteredDhcp.map((lease, idx) => (
                <tr key={idx} className="hover:bg-[#0D1117]/60 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-[#4F9CF9]">{lease.address}</td>
                  <td className="px-4 py-2.5 text-[#8B949E]">{lease.macAddress}</td>
                  <td className="px-4 py-2.5 font-bold text-white">{lease.hostName}</td>
                  <td className="px-4 py-2.5 text-[#8B949E]">{lease.server || 'dhcp1'}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-[#238636] text-white">
                      {lease.status}
                    </span>
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

