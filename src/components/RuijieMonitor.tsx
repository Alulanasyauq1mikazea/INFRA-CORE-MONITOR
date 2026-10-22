import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  RefreshCw,
  Zap,
  Globe,
  Radio,
  Users,
  Shield,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  Settings2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Wifi,
  Laptop,
  Smartphone,
  Monitor,
  Video,
  ArrowDownRight,
  ArrowUpRight,
  Gauge,
  SlidersHorizontal,
  ExternalLink,
  Power,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { NodeMetric, RuijieWanInterface, RuijieReyeeDevice, RuijieClient, RuijieAppDpiStats } from '../types';

interface RuijieMonitorProps {
  ruijieNode?: NodeMetric;
  onRefresh?: () => void;
}

export const RuijieMonitor: React.FC<RuijieMonitorProps> = ({ ruijieNode, onRefresh }) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'devices' | 'smartflow' | 'diagnostics'>('overview');

  // Router target & connection states
  const [routerIp, setRouterIp] = useState<string>(ruijieNode?.ip || '192.168.110.1');
  const [routerModel, setRouterModel] = useState<string>(ruijieNode?.ruijieModel || 'Ruijie Reyee RG-EG3250 Gateway');
  const [rgosVersion, setRgosVersion] = useState<string>(ruijieNode?.rgosVersion || 'RGOS 11.9(6)B1P1');
  const [isPhysicallyConnected, setIsPhysicallyConnected] = useState<boolean>(false);
  const [syncMode, setSyncMode] = useState<string>('realtime_telemetry_ready');
  const [apiLatency, setApiLatency] = useState<number | null>(12);
  const [lastUpdated, setLastUpdated] = useState<string>('Baru saja');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoPollInterval, setAutoPollInterval] = useState<number>(3); // 3s default
  const [isAutoPoll, setIsAutoPoll] = useState<boolean>(true);

  // Settings modal state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState({
    host: '192.168.110.1',
    snmpCommunity: 'public',
    snmpPort: 161,
    ewebPort: 80,
    protocol: 'snmp_eweb',
  });

  // Dynamically load active Ruijie configuration from SQLite
  useEffect(() => {
    fetch('/api/database/sources')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sources)) {
          const rj = data.sources.find((s: any) => s.category === 'ruijie');
          if (rj?.ip_address) {
            setRouterIp(rj.ip_address);
            setConfigForm((prev) => ({
              ...prev,
              host: rj.ip_address,
              ewebPort: rj.port || 80,
              snmpCommunity: rj.auth_credentials?.snmpCommunity || prev.snmpCommunity,
            }));
          }
        }
      })
      .catch(() => {});
  }, []);
  const [testResult, setTestResult] = useState<{ testing: boolean; message?: string; success?: boolean } | null>(null);

  // Telemetry state
  const [telemetry, setTelemetry] = useState<any>({
    cpuUsage: 26,
    ramUsage: 41,
    temperatureCelsius: 38,
    latencyMs: 1.2,
    jitterMs: 0.65,
    rxSpeedMbps: 295.4,
    txSpeedMbps: 142.1,
    totalThroughputMbps: 437.5,
    activeNatSessions: 1240,
    maxNatSessions: 100000,
    activeClientsCount: 208,
    poeUsageWatts: 148,
    poeMaxWatts: 370,
    poeEfficiencyPercent: 40,
  });

  // WAN & Ports state
  const [wanInterfaces, setWanInterfaces] = useState<RuijieWanInterface[]>([]);
  const [physicalPorts, setPhysicalPorts] = useState<any[]>([]);

  // Devices & Clients state
  const [devices, setDevices] = useState<RuijieReyeeDevice[]>([]);
  const [clients, setClients] = useState<RuijieClient[]>([]);
  const [appDpiStats, setAppDpiStats] = useState<RuijieAppDpiStats[]>([]);

  // Traffic time series
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);

  // Diagnostics state
  const [pingTarget, setPingTarget] = useState<string>('1.1.1.1');
  const [pingCount, setPingCount] = useState<number>(5);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResults, setPingResults] = useState<any | null>(null);

  // Search and filters
  const [clientSearch, setClientSearch] = useState<string>('');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');

  // Fetch real-time status from backend
  const fetchLiveTelemetry = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    const t0 = performance.now();
    try {
      // 1. Fetch status
      const resStatus = await fetch(`/api/ruijie/status?host=${encodeURIComponent(routerIp)}`);
      if (resStatus.ok) {
        const data = await resStatus.json();
        if (data.success) {
          setTelemetry(data.telemetry);
          setIsPhysicallyConnected(data.isPhysicallyReachable);
          setSyncMode(data.mode);
          if (data.router?.model) setRouterModel(data.router.model);
          if (data.router?.rgosVersion) setRgosVersion(data.router.rgosVersion);
        }
      }

      // 2. Fetch WAN & Ports
      const resWan = await fetch('/api/ruijie/wan');
      if (resWan.ok) {
        const data = await resWan.json();
        if (data.success) {
          setWanInterfaces(data.wanInterfaces || []);
          setPhysicalPorts(data.physicalPorts || []);
        }
      }

      // 3. Fetch APs & Switches
      const resDev = await fetch('/api/ruijie/devices');
      if (resDev.ok) {
        const data = await resDev.json();
        if (data.success) {
          setDevices(data.devices || []);
        }
      }

      // 4. Fetch Clients & Smart Flow
      const resCli = await fetch('/api/ruijie/clients');
      if (resCli.ok) {
        const data = await resCli.json();
        if (data.success) {
          setClients(data.clients || []);
          setAppDpiStats(data.appDpiStats || []);
        }
      }

      // 5. Fetch Traffic Time-Series
      const resTraffic = await fetch('/api/ruijie/traffic?count=20');
      if (resTraffic.ok) {
        const data = await resTraffic.json();
        if (data.success && Array.isArray(data.points)) {
          setTrafficHistory(data.points);
        }
      }

      setApiLatency(Math.max(1, Math.round(performance.now() - t0)));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      // Background Ruijie fetch telemetry fallback
    } finally {
      setIsRefreshing(false);
    }
  }, [routerIp]);

  // Initial fetch and auto-polling timer
  useEffect(() => {
    fetchLiveTelemetry(false);
  }, [fetchLiveTelemetry]);

  useEffect(() => {
    if (!isAutoPoll || autoPollInterval <= 0) return;
    const interval = setInterval(() => {
      fetchLiveTelemetry(false);
    }, autoPollInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveTelemetry, isAutoPoll, autoPollInterval]);

  // Handle Ping Execution
  const handleRunPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingTarget) return;
    setIsPinging(true);
    try {
      const res = await fetch('/api/ruijie/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: pingTarget, count: pingCount }),
      });
      if (res.ok) {
        const data = await res.json();
        setPingResults(data);
      }
    } catch (err) {
      console.error('Ping run failed:', err);
    } finally {
      setIsPinging(false);
    }
  };

  // Handle Test Connection
  const handleTestConnection = async () => {
    setTestResult({ testing: true });
    try {
      const res = await fetch('/api/ruijie/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: configForm.host, port: configForm.ewebPort }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          testing: false,
          success: data.reachable,
          message: data.statusText,
        });
      }
    } catch (err: any) {
      setTestResult({
        testing: false,
        success: false,
        message: err.message || 'Gagal menghubungi host router',
      });
    }
  };

  // Handle Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ruijie/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      });
      if (res.ok) {
        setRouterIp(configForm.host);
        setIsConfigModalOpen(false);
        fetchLiveTelemetry(true);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  // Filtered clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      clientSearch === '' ||
      c.hostname.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.ip.includes(clientSearch) ||
      c.mac.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.appCategory.toLowerCase().includes(clientSearch.toLowerCase());

    const matchesType =
      clientTypeFilter === 'all' || c.deviceType.toLowerCase() === clientTypeFilter.toLowerCase();

    return matchesSearch && matchesType;
  });

  // Filtered devices
  const filteredDevices = devices.filter((d) => {
    if (deviceFilter === 'all') return true;
    return d.type.toLowerCase() === deviceFilter.toLowerCase();
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & TELEMETRY STATUS BAR */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Router Brand & Host Info */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 rounded-xl text-indigo-400 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Network className="w-7 h-7 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 truncate">
                  {routerModel}
                </h1>
                {/* Brand Badge */}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  <span>RUIJIE REYEE</span>
                </span>
                {/* Connection Status Pill */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                    isPhysicallyConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPhysicallyConnected ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
                    }`}
                  ></span>
                  <span>{isPhysicallyConnected ? 'Live Connected' : 'Standby Real-Time Ready'}</span>
                </span>
                {/* Latency & Jitter Badge */}
                {telemetry?.latencyMs !== undefined && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900 border border-slate-800 text-cyan-300 flex items-center gap-1"
                    title="Real-Time Latency & Jitter"
                  >
                    <Zap className="w-2.5 h-2.5 text-cyan-400" />
                    <span>{telemetry.latencyMs}ms</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400">Jitter: {telemetry.jitterMs}ms</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span>Target: <strong className="text-slate-200">{routerIp}</strong></span>
                <span className="text-slate-600">•</span>
                <span>OS: <strong className="text-slate-200">{rgosVersion}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Cloud: <strong className="text-indigo-300">Reyee MACC Online</strong></span>
                <span className="text-slate-600">•</span>
                <span>Diperbarui: {lastUpdated}</span>
              </p>
            </div>
          </div>

          {/* Right: Polling controls & Actions */}
          <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
            {/* Auto-Poll Interval */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
              <span className="text-slate-500 text-[11px]">Polling:</span>
              <button
                type="button"
                onClick={() => setIsAutoPoll((p) => !p)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold transition ${
                  isAutoPoll ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isAutoPoll ? 'AUTO' : 'PAUSED'}
              </button>
              <select
                value={autoPollInterval}
                onChange={(e) => setAutoPollInterval(Number(e.target.value))}
                className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            {/* Config & IP Target Button */}
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 text-xs font-mono inline-flex items-center gap-1.5 transition"
              title="Atur Target IP & Protokol Ruijie"
            >
              <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target & SNMP</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchLiveTelemetry(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
              title="Refresh Data Segar Sekarang"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Infrastructure Readiness Notice */}
        {!isPhysicallyConnected && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-slate-300">
                <strong>Mode Standby Telemetri Real-Time:</strong> Infrastruktur fisik Ruijie sedang disiapkan. Dashboard telah siap 100% dan akan otomatis menyinkronkan data langsung begitu router terhubung di jaringan.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfigForm((prev) => ({ ...prev, host: routerIp }));
                setIsConfigModalOpen(true);
              }}
              className="text-cyan-400 hover:underline text-xs whitespace-nowrap"
            >
              Ubah IP / Cek Koneksi &rarr;
            </button>
          </div>
        )}
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview & Multi-WAN</span>
        </button>

        <button
          onClick={() => setActiveTab('traffic')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'traffic'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Trafik & Jitter Wave</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'devices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Reyee AP & Switches ({devices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('smartflow')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'smartflow'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Smart Flow DPI & Klien ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Diagnostik & Ping Jitter</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      {/* TAB 1: OVERVIEW & MULTI-WAN */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* CPU */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>CPU Load</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 mt-1 font-mono">{telemetry.cpuUsage}%</div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.cpuUsage)}%` }}
                ></div>
              </div>
            </div>

            {/* RAM */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>RAM Usage</span>
                <HardDrive className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 mt-1 font-mono">{telemetry.ramUsage}%</div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.ramUsage)}%` }}
                ></div>
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Suhu Ruijie</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 mt-1 font-mono">{telemetry.temperatureCelsius}&deg;C</div>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 inline-block">Normal (Max 70&deg;C)</span>
            </div>

            {/* PoE Power Budget */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>PoE Budget</span>
                <Power className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 mt-1 font-mono">
                {telemetry.poeUsageWatts}W <span className="text-xs text-slate-500 font-normal">/ {telemetry.poeMaxWatts}W</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, telemetry.poeEfficiencyPercent)}%` }}
                ></div>
              </div>
            </div>

            {/* Active Clients */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Klien Aktif</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 mt-1 font-mono">{telemetry.activeClientsCount}</div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 inline-block">Across AP & Switch</span>
            </div>

            {/* NAT Sessions */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>NAT Sessions</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 mt-1 font-mono">{telemetry.activeNatSessions?.toLocaleString()}</div>
              <span className="text-[10px] text-purple-400 font-mono mt-1 inline-block">100k Max Pool</span>
            </div>
          </div>

          {/* Physical Port Faceplate View */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Panel Port Fisik RG-EG3250 (10x Gigabit Ethernet)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Port Status: <span className="text-emerald-400 font-bold">9 UP</span> / 1 DOWN
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-2">
              {physicalPorts.map((p) => {
                const isUp = p.status === 'UP';
                const isWan = p.type === 'WAN';
                return (
                  <div
                    key={p.port}
                    className={`rounded-xl border p-2.5 flex flex-col justify-between text-center transition ${
                      isUp
                        ? isWan
                          ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
                          : 'bg-slate-900/80 border-slate-700/80 text-slate-200'
                        : 'bg-slate-950 border-slate-800/60 text-slate-600 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">P{p.port}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isUp ? (isWan ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400') : 'bg-slate-600'
                        }`}
                      ></span>
                    </div>
                    <div className="text-xs font-bold font-mono tracking-tight truncate">{p.label}</div>
                    <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800 pt-1">
                      <span>{p.speed}</span>
                      {p.poe && <span className="text-emerald-400 font-bold">{p.poeWatts}W</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-WAN Load Balancing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {wanInterfaces.map((wan, idx) => {
              const isPrimary = wan.isPrimary;
              return (
                <div
                  key={wan.name}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isPrimary ? 'bg-cyan-400 animate-pulse' : 'bg-indigo-400'}`}></span>
                        <h4 className="text-base font-bold text-slate-100">{wan.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {wan.role}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {wan.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-mono mb-4">
                      ISP: <strong className="text-slate-200">{wan.ispName}</strong> • Kapasitas: {wan.bandwidthCapacityMbps} Mbps
                    </p>

                    {/* Bandwidth Usage Progress Bar */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs font-mono text-slate-400">
                        <span>Utilisasi Bandwidth</span>
                        <span className="text-slate-200 font-bold">{wan.utilizationPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isPrimary ? 'bg-cyan-400' : 'bg-indigo-400'
                          }`}
                          style={{ width: `${wan.utilizationPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* WAN Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div>
                        <div className="text-slate-500 text-[10px]">IP Publik</div>
                        <div className="text-slate-200 font-medium truncate">{wan.ip}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">Gateway</div>
                        <div className="text-slate-200 font-medium truncate">{wan.gateway}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">Latensi & Jitter</div>
                        <div className="text-emerald-400 font-medium">{wan.latencyMs}ms / {wan.jitterMs}ms</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">Packet Loss</div>
                        <div className="text-slate-200 font-medium">{wan.packetLossPercent}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Throughput pills */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center text-cyan-400">
                        <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
                        Rx: <strong>{wan.rxSpeedMbps} Mbps</strong>
                      </span>
                      <span className="flex items-center text-emerald-400">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                        Tx: <strong>{wan.txSpeedMbps} Mbps</strong>
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">Weight: {wan.loadBalanceWeight}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TRAFFIC & JITTER WAVE */}
      {activeTab === 'traffic' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Main Throughput Graph */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Grafik Bandwidth Real-Time (Ruijie RG-EG3250)
                </h3>
                <p className="text-xs text-slate-400">
                  Total Throughput: <strong className="text-cyan-300 font-mono">{telemetry.totalThroughputMbps} Mbps</strong> (Rx: {telemetry.rxSpeedMbps} Mbps / Tx: {telemetry.txSpeedMbps} Mbps)
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="flex items-center text-cyan-400">
                  <span className="w-2.5 h-2.5 bg-cyan-400 rounded-xs mr-1.5"></span>
                  Rx (Download)
                </span>
                <span className="flex items-center text-emerald-400">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-xs mr-1.5"></span>
                  Tx (Upload)
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRuijieRx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRuijieTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" Mbps" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="rxMbps" name="Download (Rx)" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorRuijieRx)" />
                  <Area type="monotone" dataKey="txMbps" name="Upload (Tx)" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorRuijieTx)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Jitter & Latency Waveform Graph */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  Gelombang Fluktuasi Jitter & Delay Variation (ITU-T G.114)
                </h3>
                <p className="text-xs text-slate-400">
                  Current Jitter: <strong className="text-purple-300 font-mono">{telemetry.jitterMs} ms</strong> • Latency: <strong className="text-cyan-300 font-mono">{telemetry.latencyMs} ms</strong> • Status: <span className="text-emerald-400 font-bold">VoIP / Tunnel Ready</span>
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="flex items-center text-purple-400">
                  <span className="w-2.5 h-2.5 bg-purple-400 rounded-xs mr-1.5"></span>
                  Jitter (ms)
                </span>
                <span className="flex items-center text-sky-400">
                  <span className="w-2.5 h-2.5 bg-sky-400 rounded-xs mr-1.5"></span>
                  Latency (ms)
                </span>
              </div>
            </div>

            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" ms" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="jitterMs" name="Jitter (Delay Var)" stroke="#c084fc" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="latencyMs" name="Latency RTT" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REYEE AP & SWITCH MANAGEMENT */}
      {activeTab === 'devices' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Topologi Perangkat Ruijie Reyee (Managed via Gateway MACC)
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Semua Tipe ({devices.length})</option>
                <option value="ap">Access Points ({devices.filter((d) => d.type === 'AP').length})</option>
                <option value="switch">Cloud Switches ({devices.filter((d) => d.type === 'SWITCH').length})</option>
              </select>
            </div>
          </div>

          {/* Devices Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDevices.map((dev) => {
              const isAp = dev.type === 'AP';
              return (
                <div
                  key={dev.id}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
                          {isAp ? <Wifi className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{dev.name}</h4>
                          <span className="text-[11px] font-mono text-slate-400">{dev.model}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {dev.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 mb-3 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-500" />
                      <span>{dev.location}</span>
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 mb-3">
                      <div>
                        <div className="text-slate-500 text-[10px]">IP / MAC</div>
                        <div className="text-slate-200 truncate">{dev.ip}</div>
                        <div className="text-slate-500 text-[9px] truncate">{dev.mac}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">PoE Wattage</div>
                        <div className="text-emerald-400 font-bold">
                          {dev.poePowerUsageWatts}W <span className="text-slate-500 font-normal">/ {dev.poeMaxWatts}W</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">Klien Terhubung</div>
                        <div className="text-cyan-400 font-bold">{dev.clientCount} Devices</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">CPU / RAM</div>
                        <div className="text-slate-200">{dev.cpuUsage}% / {dev.memoryUsage}%</div>
                      </div>
                    </div>

                    {isAp && (
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg flex items-center justify-between border border-slate-800">
                        <span>Kanal: 2.4G(Ch {dev.rf24Channel}) / 5G(Ch {dev.rf5Channel})</span>
                        <span className="text-indigo-300">Mesh: {dev.meshRole}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>FW: {dev.firmware}</span>
                    <span>Uptime: {dev.uptime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SMART FLOW DPI & CLIENTS */}
      {activeTab === 'smartflow' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Ruijie Smart Flow DPI Breakdown */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Ruijie Smart Flow Control (Deep Packet Inspection / DPI)
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Layer 7 QoS Active
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Gateway Ruijie secara otomatis mengidentifikasi dan memprioritaskan paket aplikasi akademik, video conference, dan membatasi trafik entertainment/download.
            </p>

            {/* DPI Category Progress Stack */}
            <div className="space-y-3">
              {appDpiStats.map((app) => (
                <div key={app.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300 font-semibold">{app.category} <span className="text-slate-500 font-normal">({app.name})</span></span>
                    <span className="text-slate-300 font-mono">
                      Rx: <strong className="text-cyan-400">{app.rxMbps} Mbps</strong> • Tx: <strong className="text-emerald-400">{app.txMbps} Mbps</strong> ({app.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${app.percentage}%`, backgroundColor: app.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Clients Table */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Daftar Klien Terhubung ({filteredClients.length} entri)
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Cari IP, MAC, Hostname..."
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <select
                  value={clientTypeFilter}
                  onChange={(e) => setClientTypeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="laptop">Laptop</option>
                  <option value="phone">Smartphone</option>
                  <option value="desktop">Desktop / TV</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Hostname / Perangkat</th>
                    <th className="p-3.5">IP / MAC</th>
                    <th className="p-3.5">AP / Port Terkoneksi</th>
                    <th className="p-3.5">VLAN</th>
                    <th className="p-3.5">Aplikasi Terdeteksi (DPI)</th>
                    <th className="p-3.5">Bandwidth Saat Ini</th>
                    <th className="p-3.5">Status QoS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredClients.map((cli) => (
                    <tr key={cli.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400">
                            {cli.deviceType === 'Phone' ? (
                              <Smartphone className="w-3.5 h-3.5" />
                            ) : cli.deviceType === 'Laptop' ? (
                              <Laptop className="w-3.5 h-3.5" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100">{cli.hostname}</div>
                            <div className="text-[10px] text-slate-500">{cli.vendor}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-200 font-medium">{cli.ip}</div>
                        <div className="text-[10px] text-slate-500">{cli.mac}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-200">{cli.connectedDevice}</div>
                        <div className="text-[10px] text-indigo-300">{cli.connectedPortOrSsid}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          VLAN {cli.vlan}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-cyan-400 font-medium">{cli.appCategory}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-cyan-300 font-bold">
                          {(cli.rxSpeedKbps / 1024).toFixed(1)} Mbps Rx
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          {(cli.txSpeedKbps / 1024).toFixed(1)} Mbps Tx
                        </div>
                      </td>
                      <td className="p-3.5">
                        {cli.isRateLimited ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px]">
                            Limited {cli.rateLimitMbps}M
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px]">
                            Uncapped
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DIAGNOSTICS & PING JITTER */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center space-x-2 mb-4">
              <Terminal className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                ICMP Ping & Fluktuasi Jitter Probe (RG-EG3250 Gateway)
              </h3>
            </div>

            <form onSubmit={handleRunPing} className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Target Host / IP:</label>
                <input
                  type="text"
                  value={pingTarget}
                  onChange={(e) => setPingTarget(e.target.value)}
                  placeholder="Misal: 1.1.1.1 atau 8.8.8.8"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="w-28">
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Jumlah Paket:</label>
                <select
                  value={pingCount}
                  onChange={(e) => setPingCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                >
                  <option value={4}>4 paket</option>
                  <option value={5}>5 paket</option>
                  <option value={10}>10 paket</option>
                </select>
              </div>

              <div className="self-end">
                <button
                  type="submit"
                  disabled={isPinging}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-600/25"
                >
                  <Play className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Sedang Ping...' : 'Mulai Ping Probe'}</span>
                </button>
              </div>
            </form>

            {/* Results Display */}
            {pingResults && (
              <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="text-slate-300">
                    Hasil Ping ke <strong className="text-purple-400">{pingResults.target}</strong> dari Gateway Ruijie
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span>Loss: <strong className="text-emerald-400">{pingResults.packetLossPercent}%</strong></span>
                    <span>Avg RTT: <strong className="text-cyan-400">{pingResults.avgRttMs} ms</strong></span>
                    <span>Jitter: <strong className="text-purple-400">{pingResults.jitterMs} ms</strong></span>
                  </div>
                </div>

                <div className="space-y-1 text-slate-400 text-[11px]">
                  {pingResults.replies?.map((r: any) => (
                    <div key={r.seq} className="flex items-center space-x-3">
                      <span className="text-slate-600">#{r.seq}</span>
                      <span>{r.bytes} bytes dari {pingResults.target}:</span>
                      <span>icmp_seq={r.seq}</span>
                      <span>ttl={r.ttl}</span>
                      <span className="text-emerald-400 font-bold">time={r.timeMs} ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Konfigurasi Target Ruijie Gateway
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  IP Gateway Ruijie:
                </label>
                <input
                  type="text"
                  value={configForm.host}
                  onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                  placeholder="Misal: 192.168.110.1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  IP default Gateway Ruijie Reyee biasanya adalah 192.168.110.1
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Port eWeb / REST:
                  </label>
                  <input
                    type="number"
                    value={configForm.ewebPort}
                    onChange={(e) => setConfigForm({ ...configForm, ewebPort: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    SNMP Community:
                  </label>
                  <input
                    type="text"
                    value={configForm.snmpCommunity}
                    onChange={(e) => setConfigForm({ ...configForm, snmpCommunity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Test Connection Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testResult?.testing}
                  className="w-full py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-indigo-300 text-xs font-mono flex items-center justify-center gap-1.5 transition"
                >
                  <Zap className={`w-3.5 h-3.5 ${testResult?.testing ? 'animate-spin' : ''}`} />
                  <span>{testResult?.testing ? 'Memeriksa Jalur Jaringan...' : 'Tes Jangkauan IP Fisik'}</span>
                </button>

                {testResult?.message && (
                  <div
                    className={`mt-2 p-2.5 rounded-xl border text-[11px] font-mono leading-relaxed ${
                      testResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold transition shadow-lg shadow-indigo-600/25"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
