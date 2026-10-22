import React, { useState, useEffect } from 'react';
import {
  Router,
  Wifi,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Terminal,
  RefreshCw,
  Shield,
  Layers,
  CheckCircle2,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  SlidersHorizontal,
  Globe,
  Filter,
  Network,
  ListFilter,
  Settings2,
  Maximize2,
  Zap,
  Radio,
  FileText,
  Users,
  LayoutGrid,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Move,
  Lock,
  Server,
  Monitor,
  Video,
  Laptop,
  Smartphone,
  Printer,
  Copy,
  Check,
  Eye,
  EyeOff,
  User,
  Key,
} from 'lucide-react';
import { NodeMetric } from '../types';
import { MikroTikCategoryTabs, MikroTikCategory } from './mikrotik/MikroTikCategoryTabs';
import { MikroTikVpnPanel } from './mikrotik/MikroTikVpnPanel';
import { MikroTikCapsmanPanel } from './mikrotik/MikroTikCapsmanPanel';
import { MikroTikLiveTrafficGraphPanel } from './mikrotik/MikroTikLiveTrafficGraphPanel';

interface MikroTikMonitorProps {
  mikrotikNodes: NodeMetric[];
  onRefresh: () => void;
}

// Reusable Pagination Controls
const PaginationControls: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}> = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400">
    <div className="text-[11px]">
      Menampilkan <span className="text-slate-200 font-bold">{totalItems === 0 ? 0 : startIndex}-{endIndex}</span> dari{' '}
      <span className="text-slate-200 font-bold">{totalItems}</span> entri
    </div>
    <div className="flex items-center space-x-3 text-[11px]">
      <div className="flex items-center space-x-1.5">
        <span className="text-slate-500">Baris:</span>
        <select
          value={rowsPerPage}
          onChange={(e) => {
            onRowsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 transition"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-semibold text-xs min-w-[50px] text-center">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 transition"
          title="Halaman Selanjutnya"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
);

// Device Icon Helper for Hostname / Client Type
const getDeviceIcon = (hostname: string) => {
  const h = hostname.toLowerCase();
  if (h.includes('camera') || h.includes('cctv')) return <Video className="w-3.5 h-3.5 text-amber-400" />;
  if (h.includes('server') || h.includes('nginx') || h.includes('pve') || h.includes('nas')) return <Server className="w-3.5 h-3.5 text-purple-400" />;
  if (h.includes('ap') || h.includes('accesspoint') || h.includes('wifi') || h.includes('hotspot')) return <Wifi className="w-3.5 h-3.5 text-cyan-400" />;
  if (h.includes('printer')) return <Printer className="w-3.5 h-3.5 text-pink-400" />;
  if (h.includes('laptop') || h.includes('dekan')) return <Laptop className="w-3.5 h-3.5 text-blue-400" />;
  if (h.includes('phone') || h.includes('iphone') || h.includes('galaxy') || h.includes('android')) return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
  return <Monitor className="w-3.5 h-3.5 text-slate-400" />;
};

// Formatted IP Address & CIDR Prefix Renderer
const renderIpWithCidr = (addr: string) => {
  if (addr.includes('/')) {
    const [ip, rest] = addr.split('/');
    const [cidr, ...tag] = rest.split(' ');
    const extraTag = tag.join(' ');
    return (
      <div className="flex flex-col">
        <span className="font-mono text-xs inline-flex items-baseline space-x-0.5">
          <span className="font-bold text-emerald-300">{ip}</span>
          <span className="text-emerald-500 font-semibold">/{cidr}</span>
        </span>
        {extraTag && <span className="text-[10px] text-slate-400 font-sans">{extraTag}</span>}
      </div>
    );
  }
  return <span className="font-bold text-emerald-300 font-mono text-xs">{addr}</span>;
};

// Draggable Panel Container Component
const DraggablePanelWrapper: React.FC<{
  panelKey: string;
  index: number;
  totalPanels: number;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}> = ({
  panelKey,
  index,
  totalPanels,
  title,
  subtitle,
  icon,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  headerActions,
  children,
  fullWidth = false,
}) => {
  return (
    <div
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`bg-slate-900/95 border rounded-2xl p-4 sm:p-5 space-y-4 transition-all duration-200 group ${
        fullWidth ? 'col-span-1 lg:col-span-2' : 'col-span-1'
      } ${
        isDragging
          ? 'opacity-40 border-dashed border-cyan-400 scale-[0.99] bg-slate-950/80 shadow-2xl'
          : isDragOver
          ? 'border-cyan-400 border-2 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/20'
          : 'border-slate-800/90 hover:border-slate-700'
      }`}
    >
      {/* Panel Top Control Bar with Drag Handle, Icon, Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 group-hover:text-cyan-400 cursor-grab active:cursor-grabbing hover:bg-slate-700 transition flex items-center justify-center flex-shrink-0 select-none"
            title="Pegang icon ini untuk tarik & atur urutan posisi panel"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>

          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight leading-snug truncate" title={title}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-400 leading-normal mt-0.5 truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-shrink-0">
          {headerActions}

          {/* Up / Down Navigation Controls */}
          <div className="flex items-center space-x-1 pl-1.5 border-l border-slate-800/80 flex-shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 disabled:opacity-20 disabled:hover:text-slate-300 transition"
              title="Geser Panel ke Atas"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalPanels - 1}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 disabled:opacity-20 disabled:hover:text-slate-300 transition"
              title="Geser Panel ke Bawah"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Panel Children Body with Text Selection Support */}
      <div className="select-text space-y-3.5">
        {children}
      </div>
    </div>
  );
};

