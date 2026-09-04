import React from 'react';
import { 
  FullTelemetrySnapshot, 
  AlertItem 
} from '../types';
import { 
  Cpu, 
  Radio, 
  ShieldCheck, 
  Clock, 
  Server, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertCircle, 
  Check, 
  Trash2,
  ExternalLink,
  Zap,
  Globe
} from 'lucide-react';
import { formatBytes, formatBitrate, formatRelativeTime } from '../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface OverviewTabProps {
  snapshot: FullTelemetrySnapshot;
  onAckAlert: (id: string) => void;
  onClearAlerts: () => void;
  onSelectTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  snapshot,
  onAckAlert,
  onClearAlerts,
  onSelectTab,
}) => {
  const { prometheus, mikrotik, crowdsec, uptimeKuma, proxmox, activeAlerts, collectors } = snapshot;

  // Prepare combined network traffic history
  const trafficData = (mikrotik?.trafficHistory || []).map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    rx: t.totalRxBps / (1024 * 1024), // MB/s
    tx: t.totalTxBps / (1024 * 1024), // MB/s
  }));

  const unackAlerts = (activeAlerts || []).filter((a) => !a?.acknowledged);

  return (
    <div className="space-y-4 font-mono">
      {/* Active Incident Alert Banner if unacknowledged alerts exist */}
      {unackAlerts.length > 0 && (
        <div className="bg-[#161B22] border border-[#F85149] p-4">
          <div className="flex items-center justify-between gap-4 mb-3 border-b border-[#30363D] pb-2">
            <div className="flex items-center gap-2 text-[#F85149] font-bold text-xs uppercase tracking-widest">
              <span className="h-2 w-2 rounded-full bg-[#F85149] animate-ping" />
              <span>ACTIVE THREAT ALERTS ({unackAlerts.length} UNACKNOWLEDGED)</span>
            </div>
            <button
              onClick={onClearAlerts}
              className="flex items-center gap-1 text-[10px] uppercase text-[#E0E0E0] px-2.5 py-1 bg-[#0D1117] hover:bg-[#F85149] hover:text-white border border-[#30363D] transition-all"
            >
              <Trash2 className="h-3 w-3" />
              <span>Dismiss All</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {unackAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className="bg-[#0D1117] border-l-2 border-[#F85149] border-y border-r border-[#30363D] p-2.5 flex items-start justify-between gap-2 text-[11px]"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="uppercase text-[9px] px-1.5 py-0.2 font-bold bg-[#F85149]/20 text-[#F85149] border border-[#F85149]/40">
                      {alert.source}
                    </span>
                    <span className="font-bold text-white">{alert.title}</span>
                  </div>
                  <p className="text-[#8B949E] text-[10px] leading-relaxed">{alert.message}</p>
                  <span className="text-[9px] text-[#8B949E] mt-1 block">{formatRelativeTime(alert.timestamp)}</span>
                </div>
                <button
                  onClick={() => onAckAlert(alert.id)}
                  className="p-1 bg-[#161B22] hover:bg-[#238636] hover:text-white text-[#8B949E] border border-[#30363D] transition-all shrink-0"
                  title="Acknowledge Alert"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Clean Minimalism Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Proxmox VE Section */}
        <section 
          onClick={() => onSelectTab('proxmox')}
          className="bg-[#161B22] border border-[#30363D] p-4 flex flex-col justify-between cursor-pointer hover:border-[#4F9CF9] transition-all group"
        >
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-[#30363D] pb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#4F9CF9] flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" /> PROXMOX VE (PVE)
              </h2>
              <span className={`text-[9px] px-2 py-0.5 uppercase font-bold text-white ${proxmox.isLive ? 'bg-[#238636]' : 'bg-[#D29922]'}`}>
                {proxmox.cluster.nodesOnline} NODES {proxmox.isLive ? 'ONLINE' : 'DEMO'}
              </span>
            </div>
            <div className="space-y-3 mt-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8B949E]">CLUSTER CPU</span>
                  <span className="text-white font-bold">{proxmox.cluster.totalCpuPercent}%</span>
                </div>
                <div className="w-full bg-[#0D1117] h-1.5">
                  <div className="bg-[#4F9CF9] h-full" style={{ width: `${proxmox.cluster.totalCpuPercent}%` }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8B949E]">MEMORY ALLOC</span>
                  <span className="text-white font-bold">{proxmox.cluster.totalMemPercent}%</span>
                </div>
                <div className="w-full bg-[#0D1117] h-1.5">
                  <div className="bg-[#4F9CF9] h-full" style={{ width: `${proxmox.cluster.totalMemPercent}%` }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8B949E]">VMS & LXC CONTAINERS</span>
                  <span className="text-[#7EE787] font-bold">{proxmox.cluster.vmsRunning + proxmox.cluster.lxcsRunning} RUNNING / {proxmox.cluster.vmsTotal + proxmox.cluster.lxcsTotal}</span>
                </div>
                <div className="w-full bg-[#0D1117] h-1.5">
                  <div className="bg-[#7EE787] h-full" style={{ width: `${Math.min(100, ((proxmox.cluster.vmsRunning + proxmox.cluster.lxcsRunning) / Math.max(1, proxmox.cluster.vmsTotal + proxmox.cluster.lxcsTotal)) * 100)}%` }}></div>
                </div>
              </div>

              {/* 4 Servers Mini Matrix */}
              <div className="pt-2 border-t border-[#30363D]/60 grid grid-cols-4 gap-1.5 text-[9px]">
                {(proxmox.nodes || []).slice(0, 4).map((node, idx) => (
                  <div key={node.name || idx} className="bg-[#0D1117] p-1.5 border border-[#30363D] text-center">
                    <div className="text-[#8B949E] uppercase truncate">NODE-0{idx + 1}</div>
                    <div className="text-white font-bold text-[10px] mt-0.5">{node.cpuPercent}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#30363D] flex justify-between text-[10px] text-[#8B949E]">
            <span>{proxmox.nodes?.length || 4} SERVERS • {proxmox.vms?.length || 24} GUESTS</span>
            <span className="text-[#4F9CF9] group-hover:underline">VIEW HYPERVISORS →</span>
          </div>
        </section>

        {/* 2. MikroTik API Section */}
        <section 
          onClick={() => onSelectTab('mikrotik')}
          className="bg-[#161B22] border border-[#30363D] p-4 flex flex-col justify-between cursor-pointer hover:border-[#D29922] transition-all group"
        >
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-[#30363D] pb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#D29922] flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5" /> MIKROTIK API
              </h2>
              <span className="text-[10px] text-[#8B949E] uppercase">{mikrotik.system.model}</span>
            </div>
            <div className="flex flex-col justify-center items-center py-2">
              <div className="text-3xl font-bold text-white mb-1">
                {formatBitrate(mikrotik.interfaces[0]?.rxBytesPerSec || 0)}
              </div>
              <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">CURRENT WAN THROUGHPUT (INBOUND)</p>
              
              <div className="w-full grid grid-cols-2 gap-2 mt-4 text-[11px]">
                <div className="bg-[#0D1117] p-2 border border-[#30363D]">
                  <span className="text-[9px] text-[#8B949E] block uppercase">ROUTER CPU</span>
                  <span className="text-white font-bold">{mikrotik.system.cpuLoad}%</span>
                </div>
                <div className="bg-[#0D1117] p-2 border border-[#30363D]">
                  <span className="text-[9px] text-[#8B949E] block uppercase">FASTTRACK CONNS</span>
                  <span className="text-[#7EE787] font-bold">{mikrotik.system.activeConnections}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#30363D] flex justify-between text-[10px] text-[#8B949E]">
            <span>ROUTEROS {mikrotik.system.version}</span>
            <span className="text-[#D29922] group-hover:underline">VIEW INTERFACES →</span>
          </div>
        </section>

        {/* 3. CrowdSec Security Section */}
        <section 
          onClick={() => onSelectTab('crowdsec')}
          className="bg-[#161B22] border border-[#30363D] p-4 flex flex-col justify-between cursor-pointer hover:border-[#F85149] transition-all group"
        >
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-[#30363D] pb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#F85149] flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> CROWDSEC SECURITY
              </h2>
              <span className="text-[#F85149] text-[10px] font-bold uppercase flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F85149] animate-pulse" /> LIVE FEED
              </span>
            </div>
            <div className="space-y-2">
              {(crowdsec?.activeDecisions || []).slice(0, 2).map((dec, i) => (
                <div key={i} className="flex justify-between items-start text-[10px] border-l-2 border-[#F85149] pl-2 bg-[#0D1117] p-2 border-y border-r border-[#30363D]">
                  <div>
                    <p className="text-white font-bold">IP Banned: {dec.value}</p>
                    <p className="text-[#8B949E] truncate max-w-[160px]">Scenario: {dec.scenario}</p>
                  </div>
                  <span className="text-[#8B949E]">{dec.duration}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="bg-[#0D1117] p-2 border border-[#30363D]">
                  <span className="block text-xl font-bold text-[#F85149]">{crowdsec?.metrics?.activeDecisionsCount ?? 0}</span>
                  <span className="text-[9px] text-[#8B949E] uppercase">TOTAL BANS</span>
                </div>
                <div className="bg-[#0D1117] p-2 border border-[#30363D]">
                  <span className="block text-xl font-bold text-[#7EE787]">{crowdsec?.metrics?.bouncersCount ?? 0}</span>
                  <span className="text-[9px] text-[#8B949E] uppercase">BOUNCERS ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#30363D] flex justify-between text-[10px] text-[#8B949E]">
            <span>LAPI: {crowdsec?.metrics?.totalAlertsReceived ?? 0} ALERTS</span>
            <span className="text-[#F85149] group-hover:underline">VIEW DECISIONS →</span>
          </div>
        </section>
      </div>

      {/* Row 2: Uptime Kuma Grid + Prometheus Live Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Uptime Kuma Health Grid (Spans 2 columns on desktop) */}
        <section 
          onClick={() => onSelectTab('uptimeKuma')}
          className="bg-[#161B22] border border-[#30363D] p-4 lg:col-span-2 flex flex-col justify-between cursor-pointer hover:border-[#7EE787] transition-all group"
        >
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-[#30363D] pb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#7EE787] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> UPTIME KUMA HEALTH GRID
              </h2>
              <div className="flex gap-2 items-center">
                <span className="w-2 h-2 rounded-full bg-[#7EE787]"></span>
                <span className="text-[10px] text-[#8B949E] uppercase">
                  {(uptimeKuma?.downCount ?? 0) === 0 ? 'ALL SERVICES NOMINAL' : `${uptimeKuma?.downCount} SERVICES DEGRADED`}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              {(uptimeKuma?.monitors || []).slice(0, 4).map((m) => (
                <div key={m.id} className="bg-[#0D1117] p-3 border border-[#30363D]">
                  <p className="text-[#8B949E] mb-1.5 truncate text-[10px] uppercase font-bold">{m.name}</p>
                  <div className="flex gap-0.5 h-3 mb-2">
                    <div className={`flex-grow ${m.status === 1 ? 'bg-[#7EE787]' : 'bg-[#F85149]'}`}></div>
                    <div className={`flex-grow ${m.status === 1 ? 'bg-[#7EE787]' : 'bg-[#F85149]'}`}></div>
                    <div className={`flex-grow ${m.status === 1 ? 'bg-[#7EE787]' : 'bg-[#D29922]'}`}></div>
                    <div className={`flex-grow ${m.status === 1 ? 'bg-[#7EE787]' : 'bg-[#7EE787]'}`}></div>
                    <div className={`flex-grow ${m.status === 1 ? 'bg-[#7EE787]' : 'bg-[#7EE787]'}`}></div>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#8B949E]">{m.ping}ms</span>
                    <span className={`font-bold ${m.status === 1 ? 'text-[#7EE787]' : 'text-[#F85149]'}`}>
                      {m.uptime24h ? `${m.uptime24h}%` : '100%'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#30363D] flex justify-between text-[10px] text-[#8B949E]">
            <span>FLEET: {uptimeKuma?.upCount ?? 0}/{(uptimeKuma?.monitors || []).length} MONITORS UP • SLA {uptimeKuma?.overallUptimePercent ?? 100}%</span>
            <span className="text-[#7EE787] group-hover:underline">VIEW MONITORS →</span>
          </div>
        </section>

        {/* Prometheus Raw Metrics Section */}
        <section 
          onClick={() => onSelectTab('prometheus')}
          className="bg-[#161B22] border border-[#30363D] p-4 flex flex-col justify-between cursor-pointer hover:border-white transition-all group"
        >
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-[#30363D] pb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#4F9CF9]" /> PROMETHEUS HOST
              </h2>
              <span className="text-[10px] text-[#8B949E] uppercase">NODE_EXPORTER</span>
            </div>
            <div className="bg-[#0D1117] p-3 border border-[#30363D] text-[10px] text-[#7EE787] space-y-1 overflow-x-auto">
              <p className="text-[#8B949E]"># Host metrics (1m avg)</p>
              <p className="text-white">node_cpu_usage: <span className="text-[#4F9CF9] font-bold">{prometheus.nodeMetrics.cpuPercent}%</span></p>
              <p className="text-white">node_mem_used: <span className="text-[#7EE787] font-bold">{prometheus.nodeMetrics.memoryPercent}%</span> ({formatBytes(prometheus.nodeMetrics.memoryUsedBytes)})</p>
              <p className="text-white">node_load1: <span className="text-[#D29922] font-bold">{prometheus.nodeMetrics.load1}</span></p>
              <p className="text-white">node_disk_root: <span className="text-[#7EE787] font-bold">{prometheus.nodeMetrics.diskPercent}%</span></p>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#30363D] flex justify-between text-[10px] text-[#8B949E]">
            <span>INSTANCE: {prometheus.nodeMetrics.instanceName}</span>
            <span className="text-white group-hover:underline">PROMQL RUNNER →</span>
          </div>
        </section>
      </div>

      {/* Synchronized Network Bandwidth Throughput Chart */}
      <section className="bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex flex-wrap items-center justify-between mb-3 border-b border-[#30363D] pb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-[#4F9CF9]" />
              SYNCHRONIZED NETWORK THROUGHPUT STREAM (MB/S)
            </h2>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">
              Live Inbound (RX) vs Outbound (TX)
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-[#4F9CF9]" />
              <span className="text-[#E0E0E0]">INBOUND (RX)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-[#D29922]" />
              <span className="text-[#E0E0E0]">OUTBOUND (TX)</span>
            </div>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F9CF9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4F9CF9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D29922" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#D29922" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="time" stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis stroke="#8B949E" tick={{ fontSize: 10, fontFamily: 'monospace' }} unit=" MB/s" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#161B22', borderColor: '#30363D', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace', color: '#E0E0E0' }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} MB/s`]}
              />
              <Area type="monotone" dataKey="rx" name="Inbound (RX)" stroke="#4F9CF9" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRx)" />
              <Area type="monotone" dataKey="tx" name="Outbound (TX)" stroke="#D29922" strokeWidth={1.5} fillOpacity={1} fill="url(#colorTx)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Subsystem Telemetry Status Table */}
      <section className="bg-[#161B22] border border-[#30363D]">
        <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-[#7EE787]" />
              COLLECTOR ENGINE TOPOLOGY & HEALTH
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Config-driven connector state</p>
          </div>
          <button
            onClick={() => onSelectTab('config')}
            className="text-[10px] text-[#4F9CF9] hover:underline uppercase flex items-center gap-1 font-bold"
          >
            <span>EDIT TOPOLOGY</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-[#E0E0E0]">
            <thead className="bg-[#0D1117] text-[#8B949E] uppercase text-[10px] tracking-wider border-b border-[#30363D]">
              <tr>
                <th className="px-4 py-2.5">SUBSYSTEM</th>
                <th className="px-4 py-2.5">TARGET ENDPOINT</th>
                <th className="px-4 py-2.5">STREAM STATUS</th>
                <th className="px-4 py-2.5">LATENCY</th>
                <th className="px-4 py-2.5">COLLECTED ITEMS</th>
                <th className="px-4 py-2.5">LAST SYNC</th>
                <th className="px-4 py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]/60 font-mono">
              {(Object.entries(collectors) as [string, any][]).map(([key, col]) => (
                <tr key={key} className="hover:bg-[#0D1117]/60 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-white flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${col.isLive ? 'bg-[#7EE787]' : 'bg-[#D29922]'}`} />
                    <span>{col.displayName}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#8B949E] truncate max-w-xs" title={col.endpointUrl}>
                    {col.endpointUrl}
                  </td>
                  <td className="px-4 py-2.5">
                    {col.isLive ? (
                      <span className="px-2 py-0.5 text-[9px] uppercase font-bold bg-[#238636] text-white">
                        LIVE CONNECTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] uppercase font-bold bg-[#D29922]/20 text-[#D29922] border border-[#D29922]/40" title={col.lastError || 'Endpoint not reached'}>
                        FALLBACK STREAM
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={col.latencyMs < 100 ? 'text-[#7EE787]' : col.latencyMs < 500 ? 'text-[#D29922]' : 'text-[#F85149]'}>
                      {col.latencyMs}ms
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#E0E0E0]">
                    {col.itemCount} items
                  </td>
                  <td className="px-4 py-2.5 text-[#8B949E]">
                    {formatRelativeTime(col.lastAttempt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => onSelectTab(key === 'uptimeKuma' ? 'uptimeKuma' : key)}
                      className="px-2 py-0.5 bg-[#0D1117] hover:bg-[#21262D] text-[#E0E0E0] border border-[#30363D] text-[10px] uppercase font-bold transition-all"
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

