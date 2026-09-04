import React, { useState, useEffect } from 'react';
import { CustomDataSource } from '../types';
import {
  Plus,
  Search,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  ArrowRight,
  Shield,
  Network,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  Key,
  Eye,
  EyeOff,
  Layers,
  Power,
  Clock,
  Sparkles,
  Database
} from 'lucide-react';

interface DataSourcesManagerProps {
  onNavigateTab?: (tab: string) => void;
  onConfigChanged?: () => void;
}

export const PROXMOX_METRICS_CATALOG = [
  { id: 'pve_up', label: 'pve_up', desc: 'Node / VM / Storage online & running state', category: 'Health', defaultOn: true },
  { id: 'pve_cpu_usage_ratio', label: 'pve_cpu_usage_ratio', desc: 'Host and Guest CPU utilization ratio (0.0 - 1.0)', category: 'Compute', defaultOn: true },
  { id: 'pve_cpu_usage_limit', label: 'pve_cpu_usage_limit', desc: 'Allocated CPU core capacity limits', category: 'Compute', defaultOn: true },
  { id: 'pve_memory_usage_bytes', label: 'pve_memory_usage_bytes', desc: 'Active memory used in RAM bytes', category: 'Memory', defaultOn: true },
  { id: 'pve_memory_size_bytes', label: 'pve_memory_size_bytes', desc: 'Total maximum RAM capacity bytes', category: 'Memory', defaultOn: true },
  { id: 'pve_disk_usage_bytes', label: 'pve_disk_usage_bytes', desc: 'Storage consumption used in bytes', category: 'Storage', defaultOn: true },
  { id: 'pve_disk_size_bytes', label: 'pve_disk_size_bytes', desc: 'Storage pool maximum capacity in bytes', category: 'Storage', defaultOn: true },
  { id: 'pve_network_transmit_bytes_total', label: 'pve_network_transmit_bytes_total', desc: 'Guest outbound TX network throughput', category: 'Network', defaultOn: true },
  { id: 'pve_network_receive_bytes_total', label: 'pve_network_receive_bytes_total', desc: 'Guest inbound RX network throughput', category: 'Network', defaultOn: true },
  { id: 'pve_guest_info', label: 'pve_guest_info', desc: 'VM/CT metadata, IP tags, template flag', category: 'Metadata', defaultOn: true },
  { id: 'pve_onboot_status', label: 'pve_onboot_status', desc: 'VM auto-start onboot configuration', category: 'Config', defaultOn: true },
  { id: 'pve_not_backed_up_total', label: 'pve_not_backed_up_total', desc: 'Total guests lacking scheduled backup coverage', category: 'Backup', defaultOn: true },
  { id: 'pve_storage_info', label: 'pve_storage_info', desc: 'Storage pool type, content flags & shared mode', category: 'Storage', defaultOn: true },
  { id: 'pve_ha_state', label: 'pve_ha_state', desc: 'High Availability quorum and CRM status', category: 'HA', defaultOn: true },
];

export const PROMETHEUS_METRICS_CATALOG = [
  { id: 'node_cpu_seconds_total', label: 'node_cpu_seconds_total', desc: 'Host CPU seconds across modes', category: 'Compute', defaultOn: true },
  { id: 'node_memory_MemAvailable_bytes', label: 'node_memory_MemAvailable_bytes', desc: 'Available free memory in bytes', category: 'Memory', defaultOn: true },
  { id: 'node_filesystem_free_bytes', label: 'node_filesystem_free_bytes', desc: 'Mounted volume free space', category: 'Storage', defaultOn: true },
  { id: 'node_network_receive_bytes_total', label: 'node_network_receive_bytes_total', desc: 'Network interfaces inbound traffic', category: 'Network', defaultOn: true },
  { id: 'node_load1', label: 'node_load1', desc: '1-minute system load average', category: 'System', defaultOn: true },
];

export const MIKROTIK_METRICS_CATALOG = [
  { id: 'interface_rx_byte', label: 'interface_rx_byte', desc: 'WAN/LAN interface inbound byte counter', category: 'Network', defaultOn: true },
  { id: 'interface_tx_byte', label: 'interface_tx_byte', desc: 'WAN/LAN interface outbound byte counter', category: 'Network', defaultOn: true },
  { id: 'system_resource_cpu_load', label: 'system_resource_cpu_load', desc: 'MikroTik CPU load percentage', category: 'System', defaultOn: true },
  { id: 'system_resource_free_memory', label: 'system_resource_free_memory', desc: 'MikroTik free RAM bytes', category: 'System', defaultOn: true },
  { id: 'dhcp_lease_count', label: 'dhcp_lease_count', desc: 'Active LAN DHCP client leases', category: 'DHCP', defaultOn: true },
];

interface FormState {
  name: string;
  type: 'proxmox' | 'prometheus' | 'mikrotik' | 'crowdsec' | 'uptimeKuma' | 'custom_api';
  targetDashboard: 'proxmox' | 'prometheus' | 'mikrotik' | 'crowdsec' | 'uptimeKuma' | 'overview';
  endpoint: string;
  authType: 'none' | 'basic' | 'bearer' | 'apiKey';
  username: string;
  password: string;
  token: string;
  apiKey: string;
  pollIntervalMs: number;
  timeoutMs: number;
  enabled: boolean;
  notes: string;
  selectedMetrics: string[];
  instanceIp: string;
  moduleTarget: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  type: 'proxmox',
  targetDashboard: 'proxmox',
  endpoint: '',
  authType: 'none',
  username: '',
  password: '',
  token: '',
  apiKey: '',
  pollIntervalMs: 4000,
  timeoutMs: 5000,
  enabled: true,
  notes: '',
  selectedMetrics: PROXMOX_METRICS_CATALOG.map((m) => m.id),
  instanceIp: '192.168.14.2',
  moduleTarget: 'pve',
};