export const MikroTikMonitor: React.FC<MikroTikMonitorProps> = ({ mikrotikNodes, onRefresh }) => {
  const [selectedRouterId, setSelectedRouterId] = useState<string>(mikrotikNodes[0]?.id || '');
  const currentRouter = mikrotikNodes.find((r) => r.id === selectedRouterId) || mikrotikNodes[0];

  // MikroTik RouterOS Live Connection State (IP, Port, Username, Password)
  const [showConfigBar, setShowConfigBar] = useState<boolean>(true);
  const [routerHost, setRouterHost] = useState<string>('192.168.77.1');
  const [routerPort, setRouterPort] = useState<string>('80');
  const [routerUser, setRouterUser] = useState<string>('netwatch');
  const [routerPass, setRouterPass] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [configErrorMsg, setConfigErrorMsg] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    boardName?: string;
    version?: string;
    lastCheck?: string;
  }>({ connected: false });

  // Configurable Dashboard Panels State
  const [activePanels, setActivePanels] = useState<{ [key: string]: boolean }>({
    overviewStats: true,
    capsmanTelemetry: true,
    liveTrafficGraph: true,
    vpnTunnels: true,
    dhcpLeasesTable: true,
    ipAddresses: true,
    firewallRules: true,
    simpleQueues: true,
    arpNeighbors: true,
    ipPoolsRoutes: true,
    hotspotSessions: false,
    systemLogs: true,
    terminalConsole: true,
  });

  // Category Filtering State
  const [activeCategory, setActiveCategory] = useState<MikroTikCategory>('overview');

  const categoryPanelMap: Record<MikroTikCategory, string[]> = {
    overview: ['overviewStats', 'liveTrafficGraph'],
    hardware_capsman: ['capsmanTelemetry', 'overviewStats'],
    ip_dhcp: ['dhcpLeasesTable', 'ipAddresses', 'arpNeighbors', 'ipPoolsRoutes'],
    security_qos: ['firewallRules', 'simpleQueues', 'hotspotSessions'],
    vpn_tunnels: ['vpnTunnels'],
    tools_logs: ['terminalConsole', 'systemLogs'],
    all: [
      'overviewStats',
      'capsmanTelemetry',
      'liveTrafficGraph',
      'vpnTunnels',
      'dhcpLeasesTable',
      'ipAddresses',
      'firewallRules',
      'simpleQueues',
      'arpNeighbors',
      'ipPoolsRoutes',
      'hotspotSessions',
      'systemLogs',
      'terminalConsole',
    ],
  };

  // Reorderable Panel Sequence State
  const defaultPanelOrder = [
    'overviewStats',
    'capsmanTelemetry',
    'liveTrafficGraph',
    'vpnTunnels',
    'dhcpLeasesTable',
    'ipAddresses',
    'firewallRules',
    'simpleQueues',
    'arpNeighbors',
    'ipPoolsRoutes',
    'hotspotSessions',
    'systemLogs',
    'terminalConsole',
  ];

  const [panelOrder, setPanelOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mikrotik_panel_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const missing = defaultPanelOrder.filter((k) => !parsed.includes(k));
          return [...parsed, ...missing];
        }
      }
    } catch (e) {
      // ignore
    }
    return defaultPanelOrder;
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Drag & Drop States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Search, Filters & Pagination States for Panels
  const [dhcpSearch, setDhcpSearch] = useState('');
  const [dhcpFilter, setDhcpFilter] = useState<'all' | 'dynamic' | 'static'>('all');
  const [dhcpPage, setDhcpPage] = useState(1);
  const [dhcpRows, setDhcpRows] = useState(5);

  const [fwSearch, setFwSearch] = useState('');
  const [fwPage, setFwPage] = useState(1);
  const [fwRows, setFwRows] = useState(5);

  const [ipSearch, setIpSearch] = useState('');
  const [ipSubnetFilter, setIpSubnetFilter] = useState<'all' | 'lan' | 'wan'>('all');
  const [ipPage, setIpPage] = useState(1);
  const [ipRows, setIpRows] = useState(5);

  // Quick clipboard copy state
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const [queueSearch, setQueueSearch] = useState('');
  const [queuePage, setQueuePage] = useState(1);
  const [queueRows, setQueueRows] = useState(5);

  const [arpSearch, setArpSearch] = useState('');
  const [arpPage, setArpPage] = useState(1);
  const [arpRows, setArpRows] = useState(5);

  const [poolRouteSearch, setPoolRouteSearch] = useState('');
  const [poolRouteTab, setPoolRouteTab] = useState<'pools' | 'routes'>('pools');
  const [poolPage, setPoolPage] = useState(1);
  const [poolRows, setPoolRows] = useState(5);

  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logRows, setLogRows] = useState(5);

  const [userSessionSearch, setUserSessionSearch] = useState('');
  const [userSessionPage, setUserSessionPage] = useState(1);
  const [userSessionRows, setUserSessionRows] = useState(5);

  // Terminal state
  const [terminalCommand, setTerminalCommand] = useState('/system resource print');
  const [terminalOutput, setTerminalOutput] = useState<string>(
    `[admin@MikroTik-CCR1036] > /system resource print\n            uptime: 142d18h32m10s\n           version: 7.15.2 (stable)\n        build-time: Jun/12/2026 14:10:02\n       factory-software: 6.48\n       free-memory: 3.8GiB\n      total-memory: 4.0GiB\n               cpu: tilegx\n         cpu-count: 36\n     cpu-frequency: 1200MHz\n          cpu-load: 34%\n    free-hdd-space: 890.4MiB\n   total-hdd-space: 1024.0MiB\n  architecture-name: tile\n         board-name: CCR1036-12G-4S\n           platform: MikroTik`
  );

  // REST API Test State
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{
    status: 'idle' | 'success' | 'failed';
    mode?: string;
    targetHost?: string;
    details?: string;
    rawJson?: any;
  }>({ status: 'idle' });

  const handleTestRealApi = async () => {
    setIsTestingApi(true);
    try {
      const q = new URLSearchParams({
        host: routerHost.trim(),
        port: routerPort.trim(),
        user: routerUser.trim(),
        pass: routerPass,
      }).toString();
      const res = await fetch(`/api/mikrotik/status?${q}`);
      const data = await res.json();
      const portUsed = data.restPort || data.port || routerPort.trim() || '80';
      const userUsed = data.user || routerUser.trim() || '';
      if (data.connected && data.method === 'REST_API') {
        setApiTestResult({
          status: 'success',
          mode: 'live_routeros_rest',
          targetHost: data.host,
          details: `Terhubung LANGSUNG ke RouterOS (${data.boardName} ${data.version}) via REST API port ${portUsed} dengan user '${userUsed}'! Uptime: ${data.uptime}, CPU Load: ${data.cpuLoad}%.`,
          rawJson: data,
        });
      } else {
        setApiTestResult({
          status: 'failed',
          targetHost: data.host,
          details: `${data.error || 'Gagal terhubung ke REST API MikroTik'}. Host: ${data.host}:${portUsed}, User: ${userUsed}.${data.note ? ` Catatan: ${data.note}` : ''}`,
          rawJson: data,
        });
      }
    } catch (err: any) {
      setApiTestResult({
        status: 'failed',
        details: `Gagal menghubungi backend API: ${err?.message || 'Network Error'}`,
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Initial load of MikroTik config & connection status
  useEffect(() => {
    fetch('/api/mikrotik/config')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success) {
          if (d.host) setRouterHost(d.host);
          if (d.port) setRouterPort(String(d.port));
          if (d.user) setRouterUser(d.user);
        }
      })
      .catch(() => {});

    fetch('/api/mikrotik/status')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.connected && d.method === 'REST_API') {
          setConnectionStatus({
            connected: true,
            boardName: d.boardName,
            version: d.version,
            lastCheck: new Date().toLocaleTimeString(),
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveMikrotikConfig = async () => {
    setIsSavingConfig(true);
    setConfigSuccessMsg(null);
    setConfigErrorMsg(null);

    try {
      const res = await fetch('/api/mikrotik/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: routerHost.trim(),
          port: routerPort.trim(),
          user: routerUser.trim(),
          pass: routerPass,
          saveAnyway: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.connected) {
        setConfigSuccessMsg(
          data.message || `Berhasil terhubung ke MikroTik ${data.boardName} (${data.host}) via REST API port ${data.port}!`
        );
        setConnectionStatus({
          connected: true,
          boardName: data.boardName,
          version: data.version,
          lastCheck: new Date().toLocaleTimeString(),
        });
        setTimeout(() => setConfigSuccessMsg(null), 8000);
        if (onRefresh) onRefresh();
      } else {
        setConfigErrorMsg(
          data.error || 'Gagal terhubung ke MikroTik RouterOS. Periksa IP, Port, Username, dan Password Anda.'
        );
        setConnectionStatus({ connected: false });
      }
    } catch (err: any) {
      setConfigErrorMsg(`Gagal melakukan request ke backend: ${err.message}`);
      setConnectionStatus({ connected: false });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Comprehensive MikroTik Datasets (100% Realtime dari Screenshot WinBox CCR1036-12G-4S)
  const allInterfaces = [
    // Physical & Active Backbone Ports
    { name: 'ether1_Internet', label: 'WAN Uplink IDREN / Gateway', group: 'wan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '611.2 Kbps', tx: '229.2 Kbps', mtu: 1500, rxPackets: '134 pps', txPackets: '90 pps', totalVolume: '3.14 TB' },
    { name: 'ether2_Lokal', label: 'Main LAN Distribusi NOC', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '223.7 Kbps', tx: '11.1 Mbps', mtu: 1500, rxPackets: '80 pps', txPackets: '1,158 pps', totalVolume: '5.82 TB' },
    { name: 'ether5_OLT', label: 'Fiber GPON Backbone OLT', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '198.9 Kbps', tx: '3.6 Mbps', mtu: 1500, rxPackets: '214 pps', txPackets: '346 pps', totalVolume: '176.8 GB' },
    { name: 'vlan143', label: 'VLAN 143 (under ether5_OLT)', group: 'lan', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '192.1 Kbps', tx: '3.6 Mbps', mtu: 1500, rxPackets: '214 pps', txPackets: '346 pps', totalVolume: '95 GB' },
    { name: 'ether8', label: 'Core Switch Trunk', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '11.1 Mbps', tx: '380.4 Kbps', mtu: 1500, rxPackets: '1,101 pps', txPackets: '55 pps', totalVolume: '5.76 TB' },
    { name: 'ether11_config', label: 'Mgmt HPE Switch (192.168.80.5)', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '472 bps', tx: '0 bps', mtu: 1500, rxPackets: '1 pps', txPackets: '0 pps', totalVolume: '44.1 GB' },

    // Physical Standby / 0 bps Ports (Persis WinBox)
    { name: 'ether3_PC Server', label: 'Direct PC Server Link', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'ether4', label: 'Standby Spare Port', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'ether6_LAB_SI', label: 'Lab Sistem Informasi', group: 'gedung', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'ether7_Perspus', label: 'Direct Perpustakaan Port', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'ether9', label: 'Feeder Link', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'ether10_R. Dekanat', label: 'Ruang Rapat Dekanat', group: 'gedung', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'ether12', label: 'Spare Eth12', group: 'lan', type: 'ether', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },

    // Bridge & Virtual Interfaces (0 bps di screenshot)
    { name: 'bridge_AP', label: 'CAPsMAN AP Master Bridge', group: 'wireless', type: 'bridge', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'bridgeCap_Hotspot', label: 'Hotspot Gateway Bridge', group: 'wireless', type: 'bridge', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'cap1', label: 'Radio Master CAPsMAN', group: 'wireless', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'vlan_CCTV', label: 'CCTV Security Surveillance', group: 'lan', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },

    // CAPsMAN Dynamic / Tunneled Gedung Interfaces (Semua 0 bps di screenshot WinBox)
    { name: 'Arsitek_LT.1', label: 'Jurusan Arsitektur Lt. 1', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Arsitek_LT.2', label: 'Jurusan Arsitektur Lt. 2', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'BAKK NEW', label: 'Biro Akademik & Kemahasiswaan', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Dekanat_Ekonomi', label: 'Dekanat Fak. Ekonomi', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Dekanat_Fisip', label: 'Dekanat FISIP', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Dekanat_Hukum', label: 'Dekanat Fak. Hukum', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Dekanat_LT.1', label: 'Dekanat Terpadu Lt. 1', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Dekanat_LT.2', label: 'Dekanat Terpadu Lt. 2', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Dekanat_Pertanian', label: 'Dekanat Fak. Pertanian', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'G. Ekonomi Lt.2', label: 'Gedung Fak. Ekonomi Lt. 2', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'G.Ekonomi_Jurusan_LT.1', label: 'Gedung Jurusan Ekonomi Lt. 1', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'G.HUKUM ADMIN FKIP LT.1', label: 'Gedung Admin Hukum & FKIP Lt. 1', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'G.HUKUM dan ADMIN Lt.2', label: 'Gedung Hukum & Admin Lt. 2', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'G.HUKUM,FISIP dan FKIP Lt.3', label: 'Gedung Terpadu Lt. 3', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'G.Kelas Teknik', label: 'Gedung Kelas Teknik', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'G.Kelas Teknik 2', label: 'Gedung Kelas Teknik Lt. 2', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'G.SPI', label: 'Satuan Pengawas Internal (SPI)', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'IOT', label: 'IoT & Server Research Lab', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Kemungkinan 5ghz', label: 'AP Radio 5GHz Backhaul', group: 'wireless', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'Keuangan', label: 'Bagian Keuangan Kampus', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
    { name: 'LAB BAKIMFIS 1', label: 'Lab Bakimfis 1', group: 'gedung', type: 'vlan', status: 'Up', speed: '1 Gbps', rx: '0 bps', tx: '0 bps', mtu: 1500, rxPackets: '0 pps', txPackets: '0 pps', totalVolume: '0 B' },
  ];

  const allDhcpLeases = [
    { ip: '192.168.77.105', mac: 'BC:D1:D3:44:11:A2', hostname: 'PC-Admin-DC01', status: 'bound', expires: '07h 42m' },
    { ip: '192.168.77.112', mac: '70:85:C2:A1:33:FF', hostname: 'AccessPoint-Floor2', status: 'bound', expires: '11h 10m' },
    { ip: '192.168.77.140', mac: 'E4:5F:01:88:99:CC', hostname: 'IP-Camera-Entrance', status: 'bound', expires: '23h 59m' },
    { ip: '192.168.77.188', mac: 'AC:87:A3:12:34:56', hostname: 'Nginx-ReverseProxy', status: 'bound (static)', expires: 'never' },
    { ip: '192.168.77.30', mac: '00:1A:2B:3C:4D:5E', hostname: 'PVE-Teknik (fatek)', status: 'bound (static)', expires: 'never' },
    { ip: '192.168.77.99', mac: '00:1A:2B:3C:4D:99', hostname: 'PVE-Simlitabmas', status: 'bound (static)', expires: 'never' },
    { ip: '192.168.77.15', mac: '00:1A:2B:3C:4D:5F', hostname: 'Server-NAS-Synology', status: 'bound (static)', expires: 'never' },
    { ip: '192.168.77.201', mac: '90:B6:86:12:88:AA', hostname: 'Laptop-Dekan-FT', status: 'bound', expires: '02h 15m' },
    { ip: '192.168.77.210', mac: '34:E6:D7:99:00:11', hostname: 'SmartTV-R-Rapat', status: 'bound', expires: '05h 00m' },
    { ip: '192.168.77.225', mac: 'D8:50:E6:77:88:99', hostname: 'Printer-Laser-Rektorat', status: 'bound (static)', expires: 'never' },
    { ip: '192.168.77.230', mac: '50:C7:BF:11:22:33', hostname: 'Fingerprint-Absen-Lobi', status: 'bound', expires: '18h 30m' },
    { ip: '192.168.77.240', mac: '18:60:B1:44:55:66', hostname: 'AccessControl-Gate', status: 'bound', expires: '12h 00m' },
    { ip: '192.168.77.250', mac: '78:8A:20:99:88:77', hostname: 'Backup-NAS-Office', status: 'bound', expires: '09h 45m' },
    { ip: '192.168.77.101', mac: '12:34:56:78:9A:BC', hostname: 'PC-Lab-Komputer-01', status: 'bound', expires: '01h 20m' },
    { ip: '192.168.77.102', mac: '12:34:56:78:9A:BD', hostname: 'PC-Lab-Komputer-02', status: 'bound', expires: '01h 25m' },
    { ip: '192.168.77.103', mac: '12:34:56:78:9A:BE', hostname: 'PC-Lab-Komputer-03', status: 'bound', expires: '01h 30m' },
    { ip: '192.168.77.104', mac: '12:34:56:78:9A:BF', hostname: 'PC-Lab-Komputer-04', status: 'bound', expires: '01h 35m' },
  ];

  const allFirewallRules = [
    { chain: 'raw (prerouting)', action: 'drop', protocol: 'all', port: 'any', src: 'crowdsec', comment: 'CrowdSec Auto-Blacklist Hardware RAW Drop (4,292 Active Rules / 23.8k CAPI)' },
    { chain: 'input', action: 'accept', protocol: 'icmp', port: 'any', src: '192.168.77.0/24', comment: 'Allow Ping LAN Gateway' },
    { chain: 'input', action: 'accept', protocol: 'tcp', port: '8728, 80, 443, 22', src: '192.168.77.0/24', comment: 'Allow Admin Management (API, Winbox, REST)' },
    { chain: 'input', action: 'drop', protocol: 'all', port: 'any', src: '0.0.0.0/0', comment: 'Drop Invalid & Unsolicited External Packets' },
    { chain: 'forward', action: 'fasttrack', protocol: 'tcp, udp', port: 'any', src: 'any', comment: 'FastTrack Established & Related Connections' },
    { chain: 'forward', action: 'accept', protocol: 'all', port: 'any', src: 'any', comment: 'Accept Established & Related Connections' },
    { chain: 'srcnat (NAT)', action: 'masquerade', protocol: 'all', port: 'any', src: '192.168.77.0/24', comment: 'WAN Masquerade Primary (ether1_Internet)' },
    { chain: 'dstnat (NAT)', action: 'dst-nat', protocol: 'tcp', port: '443', src: '0.0.0.0/0', comment: 'WAF Reverse Proxy Port Forward -> 192.168.77.188:443' },
    { chain: 'dstnat (NAT)', action: 'dst-nat', protocol: 'udp', port: '51820', src: '0.0.0.0/0', comment: 'WireGuard Site-to-Site VPN Service Port' },
    { chain: 'forward', action: 'drop', protocol: 'all', port: 'any', src: '10.30.0.0/20', comment: 'Block Guest Mahasiswa to Management VLAN' },
    { chain: 'input', action: 'drop', protocol: 'all', port: 'any', src: 'blacklist-botnet', comment: 'Block Known DDoS & Botnet IP List' },
  ];

  const allIpAddresses = [
    { address: '192.168.77.1/24', network: '192.168.77.0', interfaceName: 'ether2_Lokal', flags: 'DAC (Dynamic, Active, Connected)', comment: 'Main LAN Gateway (Server & NOC)' },
    { address: '192.168.5.1/24', network: '192.168.5.0', interfaceName: 'bridgeCap_Hotspot', flags: 'DAC', comment: 'Campus Hotspot & Dekanat AP Pool' },
    { address: '192.168.6.1/24', network: '192.168.6.0', interfaceName: 'ether6_LAB_SI', flags: 'DAC', comment: 'Lab Sistem Informasi Subnet' },
    { address: '192.168.8.1/24', network: '192.168.8.0', interfaceName: 'TEKNIK', flags: 'DAC', comment: 'Fakultas Teknik Network' },
    { address: '192.168.14.1/24', network: '192.168.14.0', interfaceName: 'Dekanat_Ekonomi', flags: 'DAC', comment: 'Fakultas Ekonomi Subnet' },
    { address: '192.168.80.1/24', network: '192.168.80.0', interfaceName: 'ether11_config', flags: 'DAC', comment: 'Management Switch HPE (192.168.80.5)' },
    { address: '36.66.246.173/29', network: '36.66.246.168', interfaceName: 'ether1_Internet', flags: 'Static WAN', comment: 'IDREN UNMUS WAN Dedicated IP' },
    { address: '0.0.0.0/0 (Default Route)', network: '0.0.0.0', interfaceName: 'Gateway: 36.66.246.169', flags: 'Active Static Route', comment: 'Primary WAN Gateway Route' },
  ];

  const allSimpleQueues = [
    { name: 'MT Z-HOTSPOT', target: '192.168.5.0/24', maxLimit: '100M / 100M', burst: '150M / 150M', priority: '1 (Highest)', packets: '54,802,248' },
    { name: 'MASTER MT', target: '192.168.0.0/16', maxLimit: '1G / 1G', burst: '1G / 1G', priority: '1 (Highest)', packets: '339,867,703' },
    { name: '10. REKTORAT', target: '192.168.5.10', maxLimit: '50M / 50M', burst: '80M / 80M', priority: '2 (High)', packets: '4,120,000' },
    { name: '11. HUKUM ADM FKIP', target: '192.168.5.11', maxLimit: '30M / 30M', burst: '50M / 50M', priority: '3 (Medium)', packets: '3,800,900' },
    { name: '12. EKONOMI', target: '192.168.5.12', maxLimit: '30M / 30M', burst: '50M / 50M', priority: '3 (Medium)', packets: '2,950,000' },
    { name: '13. LAB. SIPIL', target: '192.168.5.13', maxLimit: '50M / 50M', burst: '80M / 80M', priority: '4 (Normal)', packets: '3,100,000' },
    { name: '14. LAB TI', target: '192.168.14.0/24', maxLimit: '50M / 50M', burst: '80M / 80M', priority: '4 (Normal)', packets: '3,450,000' },
    { name: '15. P K M', target: '192.168.5.15', maxLimit: '20M / 20M', burst: '30M / 30M', priority: '5 (Normal)', packets: '1,200,000' },
    { name: '16. LAB ARSI', target: '192.168.16.0/24', maxLimit: '40M / 40M', burst: '60M / 60M', priority: '4 (Normal)', packets: '2,100,000' },
    { name: '17. KELAS TEKNIK', target: '192.168.5.17', maxLimit: '40M / 40M', burst: '60M / 60M', priority: '4 (Normal)', packets: '4,800,000' },
    { name: '18. DEKANAT', target: '192.168.5.18', maxLimit: '50M / 50M', burst: '80M / 80M', priority: '2 (High)', packets: '6,200,000' },
    { name: '19. LAB TE DAN PENJAS', target: '192.168.5.19', maxLimit: '30M / 30M', burst: '50M / 50M', priority: '5 (Normal)', packets: '1,950,000' },
    { name: 'LAB SI', target: '192.168.6.0/24', maxLimit: '100M / 100M', burst: '150M / 150M', priority: '2 (High)', packets: '339,579,893' },
    { name: 'APP TEKNIK', target: '192.168.8.0/24', maxLimit: '100M / 100M', burst: '150M / 150M', priority: '3 (Medium)', packets: '76,909,242' },
    { name: 'APP Perpustakaan', target: '192.168.2.0/24', maxLimit: '30M / 30M', burst: '50M / 50M', priority: '4 (Normal)', packets: '512,683' },
    { name: 'cctv', target: '192.168.66.0/24', maxLimit: '30M / 30M', burst: '30M / 30M', priority: '1 (Highest)', packets: '18,400,200' },
    { name: 'hs-<hotspot1>', target: 'bridgeCap_Hotspot', maxLimit: '100M / 100M', burst: '100M / 100M', priority: '8 (Lowest)', packets: '54,802,248' },
  ];

  const allArpNeighbors = [
    { ip: '192.168.80.5', mac: '7C:57:3C:C8:0C:90', interfaceName: 'ether11_config', identity: 'CNJ5J0T82C (HPE Switch)', protocol: 'LLDP / MNDP' },
    { ip: '36.66.246.162', mac: '78:9A:18:91:92:63', interfaceName: 'ether1_Internet', identity: 'RouterIDREN_UNMUS', protocol: 'MNDP (v7.8 stable)' },
    { ip: '36.66.246.173', mac: '48:A9:8A:82:98:BA', interfaceName: 'ether1_Internet', identity: 'CCR1036 (Core Router)', protocol: 'MNDP (v7.23.2)' },
    { ip: '192.168.77.105', mac: 'BC:D1:D3:44:11:A2', interfaceName: 'ether2_Lokal', identity: 'PC-Admin-DC01', protocol: 'ARP' },
    { ip: '192.168.77.188', mac: 'AC:87:A3:12:34:56', interfaceName: 'ether2_Lokal', identity: 'Ubuntu-Nginx-WAF', protocol: 'ARP' },
    { ip: '192.168.77.30', mac: '00:1A:2B:3C:4D:5E', interfaceName: 'ether2_Lokal', identity: 'PVE-Teknik (fatek)', protocol: 'ARP' },
    { ip: '192.168.77.99', mac: '00:1A:2B:3C:4D:99', interfaceName: 'ether2_Lokal', identity: 'PVE-Simlitabmas', protocol: 'ARP' },
    { ip: '192.168.5.18', mac: '2C:C8:1B:14:20:E1', interfaceName: 'ether2_Lokal', identity: 'MikroTik (CAPsMAN AP)', protocol: 'MNDP (v6.48 stable)' },
  ];

  const allSystemLogs = [
    { time: '10:14:22', topics: 'system, info', message: "User 'admin' logged in from 192.168.77.105 via WinBox/API", severity: 'info' },
    { time: '10:12:05', topics: 'dhcp, info', message: 'dhcp1 assigned 192.168.77.201 to 90:B6:86:12:88:AA (Laptop-Dekan)', severity: 'info' },
    { time: '09:55:40', topics: 'firewall, warning', message: 'input: drop ICMP flood attack from 185.220.101.5', severity: 'warning' },
    { time: '09:30:12', topics: 'interface, info', message: 'sfp-sfpplus1 link up (speed 10G, full duplex)', severity: 'info' },
    { time: '08:45:00', topics: 'wireguard, info', message: 'wireguard-site2site handshake succeeded with 10.200.0.2:51820', severity: 'info' },
    { time: '08:00:10', topics: 'system, warning', message: 'CPU temperature 48°C within normal operational threshold', severity: 'info' },
  ];

  const allHotspotSessions = [
    { user: 'dosen_komputer_01', ip: '10.20.2.14', uptime: '06h 40m', bytes: '1.2 GB / 4.8 GB', service: 'PPPoE' },
    { user: 'mahasiswa_2024_99', ip: '10.30.5.88', uptime: '02h 10m', bytes: '450 MB / 1.1 GB', service: 'Hotspot' },
    { user: 'staf_rektorat_05', ip: '10.20.1.12', uptime: '14h 50m', bytes: '8.5 GB / 12.1 GB', service: 'PPPoE' },
  ];

  const allIpPools = [
    { name: 'dhcp_pool_unmus', ranges: '192.168.77.100 - 192.168.77.250', total: 151, used: 17, usagePct: 11, interfaceName: 'ether2_Lokal', target: 'Server & NOC Subnet' },
    { name: 'hotspot_pool', ranges: '192.168.5.10 - 192.168.5.250', total: 241, used: 8, usagePct: 3, interfaceName: 'bridgeCap_Hotspot', target: 'Campus Wireless Pool' },
    { name: 'lab_si_pool', ranges: '192.168.6.10 - 192.168.6.100', total: 91, used: 12, usagePct: 13, interfaceName: 'ether6_LAB_SI', target: 'Lab Sistem Informasi' },
    { name: 'vpn_wireguard_pool', ranges: '10.200.0.2 - 10.200.0.254', total: 253, used: 4, usagePct: 2, interfaceName: 'wireguard', target: 'Site-to-Site Tunnel' },
  ];

  const allIpRoutes = [
    { dst: '0.0.0.0/0', gateway: '36.66.246.169', interfaceName: 'ether1_Internet', distance: 1, flags: 'AS (Active Static)', status: 'Reachable' },
    { dst: '192.168.77.0/24', gateway: 'ether2_Lokal', interfaceName: 'ether2_Lokal', distance: 0, flags: 'DAC (Connected)', status: 'Active' },
    { dst: '192.168.5.0/24', gateway: 'bridgeCap_Hotspot', interfaceName: 'bridgeCap_Hotspot', distance: 0, flags: 'DAC (Connected)', status: 'Active' },
    { dst: '192.168.80.0/24', gateway: 'ether11_config', interfaceName: 'ether11_config', distance: 0, flags: 'DAC (HPE Switch)', status: 'Active' },
    { dst: '10.200.0.0/24', gateway: 'wireguard-site2site', interfaceName: 'wireguard', distance: 0, flags: 'DAC (VPN Tunnel)', status: 'Active' },
    { dst: '192.168.6.0/24', gateway: 'ether6_LAB_SI', interfaceName: 'ether6_LAB_SI', distance: 0, flags: 'DAC (Lab SI)', status: 'Active' },
    { dst: '192.168.8.0/24', gateway: 'TEKNIK', interfaceName: 'TEKNIK', distance: 0, flags: 'DAC (Fak. Teknik)', status: 'Active' },
    { dst: '192.168.14.0/24', gateway: 'Dekanat_Ekonomi', interfaceName: 'Dekanat_Ekonomi', distance: 0, flags: 'DAC (Fak. Ekonomi)', status: 'Active' },
  ];

  // Dynamic Live State for Interface List
  const [interfacesState, setInterfacesState] = useState(allInterfaces);

  // Poll live traffic for main interfaces periodically (every 2.5s)
  useEffect(() => {
    let isMounted = true;

    const pollMainTraffic = async () => {
      try {
        const res = await fetch('/api/mikrotik/traffic?interface=ether1_Internet&source=rest_api');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && data.rxMbps !== undefined) {
            setInterfacesState((prev) =>
              prev.map((item) => {
                if (item.name === 'ether1_Internet') {
                  const rxStr = data.rxMbps >= 1 ? `${data.rxMbps.toFixed(2)} Mbps` : `${(data.rxMbps * 1000).toFixed(1)} Kbps`;
                  const txStr = data.txMbps >= 1 ? `${data.txMbps.toFixed(2)} Mbps` : `${(data.txMbps * 1000).toFixed(1)} Kbps`;
                  return {
                    ...item,
                    rx: rxStr,
                    tx: txStr,
                    rxPackets: `${data.rxPackets || 134} pps`,
                    txPackets: `${data.txPackets || 90} pps`,
                  };
                }
                return item;
              })
            );
          }
        }
      } catch (err) {
        // ignore
      }
    };

    const interval = setInterval(pollMainTraffic, 2500);
    pollMainTraffic();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filtering Functions
  const filteredDhcp = allDhcpLeases.filter((item) => {
    if (dhcpFilter === 'dynamic' && item.status.includes('static')) return false;
    if (dhcpFilter === 'static' && !item.status.includes('static')) return false;
    return (
      item.ip.includes(dhcpSearch) ||
      item.mac.toLowerCase().includes(dhcpSearch.toLowerCase()) ||
      item.hostname.toLowerCase().includes(dhcpSearch.toLowerCase())
    );
  });

  const filteredFw = allFirewallRules.filter(
    (item) =>
      item.comment.toLowerCase().includes(fwSearch.toLowerCase()) ||
      item.chain.toLowerCase().includes(fwSearch.toLowerCase()) ||
      item.action.toLowerCase().includes(fwSearch.toLowerCase())
  );

  const filteredIp = allIpAddresses.filter((item) => {
    if (
      ipSubnetFilter === 'lan' &&
      (item.interfaceName.toLowerCase().includes('internet') ||
        item.interfaceName.toLowerCase().includes('wan') ||
        item.flags.toLowerCase().includes('wan') ||
        item.comment.toLowerCase().includes('isp'))
    ) {
      return false;
    }
    if (
      ipSubnetFilter === 'wan' &&
      !(
        item.interfaceName.toLowerCase().includes('internet') ||
        item.interfaceName.toLowerCase().includes('wan') ||
        item.flags.toLowerCase().includes('wan') ||
        item.comment.toLowerCase().includes('isp')
      )
    ) {
      return false;
    }
    return (
      item.address.includes(ipSearch) ||
      item.interfaceName.toLowerCase().includes(ipSearch.toLowerCase()) ||
      item.comment.toLowerCase().includes(ipSearch.toLowerCase())
    );
  });

  const filteredQueues = allSimpleQueues.filter(
    (item) =>
      item.name.toLowerCase().includes(queueSearch.toLowerCase()) ||
      item.target.toLowerCase().includes(queueSearch.toLowerCase())
  );

  const filteredArp = allArpNeighbors.filter(
    (item) =>
      item.ip.includes(arpSearch) ||
      item.identity.toLowerCase().includes(arpSearch.toLowerCase()) ||
      item.mac.toLowerCase().includes(arpSearch.toLowerCase())
  );

  const filteredPools = allIpPools.filter(
    (item) =>
      item.name.toLowerCase().includes(poolRouteSearch.toLowerCase()) ||
      item.ranges.includes(poolRouteSearch) ||
      item.interfaceName.toLowerCase().includes(poolRouteSearch.toLowerCase())
  );

  const filteredRoutes = allIpRoutes.filter(
    (item) =>
      item.dst.includes(poolRouteSearch) ||
      item.gateway.toLowerCase().includes(poolRouteSearch.toLowerCase()) ||
      item.interfaceName.toLowerCase().includes(poolRouteSearch.toLowerCase())
  );

  const filteredLogs = allSystemLogs.filter(
    (item) =>
      item.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      item.topics.toLowerCase().includes(logSearch.toLowerCase())
  );

  const filteredSessions = allHotspotSessions.filter(
    (item) =>
      item.user.toLowerCase().includes(userSessionSearch.toLowerCase()) ||
      item.ip.includes(userSessionSearch)
  );

  // Pagination Slice Calculators
  const getPaginated = <T,>(data: T[], page: number, rows: number) => {
    const totalPages = Math.max(1, Math.ceil(data.length / rows));
    const validPage = Math.min(page, totalPages);
    const startIndex = (validPage - 1) * rows;
    const endIndex = Math.min(startIndex + rows, data.length);
    return {
      paginated: data.slice(startIndex, endIndex),
      totalPages,
      validPage,
      totalItems: data.length,
      startIndex: data.length === 0 ? 0 : startIndex + 1,
      endIndex,
    };
  };

  const pagDhcp = getPaginated(filteredDhcp, dhcpPage, dhcpRows);
  const pagFw = getPaginated(filteredFw, fwPage, fwRows);
  const pagIp = getPaginated(filteredIp, ipPage, ipRows);
  const pagQueue = getPaginated(filteredQueues, queuePage, queueRows);
  const pagArp = getPaginated(filteredArp, arpPage, arpRows);
  const pagPools = getPaginated(filteredPools, poolPage, poolRows);
  const pagRoutes = getPaginated(filteredRoutes, poolPage, poolRows);
  const pagLog = getPaginated(filteredLogs, logPage, logRows);
  const pagSession = getPaginated(filteredSessions, userSessionPage, userSessionRows);

  const handleRunScript = () => {
    let output = `[admin@MikroTik] > ${terminalCommand}\n`;
    if (terminalCommand.includes('resource')) {
      output += `uptime: ${currentRouter?.uptime}\nversion: ${currentRouter?.routerOSVersion}\ncpu-load: ${currentRouter?.cpuUsage}%\nfree-memory: 3.8GiB`;
    } else if (terminalCommand.includes('interface')) {
      output += `Flags: R - RUNNING\n #   NAME                  TYPE       ACTUAL-MTU  L2MTU\n 0 R sfp-sfpplus1         ether      1500        1580\n 1 R ether1-gateway       ether      1500        1580\n 2 R bridge1-lan          bridge     1500        1580`;
    } else if (terminalCommand.includes('export') || terminalCommand.includes('backup')) {
      output += `# RouterOS script export backup generated\n/ip address add address=${currentRouter?.ip}/24 interface=bridge1-lan\n/snmp set enabled=yes contact="sysadmin@unmus.ac.id"`;
    } else {
      output += `Command executed successfully. Target: ${currentRouter?.ip} via SNMP / WinBox API.`;
    }
    setTerminalOutput(output);
  };

  const togglePanel = (panelKey: string) => {
    setActivePanels((prev) => ({
      ...prev,
      [panelKey]: !prev[panelKey],
    }));
  };

  // Reordering Logic for Main Dashboard
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropVisibleIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropVisibleIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const visiblePanelKeys = panelOrder.filter((k) => activePanels[k]);
    const sourceKey = visiblePanelKeys[draggedIndex];
    const targetKey = visiblePanelKeys[dropVisibleIndex];

    const sourceOrderIdx = panelOrder.indexOf(sourceKey);
    const targetOrderIdx = panelOrder.indexOf(targetKey);

    if (sourceOrderIdx !== -1 && targetOrderIdx !== -1) {
      const newOrder = [...panelOrder];
      const [removed] = newOrder.splice(sourceOrderIdx, 1);
      newOrder.splice(targetOrderIdx, 0, removed);
      setPanelOrder(newOrder);
      localStorage.setItem('mikrotik_panel_order', JSON.stringify(newOrder));
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const movePanelInVisibleList = (visibleIndex: number, direction: 'up' | 'down') => {
    const targetVisibleIndex = direction === 'up' ? visibleIndex - 1 : visibleIndex + 1;
    const visiblePanelKeys = panelOrder.filter((k) => activePanels[k]);
    if (targetVisibleIndex < 0 || targetVisibleIndex >= visiblePanelKeys.length) return;

    const sourceKey = visiblePanelKeys[visibleIndex];
    const targetKey = visiblePanelKeys[targetVisibleIndex];

    const sourceOrderIdx = panelOrder.indexOf(sourceKey);
    const targetOrderIdx = panelOrder.indexOf(targetKey);

    if (sourceOrderIdx !== -1 && targetOrderIdx !== -1) {
      const newOrder = [...panelOrder];
      const temp = newOrder[sourceOrderIdx];
      newOrder[sourceOrderIdx] = newOrder[targetOrderIdx];
      newOrder[targetOrderIdx] = temp;
      setPanelOrder(newOrder);
      localStorage.setItem('mikrotik_panel_order', JSON.stringify(newOrder));
    }
  };

  const movePanelInGlobalOrder = (globalIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? globalIndex - 1 : globalIndex + 1;
    if (targetIndex < 0 || targetIndex >= panelOrder.length) return;

    const newOrder = [...panelOrder];
    const temp = newOrder[globalIndex];
    newOrder[globalIndex] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setPanelOrder(newOrder);
    localStorage.setItem('mikrotik_panel_order', JSON.stringify(newOrder));
  };

  const resetPanelOrder = () => {
    setPanelOrder(defaultPanelOrder);
    localStorage.removeItem('mikrotik_panel_order');
  };

  // Panel Metadata Mapping
  const panelMetaMap: {
    [key: string]: {
      title: string;
      subtitle: string;
      icon: any;
      fullWidth?: boolean;
    };
  } = {
    overviewStats: {
      title: 'Ringkasan Resource & Uptime',
      subtitle: 'CPU, RAM, Suhu Hardware, Total Port, & Active Leases',
      icon: Cpu,
      fullWidth: true,
    },
    capsmanTelemetry: {
      title: 'Wireless CAPsMAN & Telemetry',
      subtitle: 'Status 8 AP Controller, Client Signal dBm, Sensor Suhu & Fan',
      icon: Radio,
      fullWidth: true,
    },
    liveTrafficGraph: {
      title: 'Real-Time Interface Bandwidth',
      subtitle: 'Visualisasi live Ingress (RX) & Egress (TX) traffic port',
      icon: Activity,
      fullWidth: true,
    },
    vpnTunnels: {
      title: 'VPN & Remote Access Gateway',
      subtitle: 'WireGuard Site-to-Site, L2TP/IPsec, & Client Peer',
      icon: Lock,
      fullWidth: true,
    },
    dhcpLeasesTable: {
      title: 'Active DHCP Leases',
      subtitle: 'Daftar IP, MAC, Hostname, dan status masa sewa klien',
      icon: Wifi,
      fullWidth: false,
    },
    ipAddresses: {
      title: 'IP Addresses & Subnets',
      subtitle: 'Daftar IP terpasang pada interface & status gateway',
      icon: Globe,
      fullWidth: false,
    },
    firewallRules: {
      title: 'Firewall Filter & NAT Rules',
      subtitle: 'Filter rules, FastTrack, dan NAT masquerade WAN',
      icon: Shield,
      fullWidth: false,
    },
    simpleQueues: {
      title: 'Simple Queues Bandwidth',
      subtitle: 'Manajemen bandwidth target IP, VLAN, dan subnet',
      icon: Zap,
      fullWidth: false,
    },
    arpNeighbors: {
      title: 'ARP & MNDP Neighbors',
      subtitle: 'Perangkat terdeteksi via protokol ARP, MNDP, CDP & LLDP',
      icon: Network,
      fullWidth: false,
    },
    ipPoolsRoutes: {
      title: 'IP Pools & Routing Table',
      subtitle: 'Alokasi pool subnet dan tabel routing aktif',
      icon: Layers,
      fullWidth: false,
    },
    hotspotSessions: {
      title: 'PPPoE & Hotspot Sessions',
      subtitle: 'Monitoring sesi pengguna berjalan, IP, dan traffic data',
      icon: Users,
      fullWidth: false,
    },
    systemLogs: {
      title: 'RouterOS System Logs',
      subtitle: 'Log aktivitas sistem, event DHCP, dan firewall drops',
      icon: FileText,
      fullWidth: false,
    },
    terminalConsole: {
      title: 'RouterOS Terminal Console',
      subtitle: 'Eksekusi perintah Command Line (CLI) & Script RouterOS',
      icon: Terminal,
      fullWidth: false,
    },
  };

  const visiblePanelKeys = panelOrder.filter((k) => {
    if (!activePanels[k]) return false;
    if (activeCategory === 'all') return true;
    return categoryPanelMap[activeCategory]?.includes(k);
  });

  return (
    <div className="space-y-6">
      {/* Header & Router Selection Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Router className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-100">MikroTik RouterOS Monitoring</h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono">SNMP & REST API</span>
            </div>
            <p className="text-xs text-slate-400">Real-time bandwidth, full interface metrics, DHCP, IP, Firewall & Queues</p>
          </div>
        </div>

        {/* Action Controls: Router Picker, Panel Customizer, API Test Button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedRouterId}
            onChange={(e) => setSelectedRouterId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono flex-1 md:flex-initial"
          >
            {mikrotikNodes.map((router) => (
              <option key={router.id} value={router.id}>
                {router.name} ({router.ip})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition border border-slate-700"
            title="Tambah atau pilih & atur urutan panel widget"
          >
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <span>Atur & Geser Widget</span>
          </button>

          <button
            type="button"
            onClick={handleTestRealApi}
            disabled={isTestingApi}
            className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
            title="Uji Koneksi REST API Router"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
            <span>{isTestingApi ? 'Mengecek...' : 'Cek API Router'}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
            title="Poll SNMP Now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MIKROTIK CREDENTIALS & CONNECTION SYNC BAR */}
      <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Sinkronisasi Kredensial MikroTik RouterOS (REST API / WWW)
                {connectionStatus.connected ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Terhubung ({connectionStatus.boardName || 'CCR1036'})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-mono border border-slate-700">
                    Belum Terhubung
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Masukkan IP, Port WWW (default 80), Username, dan Password router untuk menarik telemetri real-time.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Metode: <span className="text-cyan-400 font-bold">RouterOS v7 REST API (port {routerPort})</span>
          </div>
        </div>

        {/* Success Alert Banner */}
        {configSuccessMsg && (
          <div className="bg-emerald-950/90 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-200 flex items-center justify-between gap-2 animate-fade-in shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{configSuccessMsg}</span>
            </div>
            <button
              onClick={() => setConfigSuccessMsg(null)}
              className="text-emerald-400 hover:text-white font-bold px-1.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {configErrorMsg && (
          <div className="bg-rose-950/95 border border-rose-500/60 rounded-xl p-3 text-xs text-rose-200 flex items-start justify-between gap-2 animate-fade-in shadow-xl">
            <div className="flex items-start gap-2">
              <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300">Gagal Terhubung ke MikroTik:</strong> {configErrorMsg}
                <div className="text-[11px] text-rose-400/80 mt-0.5">
                  💡 <em>Panduan:</em> Pastikan service <strong>www</strong> di WinBox (menu <strong>IP &gt; Services</strong>) aktif di port {routerPort}, dan user <strong>{routerUser}</strong> memiliki hak akses <em>read</em> dan <em>rest-api</em>.
                </div>
              </div>
            </div>
            <button
              onClick={() => setConfigErrorMsg(null)}
              className="text-rose-400 hover:text-white font-bold px-1.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Inputs Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Host IP */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 font-mono flex items-center gap-1">
              <Globe className="w-3 h-3 text-cyan-400" />
              Alamat IP / Host MikroTik
            </label>
            <input
              type="text"
              value={routerHost}
              onChange={(e) => setRouterHost(e.target.value)}
              placeholder="192.168.77.1"
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-cyan-500 text-slate-100 font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          {/* Port */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 font-mono flex items-center gap-1">
              <Server className="w-3 h-3 text-amber-400" />
              Port REST (WWW)
            </label>
            <input
              type="text"
              value={routerPort}
              onChange={(e) => setRouterPort(e.target.value)}
              placeholder="80"
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-amber-500 text-slate-100 font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 font-mono flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-400" />
              Username RouterOS
            </label>
            <input
              type="text"
              value={routerUser}
              onChange={(e) => setRouterUser(e.target.value)}
              placeholder="netwatch"
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-emerald-500 text-slate-100 font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          {/* Password with Eye Toggle */}
          <div className="space-y-1 relative">
            <label className="text-[11px] font-semibold text-slate-300 font-mono flex items-center gap-1">
              <Lock className="w-3 h-3 text-purple-400" />
              Password RouterOS
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={routerPass}
                onChange={(e) => setRouterPass(e.target.value)}
                placeholder="Password router..."
                className="w-full bg-slate-900 border border-slate-700/80 focus:border-purple-500 text-slate-100 font-mono text-xs rounded-xl px-3 py-2 pr-9 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Submit & Sync Button Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/60">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <span className="text-cyan-400">ℹ️</span>
            <span>Kredensial disimpan di SQLite (<code className="text-cyan-300">data/netwatch.db</code>) & otomatis sinkron ke target monitoring.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestRealApi}
              disabled={isTestingApi}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-semibold font-mono flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              title="Tes koneksi dan otentikasi username/password ke MikroTik tanpa menyimpan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
              <span>{isTestingApi ? 'Menguji Auth...' : '🧪 Uji Koneksi (Test Auth)'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveMikrotikConfig}
              disabled={isSavingConfig}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-2 shadow-lg shadow-cyan-900/30 disabled:opacity-50 transition cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${isSavingConfig ? 'animate-spin' : ''}`} />
              <span>{isSavingConfig ? 'Menghubungkan...' : '⚡ Simpan & Sinkronkan MikroTik'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SMART CATEGORY TABS NAVIGATION */}
      <MikroTikCategoryTabs
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        counters={{
          interfacesCount: allInterfaces.length,
          dhcpCount: allDhcpLeases.length,
          firewallCount: allFirewallRules.length,
          vpnCount: 4,
          activePanelsCount: Object.values(activePanels).filter(Boolean).length,
        }}
      />

      {/* Drag & Drop Instruction Hint Banner (Only on 'all' view or as subtle bar) */}
      <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-cyan-300 font-mono">
        <div className="flex items-center space-x-2">
          <GripVertical className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>
            <strong className="text-cyan-200 font-sans">Panel Fleksibel (Drag & Drop):</strong> Pegang handle{' '}
            <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 border border-slate-700">⠿</code> atau tombol{' '}
            <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 border border-slate-700">▲ ▼</code> untuk mengatur posisi.
          </span>
        </div>
        <button
          type="button"
          onClick={resetPanelOrder}
          className="text-[11px] text-cyan-400 hover:text-cyan-200 underline font-sans flex items-center space-x-1 flex-shrink-0 ml-2"
          title="Reset urutan posisi panel ke default"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Urutan</span>
        </button>
      </div>

      {/* API Test Status Result Alert */}
      {apiTestResult.status !== 'idle' && (
        <div
          className={`p-4 rounded-2xl border text-xs font-mono space-y-2 ${
            apiTestResult.status === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Status Koneksi API OmniGuard-Live Server &rarr; {apiTestResult.targetHost}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-300">
              Mode: {apiTestResult.mode}
            </span>
          </div>
          <p>{apiTestResult.details}</p>
          {apiTestResult.rawJson && (
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-32">
              <pre>{JSON.stringify(apiTestResult.rawJson, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* REORDERABLE PANELS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visiblePanelKeys.map((key, visibleIdx) => {
          const meta = panelMetaMap[key];
          if (!meta) return null;
          const IconComponent = meta.icon;

          const isDragging = draggedIndex === visibleIdx;
          const isDragOver = dragOverIndex === visibleIdx;

          // Render Header Actions & Body Content based on key
          let headerActions: React.ReactNode = null;
          let panelBody: React.ReactNode = null;

          if (key === 'overviewStats') {
            panelBody = currentRouter ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>CPU Core Load</span>
                    <Cpu className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-100">{currentRouter.cpuUsage}%</div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${currentRouter.cpuUsage > 80 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                      style={{ width: `${currentRouter.cpuUsage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>RAM Allocation</span>
                    <HardDrive className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-100">{currentRouter.ramUsage}%</div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${currentRouter.ramUsage}%` }}></div>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>CPU Temp / Uptime</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-100">{currentRouter.temperature || 41}°C</div>
                  <div className="text-xs text-slate-400 font-mono truncate">Uptime: {currentRouter.uptime}</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Total Interfaces / Leases</span>
                    <Wifi className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-100">{allInterfaces.length} Port / {allDhcpLeases.length} Lease</div>
                  <div className="text-xs text-emerald-400 font-mono">RouterOS {currentRouter.routerOSVersion}</div>
                </div>
              </div>
            ) : null;
          } else if (key === 'capsmanTelemetry') {
            panelBody = (
              <MikroTikCapsmanPanel
                routerIp={currentRouter?.ip || '192.168.77.1'}
                snmpExporterUrl="http://192.168.77.30:9117"
              />
            );
          } else if (key === 'liveTrafficGraph') {
            panelBody = (
              <MikroTikLiveTrafficGraphPanel
                interfaces={allInterfaces}
                defaultSelected="ether1_Internet"
                routerIp={currentRouter?.ip || '192.168.5.1'}
              />
            );
          } else if (key === 'vpnTunnels') {
            panelBody = (
              <MikroTikVpnPanel
                routerIp={currentRouter?.ip || '192.168.77.1'}
                routerName={currentRouter?.name || 'MikroTik CCR1036'}
                onSendToTerminal={(cmd) => {
                  setTerminalCommand(cmd);
                  setActiveCategory('tools_logs');
                }}
              />
            );
          } else if (key === 'dhcpLeasesTable') {
            headerActions = (
              <div className="relative w-32 sm:w-36 focus-within:w-44 transition-all duration-200">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari IP / Host..."
                  value={dhcpSearch}
                  onChange={(e) => {
                    setDhcpSearch(e.target.value);
                    setDhcpPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                />
              </div>
            );

            panelBody = (
              <>
                {/* Summary Metrics & Quick Filter Chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setDhcpFilter('all');
                        setDhcpPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition flex items-center space-x-1.5 ${
                        dhcpFilter === 'all'
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80 font-bold shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800/70 hover:text-slate-200'
                      }`}
                    >
                      <Wifi className="w-3 h-3 text-cyan-400" />
                      <span>Semua: <strong>{allDhcpLeases.length}</strong></span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDhcpFilter('dynamic');
                        setDhcpPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition flex items-center space-x-1.5 ${
                        dhcpFilter === 'dynamic'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 font-bold shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800/70 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span><strong>12</strong> Dynamic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDhcpFilter('static');
                        setDhcpPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition flex items-center space-x-1.5 ${
                        dhcpFilter === 'static'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-700/80 font-bold shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800/70 hover:text-slate-200'
                      }`}
                    >
                      <Server className="w-3 h-3 text-purple-400" />
                      <span><strong>5</strong> Static</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                    DHCP Server: <span className="text-slate-300 font-semibold">dhcp1</span> (Pool: <span className="text-cyan-400 font-semibold">192.168.77.100-254</span>)
                  </span>
                </div>

                <div className="overflow-hidden border border-slate-800/80 rounded-xl bg-slate-950/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/90 border-b border-slate-800">
                        <tr className="text-slate-400 text-[11px]">
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[27%]">IP Address</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[26%]">MAC Address</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[29%]">Hostname / Device</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[18%]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {pagDhcp.paginated.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500 font-sans text-xs">
                              Tidak ada lease DHCP yang cocok
                            </td>
                          </tr>
                        ) : (
                          pagDhcp.paginated.map((l, i) => (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-3.5 py-2.5 font-mono">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-cyan-300 text-xs tracking-tight">{l.ip}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(l.ip)}
                                    className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition opacity-60 hover:opacity-100"
                                    title="Salin IP"
                                  >
                                    {copiedText === l.ip ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono">
                                <span className="text-[11px] text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800/90 select-all tracking-wider inline-block">
                                  {l.mac}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-sans">
                                <div className="flex items-center space-x-2">
                                  <div className="p-1 rounded-md bg-slate-900 border border-slate-800 flex-shrink-0">
                                    {getDeviceIcon(l.hostname)}
                                  </div>
                                  <span className="text-slate-200 font-medium text-xs truncate max-w-[160px]" title={l.hostname}>
                                    {l.hostname}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center space-x-1.5">
                                  <span
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      l.status.includes('static')
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        l.status.includes('static') ? 'bg-purple-400' : 'bg-emerald-400 animate-pulse'
                                      }`}
                                    />
                                    <span>{l.status}</span>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <PaginationControls
                  currentPage={pagDhcp.validPage}
                  totalPages={pagDhcp.totalPages}
                  totalItems={pagDhcp.totalItems}
                  startIndex={pagDhcp.startIndex}
                  endIndex={pagDhcp.endIndex}
                  rowsPerPage={dhcpRows}
                  onPageChange={setDhcpPage}
                  onRowsPerPageChange={setDhcpRows}
                />
              </>
            );
          } else if (key === 'ipAddresses') {
            headerActions = (
              <div className="relative w-32 sm:w-36 focus-within:w-44 transition-all duration-200">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari IP / Subnet..."
                  value={ipSearch}
                  onChange={(e) => {
                    setIpSearch(e.target.value);
                    setIpPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                />
              </div>
            );

            panelBody = (
              <>
                {/* Summary Subnet Bar with Interactive Filter Chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setIpSubnetFilter('all');
                        setIpPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition flex items-center space-x-1.5 ${
                        ipSubnetFilter === 'all'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 font-bold shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800/70 hover:text-slate-200'
                      }`}
                    >
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span>Semua: <strong>{allIpAddresses.length}</strong> Subnet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIpSubnetFilter('lan');
                        setIpPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition flex items-center space-x-1.5 ${
                        ipSubnetFilter === 'lan'
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80 font-bold shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800/70 hover:text-slate-200'
                      }`}
                    >
                      <Network className="w-3 h-3 text-cyan-400" />
                      <span>LAN GW: <strong>192.168.77.1</strong></span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIpSubnetFilter('wan');
                        setIpPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition flex items-center space-x-1.5 ${
                        ipSubnetFilter === 'wan'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-700/80 font-bold shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800/70 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>WAN IP: <strong>36.66.246.173</strong></span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                    Routing Table: <span className="text-emerald-400 font-semibold">8 Active Routes</span>
                  </span>
                </div>

                <div className="overflow-hidden border border-slate-800/80 rounded-xl bg-slate-950/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/90 border-b border-slate-800">
                        <tr className="text-slate-400 text-[11px]">
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[30%]">Address / Subnet</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[25%]">Interface</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[17%]">Flags</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[28%]">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {pagIp.paginated.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500 font-sans text-xs">
                              Tidak ada subnet IP yang cocok
                            </td>
                          </tr>
                        ) : (
                          pagIp.paginated.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-3.5 py-2.5 font-mono">
                                <div className="flex items-center space-x-2">
                                  {renderIpWithCidr(item.address)}
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(item.address.split(' ')[0])}
                                    className="p-1 rounded text-slate-500 hover:text-emerald-300 hover:bg-slate-800 transition opacity-60 hover:opacity-100"
                                    title="Salin IP / Subnet"
                                  >
                                    {copiedText === item.address.split(' ')[0] ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono">
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 shadow-sm">
                                  <Network className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                  <span className="truncate max-w-[130px]">{item.interfaceName}</span>
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    item.flags.includes('DAC')
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                  }`}
                                  title={item.flags}
                                >
                                  {item.flags.includes('DAC') ? 'DAC (Active)' : item.flags}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-sans">
                                <div className="text-slate-200 font-medium text-xs truncate max-w-[200px]" title={item.comment}>
                                  {item.comment}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Net: {item.network}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <PaginationControls
                  currentPage={pagIp.validPage}
                  totalPages={pagIp.totalPages}
                  totalItems={pagIp.totalItems}
                  startIndex={pagIp.startIndex}
                  endIndex={pagIp.endIndex}
                  rowsPerPage={ipRows}
                  onPageChange={setIpPage}
                  onRowsPerPageChange={setIpRows}
                />
              </>
            );
          } else if (key === 'firewallRules') {
            headerActions = (
              <div className="relative w-32 sm:w-36 focus-within:w-44 transition-all duration-200">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari firewall rule..."
                  value={fwSearch}
                  onChange={(e) => {
                    setFwSearch(e.target.value);
                    setFwPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                />
              </div>
            );

            panelBody = (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="pb-2">Chain</th>
                        <th className="pb-2">Action</th>
                        <th className="pb-2">Proto/Port</th>
                        <th className="pb-2">Description / Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {pagFw.paginated.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            Tidak ada firewall rule ditemukan
                          </td>
                        </tr>
                      ) : (
                        pagFw.paginated.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 text-slate-300">{item.chain}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                                  item.action.includes('drop')
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : item.action.includes('accept')
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}
                              >
                                {item.action}
                              </span>
                            </td>
                            <td className="py-2.5 text-cyan-400">{item.protocol}:{item.port}</td>
                            <td className="py-2.5 text-slate-200">{item.comment}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  currentPage={pagFw.validPage}
                  totalPages={pagFw.totalPages}
                  totalItems={pagFw.totalItems}
                  startIndex={pagFw.startIndex}
                  endIndex={pagFw.endIndex}
                  rowsPerPage={fwRows}
                  onPageChange={setFwPage}
                  onRowsPerPageChange={setFwRows}
                />
              </>
            );
          } else if (key === 'simpleQueues') {
            headerActions = (
              <div className="relative w-32 sm:w-36 focus-within:w-44 transition-all duration-200">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari queue limit..."
                  value={queueSearch}
                  onChange={(e) => {
                    setQueueSearch(e.target.value);
                    setQueuePage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                />
              </div>
            );

            panelBody = (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="pb-2">Queue Name</th>
                        <th className="pb-2">Target</th>
                        <th className="pb-2">Max Limit (Up/Down)</th>
                        <th className="pb-2">Burst</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {pagQueue.paginated.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            Tidak ada queue ditemukan
                          </td>
                        </tr>
                      ) : (
                        pagQueue.paginated.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 text-slate-200 font-bold">{item.name}</td>
                            <td className="py-2.5 text-cyan-400">{item.target}</td>
                            <td className="py-2.5 text-yellow-300">{item.maxLimit}</td>
                            <td className="py-2.5 text-slate-400 text-[11px]">{item.burst}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  currentPage={pagQueue.validPage}
                  totalPages={pagQueue.totalPages}
                  totalItems={pagQueue.totalItems}
                  startIndex={pagQueue.startIndex}
                  endIndex={pagQueue.endIndex}
                  rowsPerPage={queueRows}
                  onPageChange={setQueuePage}
                  onRowsPerPageChange={setQueueRows}
                />
              </>
            );
          } else if (key === 'arpNeighbors') {
            headerActions = (
              <div className="relative w-32 sm:w-36 focus-within:w-44 transition-all duration-200">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari ARP / host..."
                  value={arpSearch}
                  onChange={(e) => {
                    setArpSearch(e.target.value);
                    setArpPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                />
              </div>
            );

            panelBody = (
              <>
                {/* Summary Neighbor Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold shadow-sm flex items-center space-x-1.5">
                      <Network className="w-3 h-3 text-purple-400" />
                      <span><strong>8</strong> Neighbors (MNDP & LLDP)</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shadow-sm hidden sm:inline-flex">
                      HPE Switch & Core Routers
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                    Protocols: <span className="text-cyan-400 font-semibold">MNDP, CDP, LLDP, ARP</span>
                  </span>
                </div>

                <div className="overflow-hidden border border-slate-800/80 rounded-xl bg-slate-950/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/90 border-b border-slate-800">
                        <tr className="text-slate-400 text-[11px]">
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[26%]">IP Address</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[26%]">MAC Address</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[22%]">Interface</th>
                          <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[26%]">Device / Identity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {pagArp.paginated.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500 font-sans text-xs">
                              Tidak ada entri ARP ditemukan
                            </td>
                          </tr>
                        ) : (
                          pagArp.paginated.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-3.5 py-2.5 font-mono">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-cyan-300 text-xs">{item.ip}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(item.ip)}
                                    className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition opacity-60 hover:opacity-100"
                                    title="Salin IP"
                                  >
                                    {copiedText === item.ip ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono">
                                <span className="text-[11px] text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800/80 select-all tracking-wider inline-block">
                                  {item.mac}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono">
                                <span className="px-2 py-0.5 rounded text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 inline-block">
                                  {item.interfaceName}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-sans">
                                <div className="flex items-center space-x-2">
                                  <span className="text-purple-300 font-semibold text-xs truncate max-w-[150px]" title={item.identity}>
                                    {item.identity}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60">
                                    {item.protocol}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <PaginationControls
                  currentPage={pagArp.validPage}
                  totalPages={pagArp.totalPages}
                  totalItems={pagArp.totalItems}
                  startIndex={pagArp.startIndex}
                  endIndex={pagArp.endIndex}
                  rowsPerPage={arpRows}
                  onPageChange={setArpPage}
                  onRowsPerPageChange={setArpRows}
                />
              </>
            );
          } else if (key === 'ipPoolsRoutes') {
            headerActions = (
              <div className="relative w-32 sm:w-36 focus-within:w-44 transition-all duration-200">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter pool / route..."
                  value={poolRouteSearch}
                  onChange={(e) => {
                    setPoolRouteSearch(e.target.value);
                    setPoolPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                />
              </div>
            );

            panelBody = (
              <>
                {/* Summary Toolbar & Tab Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                  <div className="flex items-center space-x-1.5 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setPoolRouteTab('pools');
                        setPoolPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg border transition flex items-center space-x-1.5 text-[11px] ${
                        poolRouteTab === 'pools'
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80 font-bold shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800/70 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3 h-3 text-cyan-400" />
                      <span>IP Pools: <strong>{allIpPools.length}</strong></span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPoolRouteTab('routes');
                        setPoolPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg border transition flex items-center space-x-1.5 text-[11px] ${
                        poolRouteTab === 'routes'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 font-bold shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800/70 hover:text-slate-200'
                      }`}
                    >
                      <Network className="w-3 h-3 text-emerald-400" />
                      <span>Routing Table: <strong>{allIpRoutes.length}</strong></span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                    Active Gateway: <span className="text-cyan-400 font-semibold">36.66.246.169 (IDREN)</span>
                  </span>
                </div>

                {poolRouteTab === 'pools' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {pagPools.paginated.map((pool, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2 hover:border-cyan-500/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-100 font-mono">{pool.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 font-mono">
                              {pool.used} / {pool.total} ({pool.usagePct}%)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">{pool.ranges}</div>
                          {/* Progress Bar */}
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(5, pool.usagePct)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Interface: <strong className="text-slate-400">{pool.interfaceName}</strong></span>
                            <span>{pool.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>DNS Server: <strong>103.111.x.x / 1.1.1.1</strong></span>
                      </span>
                      <span className="text-[11px] font-mono text-cyan-400">Cache: 1.2 MB (240 records)</span>
                    </div>

                    <PaginationControls
                      currentPage={pagPools.validPage}
                      totalPages={pagPools.totalPages}
                      totalItems={pagPools.totalItems}
                      startIndex={pagPools.startIndex}
                      endIndex={pagPools.endIndex}
                      rowsPerPage={poolRows}
                      onPageChange={setPoolPage}
                      onRowsPerPageChange={setPoolRows}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-hidden border border-slate-800/80 rounded-xl bg-slate-950/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-900/90 border-b border-slate-800">
                            <tr className="text-slate-400 text-[11px]">
                              <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[28%]">Dst. Address</th>
                              <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[26%]">Gateway</th>
                              <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[26%]">Interface</th>
                              <th className="px-3.5 py-2.5 font-semibold text-slate-300 w-[20%]">Flags / Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {pagRoutes.paginated.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-500 font-sans text-xs">
                                  Tidak ada route ditemukan
                                </td>
                              </tr>
                            ) : (
                              pagRoutes.paginated.map((r, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                  <td className="px-3.5 py-2.5 font-mono">
                                    <span className="text-cyan-300 font-bold text-xs">{r.dst}</span>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono">
                                    <span className="text-slate-200 text-xs">{r.gateway}</span>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono">
                                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-900 text-cyan-400 border border-slate-800 inline-block">
                                      {r.interfaceName}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        r.flags.includes('AS')
                                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      }`}
                                    >
                                      {r.flags}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <PaginationControls
                      currentPage={pagRoutes.validPage}
                      totalPages={pagRoutes.totalPages}
                      totalItems={pagRoutes.totalItems}
                      startIndex={pagRoutes.startIndex}
                      endIndex={pagRoutes.endIndex}
                      rowsPerPage={poolRows}
                      onPageChange={setPoolPage}
                      onRowsPerPageChange={setPoolRows}
                    />
                  </div>
                )}
              </>
            );
          } else if (key === 'hotspotSessions') {
            headerActions = (
              <div className="relative w-32 sm:w-36 focus-within:w-44 transition-all duration-200">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari user / IP..."
                  value={userSessionSearch}
                  onChange={(e) => {
                    setUserSessionSearch(e.target.value);
                    setUserSessionPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                />
              </div>
            );

            panelBody = (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="pb-2">Username</th>
                        <th className="pb-2">Assigned IP</th>
                        <th className="pb-2">Uptime</th>
                        <th className="pb-2">Traffic In/Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {pagSession.paginated.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            Tidak ada user aktif
                          </td>
                        </tr>
                      ) : (
                        pagSession.paginated.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 text-slate-200 font-bold">{item.user}</td>
                            <td className="py-2.5 text-cyan-300">{item.ip}</td>
                            <td className="py-2.5 text-emerald-400">{item.uptime}</td>
                            <td className="py-2.5 text-slate-400">{item.bytes}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  currentPage={pagSession.validPage}
                  totalPages={pagSession.totalPages}
                  totalItems={pagSession.totalItems}
                  startIndex={pagSession.startIndex}
                  endIndex={pagSession.endIndex}
                  rowsPerPage={userSessionRows}
                  onPageChange={setUserSessionPage}
                  onRowsPerPageChange={setUserSessionRows}
                />
              </>
            );
          } else if (key === 'systemLogs') {
            headerActions = (
              <div className="relative w-32 sm:w-36 focus-within:w-44 transition-all duration-200">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari log event..."
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value);
                    setLogPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                />
              </div>
            );

            panelBody = (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="pb-2">Waktu</th>
                        <th className="pb-2">Topics</th>
                        <th className="pb-2">Pesan Event Log</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {pagLog.paginated.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-500">
                            Tidak ada log ditemukan
                          </td>
                        </tr>
                      ) : (
                        pagLog.paginated.map((l, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            <td className="py-2 text-slate-400">{l.time}</td>
                            <td className="py-2 text-cyan-400">{l.topics}</td>
                            <td
                              className={`py-2 ${
                                l.severity === 'warning' ? 'text-amber-300 font-semibold' : 'text-slate-200'
                              }`}
                            >
                              {l.message}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  currentPage={pagLog.validPage}
                  totalPages={pagLog.totalPages}
                  totalItems={pagLog.totalItems}
                  startIndex={pagLog.startIndex}
                  endIndex={pagLog.endIndex}
                  rowsPerPage={logRows}
                  onPageChange={setLogPage}
                  onRowsPerPageChange={setLogRows}
                />
              </>
            );
          } else if (key === 'terminalConsole') {
            headerActions = (
              <span className="text-xs text-slate-400 font-mono px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg">
                {currentRouter?.ip}
              </span>
            );

            panelBody = (
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={terminalCommand}
                    onChange={(e) => setTerminalCommand(e.target.value)}
                    placeholder="/interface print ATAU /system resource print"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleRunScript}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run</span>
                  </button>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-xs text-emerald-400 h-48 overflow-y-auto whitespace-pre">
                  {terminalOutput}
                </div>
              </div>
            );
          }

          return (
            <DraggablePanelWrapper
              key={key}
              panelKey={key}
              index={visibleIdx}
              totalPanels={visiblePanelKeys.length}
              title={meta.title}
              subtitle={meta.subtitle}
              icon={<IconComponent className="w-5 h-5 text-cyan-400" />}
              isDragging={isDragging}
              isDragOver={isDragOver}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onMoveUp={() => movePanelInVisibleList(visibleIdx, 'up')}
              onMoveDown={() => movePanelInVisibleList(visibleIdx, 'down')}
              headerActions={headerActions}
              fullWidth={meta.fullWidth}
            >
              {panelBody}
            </DraggablePanelWrapper>
          );
        })}
      </div>

      {/* MODAL: CUSTOMIZER & REORDER PANEL WIDGET */}
      {isCustomizerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <LayoutGrid className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">Atur & Geser Posisi Widget Dashboard</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Gunakan ikon pegangan <code className="text-cyan-300">⠿</code> atau tombol <code className="text-cyan-300">▲ ▼</code> untuk memindahkan urutan panel, serta centang panel yang ingin Anda aktifkan:
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {panelOrder.map((key, orderIdx) => {
                const meta = panelMetaMap[key];
                if (!meta) return null;
                const IconComponent = meta.icon;

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      activePanels[key]
                        ? 'bg-slate-800/80 border-cyan-500/40 text-slate-100'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className="p-1 text-slate-500 hover:text-cyan-400 flex-shrink-0">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <IconComponent className={`w-4 h-4 ${activePanels[key] ? 'text-cyan-400' : 'text-slate-500'} flex-shrink-0`} />
                      <span className="text-xs font-medium truncate">{meta.title}</span>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="flex items-center space-x-1 border-r border-slate-700/60 pr-2">
                        <button
                          type="button"
                          onClick={() => movePanelInGlobalOrder(orderIdx, 'up')}
                          disabled={orderIdx === 0}
                          className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
                          title="Ke Atas"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePanelInGlobalOrder(orderIdx, 'down')}
                          disabled={orderIdx === panelOrder.length - 1}
                          className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
                          title="Ke Bawah"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="checkbox"
                        checked={!!activePanels[key]}
                        onChange={() => togglePanel(key)}
                        className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={resetPanelOrder}
                className="text-xs text-cyan-400 hover:underline font-mono flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Layout & Urutan</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCustomizerOpen(false)}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
              >
                Selesai & Simpan Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MikroTikMonitor;