export const DataSourcesManager: React.FC<DataSourcesManagerProps> = ({
  onNavigateTab,
  onConfigChanged,
}) => {
  const [dataSources, setDataSources] = useState<CustomDataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedDashboardFilter, setSelectedDashboardFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // In-modal Test Probe State
  const [isModalTesting, setIsModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Card Probe State
  const [probingIds, setProbingIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedMetricsId, setExpandedMetricsId] = useState<string | null>(null);

  // Bulk probe state
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Load Data Sources
  const fetchDataSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/datasources');
      if (res.ok) {
        const data = await res.json();
        setDataSources(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch data sources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  // Quick Preset Handlers
  const handleApplyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'proxmox_node':
        setFormData({
          ...formData,
          name: 'Proxmox Node PVE-05 (Branch)',
          type: 'proxmox',
          targetDashboard: 'proxmox',
          endpoint: 'https://192.168.1.130:8006',
          authType: 'apiKey',
          token: 'root@pam!monitoring',
          pollIntervalMs: 4000,
          timeoutMs: 5000,
          notes: 'New Proxmox VE 8.2 secondary hypervisor node',
        });
        break;
      case 'pve_exporter_informatika':
        setFormData({
          ...formData,
          name: 'Proxmox Exporter (Node Informatika)',
          type: 'proxmox',
          targetDashboard: 'proxmox',
          endpoint: 'http://192.168.14.2:9221/pve?target=192.168.14.2',
          instanceIp: '192.168.14.2',
          moduleTarget: 'pve',
          authType: 'none',
          pollIntervalMs: 3000,
          timeoutMs: 5000,
          selectedMetrics: PROXMOX_METRICS_CATALOG.map((m) => m.id),
          notes: 'Prometheus pve_exporter target for Informatika cluster node',
        });
        break;
      case 'pve_exporter_pve':
        setFormData({
          ...formData,
          name: 'Proxmox Exporter (Node PVE - 21 Guests)',
          type: 'proxmox',
          targetDashboard: 'proxmox',
          endpoint: 'http://192.168.77.2:9221/pve?target=192.168.77.2',
          instanceIp: '192.168.77.2',
          moduleTarget: 'pve',
          authType: 'none',
          pollIntervalMs: 3000,
          timeoutMs: 5000,
          selectedMetrics: PROXMOX_METRICS_CATALOG.map((m) => m.id),
          notes: 'Prometheus pve_exporter target for PVE hypervisor cluster (Grafana, ReverseProxy)',
        });
        break;
      case 'pbs':
        setFormData({
          ...formData,
          name: 'Proxmox Backup Server (PBS)',
          type: 'proxmox',
          targetDashboard: 'proxmox',
          endpoint: 'https://192.168.1.135:8007',
          instanceIp: '192.168.1.135',
          moduleTarget: 'pbs',
          authType: 'apiKey',
          token: 'backup@pbs!token',
          pollIntervalMs: 5000,
          timeoutMs: 5000,
          selectedMetrics: ['pve_up', 'pve_disk_usage_bytes', 'pve_disk_size_bytes'],
          notes: 'Proxmox Backup Server deduplication datastore',
        });
        break;
      case 'mikrotik_switch':
        setFormData({
          ...formData,
          name: 'MikroTik CRS328 Distribution Switch',
          type: 'mikrotik',
          targetDashboard: 'mikrotik',
          endpoint: 'https://192.168.1.2:443',
          instanceIp: '192.168.1.2',
          moduleTarget: 'routeros',
          authType: 'basic',
          username: 'admin',
          password: '',
          pollIntervalMs: 4000,
          timeoutMs: 5000,
          selectedMetrics: MIKROTIK_METRICS_CATALOG.map((m) => m.id),
          notes: 'Core 10G SFP+ distribution switch RouterOS REST API',
        });
        break;
      case 'prom_node_exporter':
        setFormData({
          ...formData,
          name: 'Edge Ubuntu 24.04 Node Exporter',
          type: 'prometheus',
          targetDashboard: 'prometheus',
          endpoint: 'http://192.168.1.140:9100/metrics',
          instanceIp: '192.168.1.140',
          moduleTarget: 'node_exporter',
          authType: 'none',
          pollIntervalMs: 4000,
          timeoutMs: 5000,
          selectedMetrics: PROMETHEUS_METRICS_CATALOG.map((m) => m.id),
          notes: 'Standalone Node Exporter for app cluster host',
        });
        break;
      case 'kuma_monitor':
        setFormData({
          ...formData,
          name: 'Secondary Uptime Kuma Regional Probe',
          type: 'uptimeKuma',
          targetDashboard: 'uptimeKuma',
          endpoint: 'http://192.168.1.150:3001',
          instanceIp: '192.168.1.150',
          moduleTarget: 'default',
          authType: 'none',
          pollIntervalMs: 5000,
          timeoutMs: 5000,
          selectedMetrics: [],
          notes: 'Regional synthetic health checker',
        });
        break;
      default:
        break;
    }
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
    setModalTestResult(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (source: CustomDataSource) => {
    setEditingId(source.id);
    const defaultMetrics =
      source.type === 'proxmox'
        ? PROXMOX_METRICS_CATALOG.map((m) => m.id)
        : source.type === 'prometheus'
        ? PROMETHEUS_METRICS_CATALOG.map((m) => m.id)
        : source.type === 'mikrotik'
        ? MIKROTIK_METRICS_CATALOG.map((m) => m.id)
        : [];

    const extractedIp = source.endpoint.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);

    setFormData({
      name: source.name,
      type: source.type,
      targetDashboard: source.targetDashboard,
      endpoint: source.endpoint,
      authType: source.authType,
      username: source.username || '',
      password: source.password || '',
      token: source.token || '',
      apiKey: source.apiKey || '',
      pollIntervalMs: source.pollIntervalMs || 4000,
      timeoutMs: source.timeoutMs || 5000,
      enabled: source.enabled,
      notes: source.notes || '',
      selectedMetrics:
        source.selectedMetrics && source.selectedMetrics.length > 0
          ? source.selectedMetrics
          : defaultMetrics,
      instanceIp: source.instanceIp || (extractedIp ? extractedIp[0] : ''),
      moduleTarget: source.moduleTarget || 'pve',
    });
    setFormError(null);
    setModalTestResult(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Save Form (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.endpoint.trim()) {
      setFormError('Name and Endpoint URL/IP are required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const url = editingId ? `/api/datasources/${editingId}` : '/api/datasources';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save data source');
      }

      await fetchDataSources();
      if (onConfigChanged) onConfigChanged();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Data Source
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/datasources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDataSources((prev) => prev.filter((d) => d.id !== id));
        setDeleteConfirmId(null);
        if (onConfigChanged) onConfigChanged();
      }
    } catch (err: any) {
      console.error('Failed to delete data source:', err);
    }
  };

  // Toggle Data Source Enabled/Disabled
  const handleToggleEnabled = async (id: string) => {
    try {
      const res = await fetch(`/api/datasources/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDataSources((prev) =>
          prev.map((item) => (item.id === id ? data.dataSource : item))
        );
        if (onConfigChanged) onConfigChanged();
      }
    } catch (err: any) {
      console.error('Failed to toggle data source:', err);
    }
  };

  // Single Probe Test
  const handleProbeTest = async (id: string) => {
    setProbingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/datasources/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.dataSource) {
        setDataSources((prev) =>
          prev.map((item) => (item.id === id ? data.dataSource : item))
        );
      }
    } catch (err: any) {
      console.error('Probe test failed:', err);
    } finally {
      setProbingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Bulk Probe All Enabled Endpoints
  const handleTestAllEndpoints = async () => {
    setIsTestingAll(true);
    const enabledSources = dataSources.filter((d) => d.enabled);
    
    for (const source of enabledSources) {
      setProbingIds((prev) => ({ ...prev, [source.id]: true }));
      try {
        const res = await fetch(`/api/datasources/${source.id}/test`, { method: 'POST' });
        const data = await res.json();
        if (data.dataSource) {
          setDataSources((prev) =>
            prev.map((item) => (item.id === source.id ? data.dataSource : item))
          );
        }
      } catch (err) {
        // continue
      } finally {
        setProbingIds((prev) => ({ ...prev, [source.id]: false }));
      }
    }
    setIsTestingAll(false);
  };

  // In-modal Test Connection Probe
  const handleModalProbeTest = async () => {
    if (!formData.endpoint.trim()) {
      setFormError('Please enter an endpoint IP or URL first.');
      return;
    }
    setIsModalTesting(true);
    setModalTestResult(null);
    setFormError(null);

    try {
      const authPayload: any = {};
      if (formData.authType === 'basic') {
        authPayload.username = formData.username;
        authPayload.password = formData.password;
      } else if (formData.authType === 'bearer') {
        authPayload.token = formData.token;
      } else if (formData.authType === 'apiKey') {
        authPayload.apiKey = formData.apiKey || formData.token;
        authPayload.token = formData.token;
      }

      const res = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          url: formData.endpoint,
          auth: authPayload,
        }),
      });
      const data = await res.json();
      setModalTestResult(data);
    } catch (err: any) {
      setModalTestResult({ success: false, message: err.message });
    } finally {
      setIsModalTesting(false);
    }
  };

  // Copy URL helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered List
  const filteredSources = dataSources.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType =
      selectedTypeFilter === 'all' || item.type === selectedTypeFilter;

    const matchesDashboard =
      selectedDashboardFilter === 'all' || item.targetDashboard === selectedDashboardFilter;

    return matchesSearch && matchesType && matchesDashboard;
  });

  const totalCount = dataSources.length;
  const activeCount = dataSources.filter((d) => d.enabled).length;
  const onlineCount = dataSources.filter((d) => d.lastStatus === 'online').length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'proxmox':
        return <Server className="h-4 w-4 text-[#F0883E]" />;
      case 'mikrotik':
        return <Network className="h-4 w-4 text-[#58A6FF]" />;
      case 'prometheus':
        return <Cpu className="h-4 w-4 text-[#F78166]" />;
      case 'crowdsec':
        return <Shield className="h-4 w-4 text-[#A371F7]" />;
      case 'uptimeKuma':
        return <Activity className="h-4 w-4 text-[#3FB950]" />;
      default:
        return <Database className="h-4 w-4 text-[#E3B341]" />;
    }
  };

  const getDashboardLabel = (dashboard: string) => {
    switch (dashboard) {
      case 'proxmox':
        return { label: 'PROXMOX VE', color: 'text-[#F0883E] border-[#F0883E]/40 bg-[#F0883E]/10' };
      case 'mikrotik':
        return { label: 'MIKROTIK ROUTEROS', color: 'text-[#58A6FF] border-[#58A6FF]/40 bg-[#58A6FF]/10' };
      case 'prometheus':
        return { label: 'PROMETHEUS TSDB', color: 'text-[#F78166] border-[#F78166]/40 bg-[#F78166]/10' };
      case 'crowdsec':
        return { label: 'CROWDSEC RADAR', color: 'text-[#A371F7] border-[#A371F7]/40 bg-[#A371F7]/10' };
      case 'uptimeKuma':
        return { label: 'UPTIME KUMA', color: 'text-[#3FB950] border-[#3FB950]/40 bg-[#3FB950]/10' };
      default:
        return { label: 'SYSTEM OVERVIEW', color: 'text-[#E3B341] border-[#E3B341]/40 bg-[#E3B341]/10' };
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner & Telemetry Hub Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#161B22] border border-[#30363D] p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider">TOTAL ENDPOINTS</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalCount} Sources</div>
            <div className="text-[9px] text-[#8B949E]">Configured in Topology</div>
          </div>
          <div className="p-2.5 bg-[#0D1117] text-[#4F9CF9] border border-[#30363D]">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider">ACTIVE POLLING</div>
            <div className="text-xl font-bold text-[#7EE787] mt-0.5">{activeCount} Running</div>
            <div className="text-[9px] text-[#8B949E]">Continuous background sync</div>
          </div>
          <div className="p-2.5 bg-[#0D1117] text-[#7EE787] border border-[#30363D]">
            <Power className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider">LIVE VERIFIED</div>
            <div className="text-xl font-bold text-[#58A6FF] mt-0.5">{onlineCount} Online</div>
            <div className="text-[9px] text-[#8B949E]">Probe confirmed reachable</div>
          </div>
          <div className="p-2.5 bg-[#0D1117] text-[#58A6FF] border border-[#30363D]">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider">REAL-TIME ENGINE</div>
            <div className="text-sm font-bold text-[#7EE787] flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-[#7EE787] animate-ping" />
              HOT-RELOAD READY
            </div>
            <div className="text-[9px] text-[#8B949E]">Zero-restart config updates</div>
          </div>
          <button
            onClick={handleTestAllEndpoints}
            disabled={isTestingAll || activeCount === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] border border-[#30363D] text-[10px] font-bold tracking-wider transition-all disabled:opacity-50"
            title="Probe all active endpoints in parallel"
          >
            <RefreshCw className={`h-3 w-3 ${isTestingAll ? 'animate-spin' : ''}`} />
            <span>{isTestingAll ? 'PROBING...' : 'PROBE ALL'}</span>
          </button>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="bg-[#161B22] border border-[#30363D] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Search source name, IP address, port, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white text-[11px] placeholder-[#8B949E] focus:border-[#4F9CF9] focus:outline-none"
            />
          </div>

          {/* Filter by Type */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] text-[#C9D1D9] text-[11px] px-2.5 py-1.5 focus:border-[#4F9CF9] focus:outline-none"
          >
            <option value="all">ALL PROTOCOLS</option>
            <option value="proxmox">Proxmox VE (PVE)</option>
            <option value="prometheus">Prometheus TSDB</option>
            <option value="mikrotik">MikroTik RouterOS</option>
            <option value="crowdsec">CrowdSec LAPI</option>
            <option value="uptimeKuma">Uptime Kuma</option>
            <option value="custom_api">Custom REST API</option>
          </select>

          {/* Filter by Target Dashboard */}
          <select
            value={selectedDashboardFilter}
            onChange={(e) => setSelectedDashboardFilter(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] text-[#C9D1D9] text-[11px] px-2.5 py-1.5 focus:border-[#4F9CF9] focus:outline-none"
          >
            <option value="all">ALL TARGET DASHBOARDS</option>
            <option value="proxmox">Target: Proxmox VE</option>
            <option value="prometheus">Target: Prometheus</option>
            <option value="mikrotik">Target: MikroTik</option>
            <option value="crowdsec">Target: CrowdSec</option>
            <option value="uptimeKuma">Target: Uptime Kuma</option>
            <option value="overview">Target: Overview</option>
          </select>
        </div>

        {/* Add Source Button */}
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-[11px] uppercase tracking-wider border border-[#238636] transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>ADD DATA SOURCE</span>
        </button>
      </div>

      {/* Main Data Sources Cards List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-[#8B949E]">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span>Loading telemetry data sources...</span>
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="bg-[#161B22] border border-[#30363D] p-8 text-center text-[#8B949E]">
          <Server className="h-8 w-8 mx-auto mb-2 text-[#30363D]" />
          <p className="text-xs uppercase tracking-wider text-white">No data sources found matching filters</p>
          <p className="text-[11px] text-[#8B949E] mt-1">
            Click &quot;ADD DATA SOURCE&quot; to register a new IP, server, or exporter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSources.map((source) => {
            const isProbing = probingIds[source.id];
            const dashBadge = getDashboardLabel(source.targetDashboard);

            return (
              <div
                key={source.id}
                className={`bg-[#161B22] border transition-all flex flex-col justify-between ${
                  source.enabled ? 'border-[#30363D]' : 'border-[#30363D]/50 opacity-60'
                }`}
              >
                {/* Card Header */}
                <div className="p-3 border-b border-[#30363D]/70 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-[#0D1117] border border-[#30363D] mt-0.5">
                      {getTypeIcon(source.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-[12px] uppercase tracking-wide">
                          {source.name}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#0D1117] border border-[#30363D] text-[#8B949E]">
                          {source.type.toUpperCase()}
                        </span>

                        {/* Live Status Badge */}
                        {source.lastStatus === 'online' ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 bg-[#238636]/20 border border-[#238636] text-[#7EE787]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#7EE787] animate-pulse" />
                            ONLINE {source.lastLatencyMs !== undefined ? `• ${source.lastLatencyMs}ms` : ''}
                          </span>
                        ) : source.lastStatus === 'offline' ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 bg-[#F85149]/20 border border-[#F85149] text-[#F85149]">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            OFFLINE
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-[#0D1117] border border-[#30363D] text-[#8B949E]">
                            UNTESTED
                          </span>
                        )}

                        <span className="text-[9px] px-1.5 py-0.5 bg-[#0D1117] border border-[#30363D] text-[#8B949E] flex items-center gap-1">
                          <Key className="h-2.5 w-2.5" />
                          {source.authType.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enable / Disable Toggle */}
                  <button
                    onClick={() => handleToggleEnabled(source.id)}
                    title={source.enabled ? 'Click to pause polling' : 'Click to enable polling'}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      source.enabled
                        ? 'bg-[#238636]/20 text-[#7EE787] border-[#238636]'
                        : 'bg-[#21262D] text-[#8B949E] border-[#30363D]'
                    }`}
                  >
                    <Power className="h-3 w-3" />
                    <span>{source.enabled ? 'ACTIVE' : 'PAUSED'}</span>
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-3 space-y-2.5 flex-1">
                  {/* Endpoint IP and URL */}
                  <div className="flex items-center justify-between bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5">
                    <span className="text-[#8B949E] text-[10px] uppercase tracking-wider mr-2">ENDPOINT:</span>
                    <span className="font-mono text-[#58A6FF] text-[11px] truncate flex-1 select-all" title={source.endpoint}>
                      {source.endpoint}
                    </span>
                    <button
                      onClick={() => handleCopy(source.endpoint, source.id)}
                      className="ml-2 p-1 text-[#8B949E] hover:text-white transition-all"
                      title="Copy Endpoint"
                    >
                      {copiedId === source.id ? <Check className="h-3.5 w-3.5 text-[#7EE787]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Target Dashboard Routing Link */}
                  <div className="flex items-center justify-between bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8B949E] text-[10px] uppercase tracking-wider">ROUTES TO:</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${dashBadge.color}`}>
                        {dashBadge.label}
                      </span>
                    </div>

                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab(source.targetDashboard)}
                        className="flex items-center gap-1 text-[10px] text-[#58A6FF] hover:text-white uppercase font-bold tracking-wider transition-all"
                      >
                        <span>OPEN DASHBOARD</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Host Instance IP if available */}
                  {source.instanceIp && (
                    <div className="flex items-center justify-between bg-[#0D1117] border border-[#30363D] px-2.5 py-1 text-[10px]">
                      <span className="text-[#8B949E] uppercase tracking-wider">HOST INSTANCE IP:</span>
                      <span className="font-mono text-[#7EE787] font-bold">{source.instanceIp}</span>
                    </div>
                  )}

                  {/* Selected Metrics Badge & Preview */}
                  <div className="bg-[#0D1117] border border-[#30363D] p-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#8B949E] uppercase tracking-wider">
                        MAPPED METRICS:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMetricsId(expandedMetricsId === source.id ? null : source.id)
                        }
                        className="text-[#58A6FF] hover:underline font-bold"
                      >
                        {source.selectedMetrics && source.selectedMetrics.length > 0
                          ? `${source.selectedMetrics.length} Active Metrics`
                          : 'All Telemetry Metrics'}
                        {expandedMetricsId === source.id ? ' ▲' : ' ▼'}
                      </button>
                    </div>

                    {expandedMetricsId === source.id && (
                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-[#30363D]/60 max-h-28 overflow-y-auto">
                        {(source.selectedMetrics && source.selectedMetrics.length > 0
                          ? source.selectedMetrics
                          : source.type === 'proxmox'
                          ? PROXMOX_METRICS_CATALOG.map((m) => m.id)
                          : []
                        ).map((metricId) => (
                          <span
                            key={metricId}
                            className="font-mono text-[9px] px-1.5 py-0.5 bg-[#161B22] border border-[#30363D] text-[#7EE787]"
                          >
                            {metricId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes & Interval metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8B949E] pt-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        POLL: {source.pollIntervalMs}ms
                      </span>
                      <span>•</span>
                      <span>TIMEOUT: {source.timeoutMs}ms</span>
                    </div>

                    {source.lastTestedAt && (
                      <span className="text-[9px] text-[#8B949E]">
                        Tested {new Date(source.lastTestedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {source.notes && (
                    <p className="text-[10px] text-[#8B949E] italic bg-[#0D1117]/50 p-1.5 border border-[#30363D]/40">
                      {source.notes}
                    </p>
                  )}

                  {source.lastError && (
                    <div className="p-2 bg-[#F85149]/10 border border-[#F85149]/50 text-[#F85149] text-[10px] flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span className="break-all">{source.lastError}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-2.5 bg-[#0D1117] border-t border-[#30363D] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Test Probe Button */}
                    <button
                      onClick={() => handleProbeTest(source.id)}
                      disabled={isProbing}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] border border-[#30363D] text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isProbing ? 'animate-spin' : ''}`} />
                      <span>{isProbing ? 'PROBING...' : 'TEST PROBE'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(source)}
                      className="p-1.5 bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] hover:text-white border border-[#30363D] transition-all"
                      title="Edit Data Source"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete Button */}
                    {deleteConfirmId === source.id ? (
                      <div className="flex items-center gap-1 bg-[#F85149]/20 border border-[#F85149] px-1.5 py-0.5">
                        <span className="text-[9px] text-[#F85149] font-bold">CONFIRM?</span>
                        <button
                          onClick={() => handleDelete(source.id)}
                          className="px-1.5 py-0.5 bg-[#F85149] text-white text-[9px] font-bold hover:bg-[#da3633]"
                        >
                          YES
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 bg-[#21262D] text-[#C9D1D9] text-[9px] hover:text-white"
                        >
                          NO
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(source.id)}
                        className="p-1.5 bg-[#21262D] hover:bg-[#F85149]/20 text-[#8B949E] hover:text-[#F85149] border border-[#30363D] hover:border-[#F85149] transition-all"
                        title="Delete Data Source"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT DATA SOURCE MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto font-mono">
          <div className="bg-[#161B22] border border-[#30363D] w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#21262D] border border-[#30363D] text-[#4F9CF9]">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                    {editingId ? 'EDIT DATA SOURCE / TELEMETRY ENDPOINT' : 'ADD NEW TELEMETRY DATA SOURCE'}
                  </h3>
                  <p className="text-[10px] text-[#8B949E]">Configure live IP connection and map to dashboard view</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8B949E] hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Presets Bar (Only on Add) */}
            {!editingId && (
              <div className="p-3 bg-[#0D1117] border-b border-[#30363D]/60 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-[#8B949E] uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Sparkles className="h-3 w-3 text-[#E3B341]" />
                  QUICK PRESETS:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('pve_exporter_informatika')}
                  className="px-2 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#7EE787] border border-[#238636] text-[10px] font-bold"
                >
                  ⚡ Informatika Exporter (9221)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('pve_exporter_pve')}
                  className="px-2 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] border border-[#1F6FEB] text-[10px] font-bold"
                >
                  ⚡ PVE Cluster (21 VMs)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('proxmox_node')}
                  className="px-2 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#F0883E] border border-[#30363D] text-[10px]"
                >
                  + PVE API2 (8006)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('pbs')}
                  className="px-2 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#F0883E] border border-[#30363D] text-[10px]"
                >
                  + Proxmox Backup (PBS)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('mikrotik_switch')}
                  className="px-2 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] border border-[#30363D] text-[10px]"
                >
                  + MikroTik Switch
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('prom_node_exporter')}
                  className="px-2 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#F78166] border border-[#30363D] text-[10px]"
                >
                  + Node Exporter
                </button>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSaveForm} className="p-4 space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-[#F85149]/20 border border-[#F85149] text-[#F85149] text-[11px] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Source Name & Protocol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">
                    SOURCE DISPLAY NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Proxmox Cluster Node 05 (DC-2)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white text-[11px] focus:border-[#4F9CF9] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">
                    COLLECTOR PROTOCOL / TYPE *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setFormData({
                        ...formData,
                        type: newType,
                        targetDashboard: newType === 'custom_api' ? 'overview' : newType,
                      });
                    }}
                    className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white text-[11px] focus:border-[#4F9CF9] focus:outline-none"
                  >
                    <option value="proxmox">Proxmox VE (PVE API2 / Exporter)</option>
                    <option value="prometheus">Prometheus TSDB / Node Exporter</option>
                    <option value="mikrotik">MikroTik RouterOS (REST / WinBox)</option>
                    <option value="crowdsec">CrowdSec Security LAPI</option>
                    <option value="uptimeKuma">Uptime Kuma Health</option>
                    <option value="custom_api">Custom HTTP / REST Endpoint</option>
                  </select>
                </div>
              </div>

              {/* Target Dashboard Routing Dropdown */}
              <div className="bg-[#0D1117] border border-[#30363D] p-3 space-y-1">
                <label className="block text-[10px] text-[#4F9CF9] font-bold uppercase tracking-wider">
                  TARGET DASHBOARD (ROUTING DESTINATION) *
                </label>
                <p className="text-[10px] text-[#8B949E]">
                  Choose which dashboard tab will visualize and consume telemetry metrics from this endpoint.
                </p>
                <select
                  value={formData.targetDashboard}
                  onChange={(e) => setFormData({ ...formData, targetDashboard: e.target.value as any })}
                  className="w-full bg-[#161B22] border border-[#30363D] px-3 py-2 text-[#7EE787] font-bold text-[11px] focus:border-[#4F9CF9] focus:outline-none mt-1"
                >
                  <option value="proxmox">Proxmox VE Dashboard (Nodes, Clusters & VMs)</option>
                  <option value="mikrotik">MikroTik RouterOS Dashboard (WAN/LAN Interfaces, BGP & DHCP)</option>
                  <option value="prometheus">Prometheus Dashboard (Host Hardware CPU/RAM/Disk Metrics)</option>
                  <option value="crowdsec">CrowdSec Threat Radar (Intrusion Alerts & Banned IPs)</option>
                  <option value="uptimeKuma">Uptime Kuma Health (Synthetic Probes & Response Latency)</option>
                  <option value="overview">System Overview Dashboard (High-level Status Hub)</option>
                </select>
              </div>

              {/* Target Instance IP & Quick Connectivity Generator */}
              <div className="p-3 bg-[#0D1117] border border-[#30363D] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#58A6FF] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5" />
                    TARGET INSTANCE IP & MODULE GENERATOR (SERVER HOST CONNECTOR)
                  </label>
                  <span className="text-[9px] text-[#8B949E]">Pindah server tanpa ubah script</span>
                </div>
                <p className="text-[10px] text-[#8B949E]">
                  Masukkan IP server baru di sini. Tombol auto-apply di bawah akan langsung menyusun endpoint tanpa perlu Anda mengedit file code atau script konfigurasi.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <span className="text-[9px] text-[#8B949E] uppercase">Server Host IP / Domain</span>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.14.2 or 192.168.77.2"
                      value={formData.instanceIp}
                      onChange={(e) => {
                        const newIp = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          instanceIp: newIp,
                          endpoint:
                            prev.type === 'proxmox'
                              ? `http://${newIp}:9221/${prev.moduleTarget || 'pve'}?target=${newIp}`
                              : prev.type === 'prometheus'
                              ? `http://${newIp}:9100/metrics`
                              : prev.type === 'mikrotik'
                              ? `https://${newIp}:443`
                              : prev.endpoint,
                        }));
                      }}
                      className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1 text-white font-mono text-[11px] focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8B949E] uppercase">Module / Exporter Path</span>
                    <input
                      type="text"
                      placeholder="pve or default"
                      value={formData.moduleTarget}
                      onChange={(e) => {
                        const newMod = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          moduleTarget: newMod,
                          endpoint: prev.instanceIp
                            ? `http://${prev.instanceIp}:9221/${newMod}?target=${prev.instanceIp}`
                            : prev.endpoint,
                        }));
                      }}
                      className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1 text-white font-mono text-[11px] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[9px] text-[#8B949E]">Auto-Apply:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const ip = formData.instanceIp || '192.168.14.2';
                      setFormData({
                        ...formData,
                        instanceIp: ip,
                        endpoint: `http://${ip}:9221/${formData.moduleTarget || 'pve'}?target=${ip}`,
                        authType: 'none',
                      });
                    }}
                    className="px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] text-[#7EE787] text-[9px] border border-[#30363D]"
                  >
                    Use pve_exporter (Port 9221)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ip = formData.instanceIp || '192.168.14.2';
                      setFormData({
                        ...formData,
                        instanceIp: ip,
                        endpoint: `https://${ip}:8006`,
                        authType: 'apiKey',
                      });
                    }}
                    className="px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] text-[#F0883E] text-[9px] border border-[#30363D]"
                  >
                    Use PVE API2 (Port 8006)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ip = formData.instanceIp || '192.168.14.2';
                      setFormData({
                        ...formData,
                        instanceIp: ip,
                        endpoint: `http://${ip}:9100/metrics`,
                        authType: 'none',
                      });
                    }}
                    className="px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] text-[#F78166] text-[9px] border border-[#30363D]"
                  >
                    Use Node Exporter (Port 9100)
                  </button>
                </div>
              </div>

              {/* Endpoint URL or IP */}
              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">
                  TARGET ENDPOINT (IP / HOST / URL) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={
                      formData.type === 'proxmox'
                        ? 'https://192.168.1.130:8006 or http://192.168.1.130:9221/pve'
                        : formData.type === 'mikrotik'
                        ? 'https://192.168.1.1:443'
                        : formData.type === 'prometheus'
                        ? 'http://192.168.1.100:9090 or http://10.0.0.12:9100/metrics'
                        : 'http://192.168.1.110:3001'
                    }
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-[#58A6FF] font-mono text-[11px] focus:border-[#4F9CF9] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#8B949E] mt-1">
                  Self-signed SSL/TLS certificates on local LAN IPs (192.168.x.x, 10.x.x.x) are automatically accepted.
                </p>
              </div>

              {/* Authentication Settings */}
              <div className="border border-[#30363D] bg-[#0D1117] p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#8B949E] uppercase tracking-wider font-bold">
                    AUTHENTICATION METHOD
                  </label>
                  <select
                    value={formData.authType}
                    onChange={(e) => setFormData({ ...formData, authType: e.target.value as any })}
                    className="bg-[#161B22] border border-[#30363D] text-white text-[10px] px-2 py-1 focus:outline-none"
                  >
                    <option value="none">No Authentication (Public/Exporter)</option>
                    <option value="basic">HTTP Basic Auth (User & Pass)</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apiKey">API Key / Proxmox Token ID & Secret</option>
                  </select>
                </div>

                {formData.authType === 'basic' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-[#8B949E]">USERNAME</span>
                      <input
                        type="text"
                        placeholder="admin"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1 text-white text-[11px] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8B949E]">PASSWORD</span>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1 text-white text-[11px] focus:outline-none pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1.5 text-[#8B949E] hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(formData.authType === 'bearer' || formData.authType === 'apiKey') && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] text-[#8B949E]">
                        {formData.type === 'proxmox' ? 'PROXMOX TOKEN ID (e.g. root@pam!monitoring)' : 'TOKEN / API KEY'}
                      </span>
                      <input
                        type="text"
                        placeholder={formData.type === 'proxmox' ? 'root@pam!monitoring' : 'Enter API Key or Bearer Token'}
                        value={formData.token}
                        onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                        className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1 text-white text-[11px] focus:outline-none"
                      />
                    </div>

                    {formData.type === 'proxmox' && formData.authType === 'apiKey' && (
                      <div>
                        <span className="text-[9px] text-[#8B949E]">PROXMOX TOKEN SECRET (UUID)</span>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1 text-white text-[11px] focus:outline-none pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1.5 text-[#8B949E] hover:text-white"
                          >
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Metric Ingestion & Visualization Selection (Pilihan Metrics yang Diambil) */}
              <div className="p-3 bg-[#0D1117] border border-[#30363D] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-[10px] text-[#7EE787] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      PILIHAN METRICS YANG DIAMBIL (DASHBOARD METRIC ROUTING)
                    </label>
                    <p className="text-[10px] text-[#8B949E]">
                      Centang metrics yang ingin dikumpulkan dan divisualisasikan di dashboard target ({formData.targetDashboard}).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds =
                          formData.type === 'proxmox'
                            ? PROXMOX_METRICS_CATALOG.map((m) => m.id)
                            : formData.type === 'prometheus'
                            ? PROMETHEUS_METRICS_CATALOG.map((m) => m.id)
                            : formData.type === 'mikrotik'
                            ? MIKROTIK_METRICS_CATALOG.map((m) => m.id)
                            : [];
                        setFormData({ ...formData, selectedMetrics: allIds });
                      }}
                      className="px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] text-white text-[9px] border border-[#30363D]"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const essential =
                          formData.type === 'proxmox'
                            ? ['pve_up', 'pve_cpu_usage_ratio', 'pve_memory_usage_bytes', 'pve_disk_size_bytes', 'pve_onboot_status', 'pve_not_backed_up_total']
                            : [];
                        setFormData({ ...formData, selectedMetrics: essential });
                      }}
                      className="px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] text-[9px] border border-[#30363D]"
                    >
                      Essential Saja
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, selectedMetrics: [] })}
                      className="px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] text-[#F85149] text-[9px] border border-[#30363D]"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>

                <div className="text-[10px] font-bold text-[#58A6FF] bg-[#161B22] px-2.5 py-1 border border-[#30363D]/60 flex items-center justify-between">
                  <span>
                    TERPILIH: {formData.selectedMetrics.length} METRICS DARI{' '}
                    {formData.type === 'proxmox'
                      ? PROXMOX_METRICS_CATALOG.length
                      : formData.type === 'prometheus'
                      ? PROMETHEUS_METRICS_CATALOG.length
                      : formData.type === 'mikrotik'
                      ? MIKROTIK_METRICS_CATALOG.length
                      : 0}
                  </span>
                  <span className="text-[#8B949E] font-normal">
                    Format: Prometheus Key-Value Gauge & Counter
                  </span>
                </div>

                {/* Metric Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {(formData.type === 'proxmox'
                    ? PROXMOX_METRICS_CATALOG
                    : formData.type === 'prometheus'
                    ? PROMETHEUS_METRICS_CATALOG
                    : formData.type === 'mikrotik'
                    ? MIKROTIK_METRICS_CATALOG
                    : []
                  ).map((metric) => {
                    const isChecked = formData.selectedMetrics.includes(metric.id);
                    return (
                      <label
                        key={metric.id}
                        className={`flex items-start gap-2 p-2 border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-[#161B22] border-[#238636]/60 text-white'
                            : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:border-[#8B949E]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedMetrics: [...formData.selectedMetrics, metric.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedMetrics: formData.selectedMetrics.filter((id) => id !== metric.id),
                              });
                            }
                          }}
                          className="mt-0.5 accent-[#238636]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[11px] font-bold text-[#58A6FF] truncate">
                              {metric.label}
                            </span>
                            <span className="text-[8px] px-1 py-0.2 bg-[#21262D] text-[#D29922] font-bold uppercase">
                              {metric.category}
                            </span>
                          </div>
                          <p className="text-[9px] text-[#8B949E] line-clamp-1 mt-0.5">
                            {metric.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Intervals & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">
                    POLL INTERVAL (MS)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={formData.pollIntervalMs}
                    onChange={(e) => setFormData({ ...formData, pollIntervalMs: Number(e.target.value) })}
                    className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white text-[11px] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">
                    TIMEOUT (MS)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={formData.timeoutMs}
                    onChange={(e) => setFormData({ ...formData, timeoutMs: Number(e.target.value) })}
                    className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white text-[11px] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">
                  NOTES / LOCATION TAG
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rack B-12 Server Room, Production cluster node"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white text-[11px] focus:outline-none"
                />
              </div>

              {/* In-Modal Connection Test Probe Output */}
              {modalTestResult && (
                <div
                  className={`p-3 border text-[11px] ${
                    modalTestResult.success
                      ? 'bg-[#238636]/10 border-[#238636] text-[#7EE787]'
                      : 'bg-[#F85149]/10 border-[#F85149] text-[#F85149]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {modalTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span>{modalTestResult.message}</span>
                  </div>
                  {modalTestResult.statusCode && (
                    <div className="text-[10px] mt-1 text-[#8B949E]">
                      HTTP Status Code: <strong>{modalTestResult.statusCode}</strong> • Latency: <strong>{modalTestResult.latencyMs}ms</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 border-t border-[#30363D] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleModalProbeTest}
                  disabled={isModalTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] border border-[#30363D] text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isModalTesting ? 'animate-spin' : ''}`} />
                  <span>{isModalTesting ? 'TESTING...' : '⚡ TEST CONNECTION'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] text-[11px] uppercase tracking-wider border border-[#30363D]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-[11px] uppercase tracking-wider border border-[#238636] transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'SAVING...' : editingId ? 'UPDATE SOURCE' : 'SAVE & CONNECT'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
