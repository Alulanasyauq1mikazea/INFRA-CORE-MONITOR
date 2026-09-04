import React, { useState, useEffect } from 'react';
import { ProxmoxTelemetry, ProxmoxVm, ProxmoxNode, CustomDataSource } from '../types';
import {
  Server,
  Cpu,
  Layers,
  Activity,
  Search,
  HardDrive,
  LayoutGrid,
  List,
  CheckCircle2,
  ChevronRight,
  Boxes,
  Plus,
  Edit2,
  Trash2,
  Play,
  Square,
  RotateCw,
  RotateCcw,
  AlertCircle,
  X,
  ArrowRightLeft,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  Database,
} from 'lucide-react';
import { formatBytes, formatUptimeSeconds } from '../utils/formatters';
import { VmModal } from './proxmox/VmModal';
import { NodeModal } from './proxmox/NodeModal';
import { ConfirmDeleteModal } from './proxmox/ConfirmDeleteModal';
import { ServerSwitcherBar } from './proxmox/ServerSwitcherBar';
import { StorageSection } from './proxmox/StorageSection';
import { MetricsInspectorDrawer } from './proxmox/MetricsInspectorDrawer';

interface ProxmoxTabProps {
  telemetry: ProxmoxTelemetry;
  endpoint: string;
  onRefresh?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ProxmoxTab: React.FC<ProxmoxTabProps> = ({
  telemetry,
  endpoint,
  onRefresh,
  onNavigateTab,
}) => {
  const { cluster, nodes = [], vms = [], isLive } = telemetry;
  const [filterText, setFilterText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'qemu' | 'lxc'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [selectedNode, setSelectedNode] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');

  // Server Switcher & Metrics Inspector State
  const [dataSources, setDataSources] = useState<CustomDataSource[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<string>(endpoint);
  const [isMetricsDrawerOpen, setIsMetricsDrawerOpen] = useState(false);
  const [selectedStorageFilter, setSelectedStorageFilter] = useState<string>('all');
  const [metricFeatureFilter, setMetricFeatureFilter] = useState<'all' | 'onboot' | 'unbacked' | 'stopped'>('all');

  useEffect(() => {
    setActiveEndpoint(endpoint);
  }, [endpoint]);

  useEffect(() => {
    fetch('/api/datasources')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setDataSources(data);
      })
      .catch((err) => console.error('Failed to load data sources in ProxmoxTab:', err));
  }, []);

  const handleSelectDataSource = (ds: CustomDataSource) => {
    setActiveEndpoint(ds.endpoint);
    showToast('info', `Switched active server source to: ${ds.name} (${ds.endpoint})`);
    if (onRefresh) onRefresh();
  };

  // Modal states
  const [vmModalOpen, setVmModalOpen] = useState(false);
  const [selectedVmForEdit, setSelectedVmForEdit] = useState<ProxmoxVm | null>(null);

  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<ProxmoxNode | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'vm' | 'node' | 'reset';
    id?: number | string;
    name?: string;
  } | null>(null);

  const [isActionPending, setIsActionPending] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4500);
  };

  // Helper to get normalized node ID (e.g. 'pve-node-01')
  const getNodeKey = (nodeName: string) => {
    const match = nodeName.match(/(pve-node-\d+|[a-zA-Z0-9_-]+)/);
    return match ? match[1] : nodeName;
  };

  // Filtered VMs
  const filteredVms = (vms || []).filter((v) => {
    const matchText =
      (v?.name && v.name.toLowerCase().includes(filterText.toLowerCase())) ||
      String(v?.vmid || '').includes(filterText) ||
      (v?.node && v.node.toLowerCase().includes(filterText.toLowerCase()));

    const matchType = typeFilter === 'all' || v?.type === typeFilter;
    const matchStatus = statusFilter === 'all' || v?.status === statusFilter;
    const matchNode =
      selectedNode === 'all' ||
      (v?.node && v.node.toLowerCase().includes(selectedNode.toLowerCase()));

    const matchMetricFeature =
      metricFeatureFilter === 'all'
        ? true
        : metricFeatureFilter === 'onboot'
        ? v?.onboot === true
        : metricFeatureFilter === 'unbacked'
        ? v?.notBackedUp === true
        : metricFeatureFilter === 'stopped'
        ? v?.status === 'stopped'
        : true;

    return matchText && matchType && matchStatus && matchNode && matchMetricFeature;
  });

  // Calculate VM counts per node
  const getNodeGuests = (nodeName: string) => {
    const key = getNodeKey(nodeName).toLowerCase();
    const list = (vms || []).filter((v) => v?.node && v.node.toLowerCase().includes(key));
    const running = list.filter((v) => v.status === 'running').length;
    const stopped = list.filter((v) => v.status === 'stopped').length;
    const qemu = list.filter((v) => v.type === 'qemu').length;
    const lxc = list.filter((v) => v.type === 'lxc').length;
    return { list, running, stopped, qemu, lxc, total: list.length };
  };

  // ----------------------------------------------------
  // CRUD ACTIONS
  // ----------------------------------------------------

  // VM Power Controls (Start / Stop / Restart)
  const handlePowerAction = async (vmid: number, action: 'start' | 'stop' | 'restart', vmName: string) => {
    try {
      const res = await fetch(`/api/proxmox/vms/${vmid}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to execute power state change');
      }
      const label = action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'rebooted';
      showToast('success', `VM #${vmid} (${vmName}) ${label} successfully`);
      onRefresh?.();
    } catch (err: any) {
      showToast('error', `Power command failed: ${err.message}`);
    }
  };

  // Save VM (Create or Edit/Migrate)
  const handleSaveVm = async (formData: any) => {
    if (selectedVmForEdit) {
      // Edit / Migrate
      const res = await fetch(`/api/proxmox/vms/${formData.vmid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update VM');
      }
      showToast('success', `VM #${formData.vmid} (${formData.name}) updated successfully`);
    } else {
      // Create
      const res = await fetch('/api/proxmox/vms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to deploy VM');
      }
      showToast('success', `Guest instance #${formData.vmid} (${formData.name}) deployed on ${formData.node}`);
    }
    onRefresh?.();
  };

  // Save Host Server Node (Add or Edit)
  const handleSaveNode = async (formData: any) => {
    if (selectedNodeForEdit) {
      // Edit
      const res = await fetch(`/api/proxmox/nodes/${encodeURIComponent(selectedNodeForEdit.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update hypervisor node');
      }
      showToast('success', `Host server ${formData.name} updated`);
    } else {
      // Create
      const res = await fetch('/api/proxmox/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add hypervisor server');
      }
      showToast('success', `Hypervisor server ${formData.name} added to cluster`);
    }
    onRefresh?.();
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsActionPending(true);
    try {
      if (deleteTarget.type === 'vm') {
        const res = await fetch(`/api/proxmox/vms/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to destroy VM');
        }
        showToast('success', `VM #${deleteTarget.id} (${deleteTarget.name}) deleted`);
      } else if (deleteTarget.type === 'node') {
        const res = await fetch(`/api/proxmox/nodes/${encodeURIComponent(String(deleteTarget.id))}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to delete server node');
        }
        showToast('success', `Hypervisor server ${deleteTarget.name} removed from cluster`);
      } else if (deleteTarget.type === 'reset') {
        const res = await fetch('/api/proxmox/reset', { method: 'POST' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to reset inventory');
        }
        showToast('info', 'Proxmox hypervisor topology reset to default 4 servers and 24 VMs');
      }
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      onRefresh?.();
    } catch (err: any) {
      showToast('error', err.message || 'Operation failed');
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3 border flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top duration-200 ${
            toast.type === 'success'
              ? 'bg-[#238636]/10 border-[#238636] text-[#7EE787]'
              : toast.type === 'error'
              ? 'bg-[#F85149]/10 border-[#F85149] text-[#F85149]'
              : 'bg-[#1F6FEB]/10 border-[#1F6FEB] text-[#4F9CF9]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#238636]" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#F85149]" />
            ) : (
              <Activity className="h-4 w-4 shrink-0 text-[#1F6FEB]" />
            )}
            <span className="font-bold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-[#8B949E] hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Dynamic Server Source Switcher Bar (Pindah server tanpa ubah script) */}
      <ServerSwitcherBar
        currentEndpoint={activeEndpoint}
        dataSources={dataSources}
        onSelectDataSource={handleSelectDataSource}
        onNavigateConfig={onNavigateTab ? () => onNavigateTab('config') : undefined}
        activeMetricsCount={
          telemetry.metricDefinitions?.length ||
          (dataSources.find((s) => s.endpoint === activeEndpoint)?.selectedMetrics?.length) ||
          12
        }
        onToggleMetricsDrawer={() => setIsMetricsDrawerOpen(!isMetricsDrawerOpen)}
        isMetricsDrawerOpen={isMetricsDrawerOpen}
        isLive={isLive}
        lastLatencyMs={dataSources.find((s) => s.endpoint === activeEndpoint)?.lastLatencyMs || 14}
      />

      {/* Live Prometheus Metrics Inspector Drawer */}
      {isMetricsDrawerOpen && (
        <MetricsInspectorDrawer
          isOpen={isMetricsDrawerOpen}
          onClose={() => setIsMetricsDrawerOpen(false)}
          metricDefinitions={telemetry.metricDefinitions}
          rawExporterMetrics={telemetry.rawExporterMetrics}
          endpoint={activeEndpoint}
        />
      )}

      {/* Header Info & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0D1117] text-[#D29922] border border-[#30363D]">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white">{cluster.name}</h2>
              <span className={`text-[9px] px-1.5 py-0.2 font-bold ${
                cluster.quorate ? 'bg-[#238636] text-white' : 'bg-[#F85149] text-white'
              }`}>
                {cluster.quorate ? 'QUORATE' : 'QUORUM LOST'}
              </span>
              <span className="bg-[#0D1117] text-[#4F9CF9] border border-[#30363D] px-2 py-0.2 text-[9px] font-bold uppercase">
                {nodes.length} HYPERVISOR SERVERS
              </span>
            </div>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">
              TARGET: {endpoint} • PVE CLUSTER ARCHITECTURE • {vms.length} GUEST INSTANCES
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSelectedVmForEdit(null);
              setVmModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-bold uppercase transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            DEPLOY VM / LXC
          </button>

          <button
            onClick={() => {
              setSelectedNodeForEdit(null);
              setNodeModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#1F6FEB] hover:bg-[#388bfd] text-white text-[11px] font-bold uppercase transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Server className="h-3.5 w-3.5" />
            ADD HOST SERVER
          </button>

          <button
            onClick={() => {
              setDeleteTarget({ type: 'reset' });
              setDeleteModalOpen(true);
            }}
            title="Restore default 4 servers and 24 VMs"
            className="px-2.5 py-1.5 bg-[#0D1117] border border-[#30363D] hover:border-[#8B949E] text-[#8B949E] hover:text-white text-[10px] font-bold uppercase transition-colors flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            RESET
          </button>
        </div>
      </div>

      {/* Cluster Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cluster CPU */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Cpu className="h-3.5 w-3.5 text-[#D29922]" /> CLUSTER CPU
            </span>
            <span className="text-[#D29922] font-bold">{cluster.totalCpuPercent}%</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {cluster.totalCpuPercent}%
          </div>
          <div className="mt-2 w-full bg-[#0D1117] h-1.5">
            <div
              className="bg-[#D29922] h-full"
              style={{ width: `${Math.min(100, cluster.totalCpuPercent)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E]">
            ACROSS {nodes.length} SERVERS ({nodes.reduce((acc, n) => acc + (n.cpuCores || 0), 0)} TOTAL CORES)
          </div>
        </div>

        {/* Cluster Memory */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Activity className="h-3.5 w-3.5 text-[#4F9CF9]" /> CLUSTER RAM
            </span>
            <span className="text-[#4F9CF9] font-bold">{cluster.totalMemPercent}%</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {cluster.totalMemPercent}%
          </div>
          <div className="mt-2 w-full bg-[#0D1117] h-1.5">
            <div
              className="bg-[#4F9CF9] h-full"
              style={{ width: `${Math.min(100, cluster.totalMemPercent)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E]">
            {formatBytes(nodes.reduce((acc, n) => acc + (n.memBytes || 0), 0))} / {formatBytes(nodes.reduce((acc, n) => acc + (n.maxMemBytes || 0), 0))}
          </div>
        </div>

        {/* QEMU VMs */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Layers className="h-3.5 w-3.5 text-[#4F9CF9]" /> VIRTUAL MACHINES
            </span>
            <span className="text-[#4F9CF9] font-bold">QEMU</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {cluster.vmsRunning} <span className="text-xs font-normal text-[#8B949E]">/ {cluster.vmsTotal}</span>
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E]">
            {cluster.vmsRunning} RUNNING • {cluster.vmsTotal - cluster.vmsRunning} STOPPED
          </div>
        </div>

        {/* LXC Containers */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Boxes className="h-3.5 w-3.5 text-[#7EE787]" /> LINUX CONTAINERS
            </span>
            <span className="text-[#7EE787] font-bold">LXC</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {cluster.lxcsRunning} <span className="text-xs font-normal text-[#8B949E]">/ {cluster.lxcsTotal}</span>
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E]">
            {cluster.lxcsRunning} ACTIVE LXC CONTAINERS
          </div>
        </div>
      </div>

      {/* Hypervisor Nodes Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-[#D29922]" />
            PROXMOX HOST HYPERVISOR NODES ({nodes.length} SERVERS)
          </h3>
          <span className="text-[10px] text-[#8B949E]">
            CLICK CARD TO FILTER VMS • USE ACTION BUTTONS TO CONFIGURE SERVERS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(nodes || []).map((node) => {
            const nodeKey = getNodeKey(node.name);
            const isSelected = selectedNode.toLowerCase() === nodeKey.toLowerCase();
            const guestStats = getNodeGuests(node.name);

            return (
              <div
                key={node.name}
                className={`bg-[#161B22] border p-4 space-y-3 transition-all ${
                  isSelected
                    ? 'border-[#D29922] bg-[#1c2128] ring-1 ring-[#D29922]'
                    : 'border-[#30363D] hover:border-[#8B949E]'
                }`}
              >
                {/* Node Header */}
                <div className="border-b border-[#30363D] pb-2">
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => setSelectedNode(isSelected ? 'all' : nodeKey)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className={`h-2 w-2 rounded-full ${node.status === 'online' ? 'bg-[#7EE787] animate-pulse' : 'bg-[#F85149]'}`} />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        {nodeKey}
                      </span>
                    </div>

                    {/* Node Quick Action Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeForEdit(node);
                          setNodeModalOpen(true);
                        }}
                        title="Edit Server specs & status"
                        className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#4F9CF9] text-[#8B949E] hover:text-[#4F9CF9] transition-colors"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({
                            type: 'node',
                            id: node.name,
                            name: nodeKey,
                          });
                          setDeleteModalOpen(true);
                        }}
                        title="Delete Host Server"
                        className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#F85149] text-[#8B949E] hover:text-[#F85149] transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p
                    onClick={() => setSelectedNode(isSelected ? 'all' : nodeKey)}
                    className="text-[10px] text-[#8B949E] truncate mt-1 cursor-pointer"
                    title={node.name}
                  >
                    {node.name.replace(/^pve-node-\d+\s*/, '') || 'Hypervisor Node'}
                  </p>
                </div>

                {/* Node Meters */}
                <div
                  onClick={() => setSelectedNode(isSelected ? 'all' : nodeKey)}
                  className="grid grid-cols-3 gap-2 text-[10px] cursor-pointer"
                >
                  {/* CPU */}
                  <div className="bg-[#0D1117] p-2 border border-[#30363D]">
                    <span className="text-[#8B949E] text-[9px] block uppercase">CPU</span>
                    <span className="text-[#D29922] font-bold text-xs">{node.cpuPercent}%</span>
                    <div className="mt-1 bg-[#161B22] h-1">
                      <div className="bg-[#D29922] h-full" style={{ width: `${Math.min(100, node.cpuPercent)}%` }} />
                    </div>
                  </div>

                  {/* RAM */}
                  <div className="bg-[#0D1117] p-2 border border-[#30363D]">
                    <span className="text-[#8B949E] text-[9px] block uppercase">RAM</span>
                    <span className="text-[#4F9CF9] font-bold text-xs">{formatBytes(node.memBytes)}</span>
                    <div className="mt-1 bg-[#161B22] h-1">
                      <div className="bg-[#4F9CF9] h-full" style={{ width: `${Math.min(100, (node.memBytes / (node.maxMemBytes || 1)) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Disk */}
                  <div className="bg-[#0D1117] p-2 border border-[#30363D]">
                    <span className="text-[#8B949E] text-[9px] block uppercase">DISK</span>
                    <span className="text-[#7EE787] font-bold text-xs">{formatBytes(node.diskBytes)}</span>
                    <div className="mt-1 bg-[#161B22] h-1">
                      <div className="bg-[#7EE787] h-full" style={{ width: `${Math.min(100, (node.diskBytes / (node.maxDiskBytes || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* VM Count on this Server */}
                <div
                  onClick={() => setSelectedNode(isSelected ? 'all' : nodeKey)}
                  className="bg-[#0D1117] p-2 border border-[#30363D] flex items-center justify-between text-[10px] cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[#E0E0E0]">
                    <Boxes className="h-3.5 w-3.5 text-[#4F9CF9]" />
                    <span className="font-bold">{guestStats.total} GUESTS</span>
                  </div>
                  <span className="text-[#8B949E]">
                    {guestStats.running} RUNNING • {guestStats.stopped} STOPPED
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cluster Storage Pools Section (local-lvm, Hardisk2, Hardisk3, Hardisk4, local) */}
      <StorageSection
        storages={telemetry.storages || []}
        selectedStorageFilter={selectedStorageFilter}
        onSelectStorageFilter={(storageId) => {
          setSelectedStorageFilter(storageId);
          if (storageId !== 'all') {
            showToast('info', `Filtering dashboard for storage pool: ${storageId}`);
          }
        }}
        selectedNode={selectedNode}
        onSelectNode={setSelectedNode}
      />

      {/* Filter and View Mode Switcher */}
      <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
        {/* Top Controls: Search + Filters + View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8B949E]" />
              <input
                type="text"
                placeholder="SEARCH BY VMID, GUEST NAME, OR SERVER NODE..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#8B949E] focus:border-[#D29922] outline-none"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center border border-[#30363D] bg-[#0D1117]">
              {(['all', 'qemu', 'lxc'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 text-[10px] uppercase font-bold transition-colors ${
                    typeFilter === t
                      ? 'bg-[#161B22] text-white border-b-2 border-[#D29922]'
                      : 'text-[#8B949E] hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'ALL TYPES' : t.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center border border-[#30363D] bg-[#0D1117]">
              {(['all', 'running', 'stopped'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-[10px] uppercase font-bold transition-colors ${
                    statusFilter === s
                      ? 'bg-[#161B22] text-white border-b-2 border-[#238636]'
                      : 'text-[#8B949E] hover:text-white'
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Prometheus Metric Ingestion Filter */}
            <div className="flex items-center border border-[#30363D] bg-[#0D1117]">
              {(['all', 'onboot', 'unbacked', 'stopped'] as const).map((mf) => (
                <button
                  key={mf}
                  onClick={() => setMetricFeatureFilter(mf)}
                  className={`px-2.5 py-1.5 text-[10px] uppercase font-bold transition-colors ${
                    metricFeatureFilter === mf
                      ? 'bg-[#161B22] text-[#7EE787] border-b-2 border-[#7EE787]'
                      : 'text-[#8B949E] hover:text-white'
                  }`}
                  title={
                    mf === 'onboot'
                      ? 'Filter VMs with onboot status = enabled (pve_onboot_status)'
                      : mf === 'unbacked'
                      ? 'Filter VMs without backup snapshot (pve_not_backed_up_total)'
                      : mf === 'stopped'
                      ? 'Filter offline instances (pve_up = 0)'
                      : 'All instances'
                  }
                >
                  {mf === 'all'
                    ? 'ALL METRICS'
                    : mf === 'onboot'
                    ? '⚡ ONBOOT'
                    : mf === 'unbacked'
                    ? '⚠ NO BACKUP'
                    : 'OFFLINE'}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#0D1117] p-1 border border-[#30363D]">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-[#161B22] text-[#D29922] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              GROUPED BY SERVER
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#161B22] text-[#4F9CF9] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              CONSOLIDATED TABLE
            </button>
          </div>
        </div>

        {/* Server Node Selection Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#30363D]/60 text-[10px]">
          <span className="text-[#8B949E] uppercase font-bold whitespace-nowrap">SERVER FILTER:</span>
          <button
            onClick={() => setSelectedNode('all')}
            className={`px-2.5 py-1 uppercase font-bold whitespace-nowrap transition-colors border ${
              selectedNode === 'all'
                ? 'bg-[#D29922] text-[#0D1117] border-[#D29922]'
                : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
            }`}
          >
            ALL {nodes.length} SERVERS ({vms.length})
          </button>
          {nodes.map((node) => {
            const key = getNodeKey(node.name);
            const isSel = selectedNode.toLowerCase() === key.toLowerCase();
            const count = getNodeGuests(node.name).total;

            return (
              <button
                key={node.name}
                onClick={() => setSelectedNode(isSel ? 'all' : key)}
                className={`px-2.5 py-1 uppercase font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-[#1F6FEB] text-white border-[#1F6FEB]'
                    : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
                }`}
              >
                <span>{key}</span>
                <span className="text-[9px] px-1 bg-[#161B22] text-white border border-[#30363D]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guest Instances List / Tables */}
      <div className="bg-[#161B22] border border-[#30363D] p-4">
        {/* Total match header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#30363D]">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-bold uppercase tracking-wider">
              {viewMode === 'grouped' ? 'HYPERVISOR HOST GROUPS' : 'ALL GUEST INSTANCES'}
            </span>
            <span className="text-[10px] text-[#8B949E]">
              SHOWING {filteredVms.length} OF {vms.length} INSTANCES
            </span>
          </div>
          {selectedNode !== 'all' && (
            <button
              onClick={() => setSelectedNode('all')}
              className="text-[10px] text-[#4F9CF9] hover:underline"
            >
              CLEAR SERVER FILTER ({selectedNode})
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VIEW MODE 1: GROUPED BY SERVER                                    */}
        {/* ------------------------------------------------------------------ */}
        {viewMode === 'grouped' ? (
          <div className="space-y-6">
            {nodes
              .filter((n) => selectedNode === 'all' || getNodeKey(n.name).toLowerCase() === selectedNode.toLowerCase())
              .map((node) => {
                const nodeKey = getNodeKey(node.name);
                const nodeVms = filteredVms.filter((v) =>
                  v?.node && v.node.toLowerCase().includes(nodeKey.toLowerCase())
                );
                const guestStats = getNodeGuests(node.name);

                return (
                  <div key={node.name} className="border border-[#30363D] bg-[#0D1117]">
                    {/* Server Header Block */}
                    <div className="p-3 bg-[#161B22] border-b border-[#30363D] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#0D1117] text-[#4F9CF9] border border-[#30363D]">
                          <Server className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-bold text-xs uppercase tracking-wider">
                              SERVER: {nodeKey}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 font-bold uppercase ${
                              node.status === 'online' ? 'bg-[#238636] text-white' : 'bg-[#F85149] text-white'
                            }`}>
                              {node.status}
                            </span>
                            <span className="text-[10px] text-[#8B949E]">
                              {node.cpuCores} vCPU Cores • {node.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-[#8B949E] mt-0.5 flex-wrap">
                            <span>CPU: <strong className="text-[#D29922]">{node.cpuPercent}%</strong></span>
                            <span>RAM: <strong className="text-[#4F9CF9]">{formatBytes(node.memBytes)}</strong> / {formatBytes(node.maxMemBytes)}</span>
                            <span>DISK: <strong className="text-[#7EE787]">{formatBytes(node.diskBytes)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="bg-[#0D1117] px-2.5 py-1 border border-[#30363D] text-[#E0E0E0]">
                          HOSTING: <strong>{nodeVms.length}</strong> GUESTS ({guestStats.running} RUNNING)
                        </span>
                        <button
                          onClick={() => {
                            setSelectedVmForEdit(null);
                            setVmModalOpen(true);
                          }}
                          className="p-1.5 bg-[#0D1117] border border-[#30363D] hover:border-[#238636] text-[#7EE787] text-[10px] font-bold flex items-center gap-1"
                          title={`Deploy new VM directly to ${nodeKey}`}
                        >
                          <Plus className="h-3 w-3" />
                          DEPLOY HERE
                        </button>
                        <button
                          onClick={() => {
                            setSelectedNodeForEdit(node);
                            setNodeModalOpen(true);
                          }}
                          className="p-1.5 bg-[#0D1117] border border-[#30363D] hover:border-[#4F9CF9] text-[#8B949E] hover:text-[#4F9CF9]"
                          title="Edit host server configuration"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Server VMs List */}
                    {nodeVms.length === 0 ? (
                      <div className="p-6 text-center text-[#8B949E] text-xs">
                        No virtual machines or containers match the current filter criteria on this server.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] text-[#E0E0E0]">
                          <thead className="bg-[#0D1117] text-[#8B949E] uppercase text-[10px] tracking-wider border-b border-[#30363D]">
                            <tr>
                              <th className="px-4 py-2">VMID</th>
                              <th className="px-4 py-2">GUEST NAME</th>
                              <th className="px-4 py-2">TYPE</th>
                              <th className="px-4 py-2">STATUS</th>
                              <th className="px-4 py-2">ONBOOT</th>
                              <th className="px-4 py-2">BACKUP</th>
                              <th className="px-4 py-2">VCPU ALLOC</th>
                              <th className="px-4 py-2">RAM (MEM)</th>
                              <th className="px-4 py-2">DISK CAPACITY</th>
                              <th className="px-4 py-2">UPTIME</th>
                              <th className="px-4 py-2 text-right">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#30363D]/40 font-mono">
                            {nodeVms.map((vm) => (
                              <tr key={`${vm.node || 'node'}-${vm.type || 'vm'}-${vm.vmid}`} className="hover:bg-[#161B22] transition-colors">
                                <td className="px-4 py-2 font-bold text-[#D29922]">{vm.vmid}</td>
                                <td className="px-4 py-2 font-bold text-white flex items-center gap-1.5">
                                  <ChevronRight className="h-3 w-3 text-[#8B949E]" />
                                  <span>{vm.name}</span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`px-1.5 py-0.2 text-[9px] uppercase font-bold border ${
                                    vm.type === 'qemu'
                                      ? 'bg-[#0D1117] text-[#4F9CF9] border-[#4F9CF9]/40'
                                      : 'bg-[#0D1117] text-[#7EE787] border-[#7EE787]/40'
                                  }`}>
                                    {vm.type === 'qemu' ? 'QEMU VM' : 'LXC CT'}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  {vm.status === 'running' ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#238636] text-white">
                                      <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                                      RUNNING
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                                      STOPPED
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {vm.onboot ? (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#238636]/20 border border-[#238636] text-[#7EE787]">
                                      ENABLED
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                                      DISABLED
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {vm.notBackedUp ? (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#F85149]/20 border border-[#F85149] text-[#F85149]" title="pve_not_backed_up_total > 0">
                                      UNBACKED
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#238636]/20 border border-[#238636] text-[#7EE787]">
                                      PROTECTED
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-[#D29922] font-bold">
                                  {vm.status === 'running' ? `${vm.cpuPercent}% (${vm.maxCpu} vCPU)` : '0%'}
                                </td>
                                <td className="px-4 py-2 text-[#E0E0E0]">
                                  {vm.status === 'running'
                                    ? `${formatBytes(vm.memBytes)} / ${formatBytes(vm.maxMemBytes)}`
                                    : formatBytes(vm.maxMemBytes)}
                                </td>
                                <td className="px-4 py-2 text-[#8B949E]">
                                  {formatBytes(vm.maxDiskBytes)}
                                </td>
                                <td className="px-4 py-2 text-[#8B949E]">
                                  {vm.status === 'running' ? formatUptimeSeconds(vm.uptimeSeconds) : '—'}
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-2 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    {/* Power controls */}
                                    {vm.status === 'running' ? (
                                      <>
                                        <button
                                          onClick={() => handlePowerAction(vm.vmid, 'restart', vm.name)}
                                          title="Restart Guest"
                                          className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#D29922] text-[#8B949E] hover:text-[#D29922] transition-colors"
                                        >
                                          <RotateCw className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => handlePowerAction(vm.vmid, 'stop', vm.name)}
                                          title="Shutdown Guest"
                                          className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#F85149] text-[#8B949E] hover:text-[#F85149] transition-colors"
                                        >
                                          <Square className="h-3 w-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => handlePowerAction(vm.vmid, 'start', vm.name)}
                                        title="Power On Guest"
                                        className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#238636] text-[#7EE787] transition-colors"
                                      >
                                        <Play className="h-3 w-3" />
                                      </button>
                                    )}

                                    {/* Edit & Live Migrate */}
                                    <button
                                      onClick={() => {
                                        setSelectedVmForEdit(vm);
                                        setVmModalOpen(true);
                                      }}
                                      title="Edit configuration & Live Migrate"
                                      className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#4F9CF9] text-[#8B949E] hover:text-[#4F9CF9] transition-colors"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>

                                    {/* Delete */}
                                    <button
                                      onClick={() => {
                                        setDeleteTarget({
                                          type: 'vm',
                                          id: vm.vmid,
                                          name: vm.name,
                                        });
                                        setDeleteModalOpen(true);
                                      }}
                                      title="Destroy / Delete Guest"
                                      className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#F85149] text-[#8B949E] hover:text-[#F85149] transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          /* ------------------------------------------------------------------ */
          /* VIEW MODE 2: CONSOLIDATED TABLE                                   */
          /* ------------------------------------------------------------------ */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-[#E0E0E0]">
              <thead className="bg-[#0D1117] text-[#8B949E] uppercase text-[10px] tracking-wider border-b border-[#30363D]">
                <tr>
                  <th className="px-4 py-2.5">VMID</th>
                  <th className="px-4 py-2.5">GUEST NAME</th>
                  <th className="px-4 py-2.5">TYPE</th>
                  <th className="px-4 py-2.5">HOST SERVER (NODE)</th>
                  <th className="px-4 py-2.5">STATUS</th>
                  <th className="px-4 py-2.5">ONBOOT</th>
                  <th className="px-4 py-2.5">BACKUP</th>
                  <th className="px-4 py-2.5">VCPU USAGE</th>
                  <th className="px-4 py-2.5">MEMORY (RAM)</th>
                  <th className="px-4 py-2.5">DISK SIZE</th>
                  <th className="px-4 py-2.5">UPTIME</th>
                  <th className="px-4 py-2.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]/60 font-mono">
                {filteredVms.map((vm) => (
                  <tr key={`${vm.node || 'node'}-${vm.type || 'vm'}-${vm.vmid}`} className="hover:bg-[#0D1117]/60 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-[#D29922]">{vm.vmid}</td>
                    <td className="px-4 py-2.5 font-bold text-white">{vm.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                        {vm.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-[#0D1117] border border-[#30363D] text-[#4F9CF9] font-bold text-[10px]">
                        {vm.node}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {vm.status === 'running' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 text-[9px] font-bold uppercase bg-[#238636] text-white">
                          <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                          RUNNING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 text-[9px] font-bold uppercase bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                          STOPPED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {vm.onboot ? (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#238636]/20 border border-[#238636] text-[#7EE787]">
                          ENABLED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                          DISABLED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {vm.notBackedUp ? (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#F85149]/20 border border-[#F85149] text-[#F85149]" title="pve_not_backed_up_total > 0">
                          UNBACKED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-[#238636]/20 border border-[#238636] text-[#7EE787]">
                          PROTECTED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[#D29922] font-bold">
                      {vm.status === 'running' ? `${vm.cpuPercent}% (${vm.maxCpu} vCPU)` : '0%'}
                    </td>
                    <td className="px-4 py-2.5 text-[#E0E0E0]">
                      {vm.status === 'running' ? `${formatBytes(vm.memBytes)} / ${formatBytes(vm.maxMemBytes)}` : formatBytes(vm.maxMemBytes)}
                    </td>
                    <td className="px-4 py-2.5 text-[#8B949E]">
                      {formatBytes(vm.maxDiskBytes)}
                    </td>
                    <td className="px-4 py-2.5 text-[#8B949E]">
                      {vm.status === 'running' ? formatUptimeSeconds(vm.uptimeSeconds) : '—'}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {vm.status === 'running' ? (
                          <>
                            <button
                              onClick={() => handlePowerAction(vm.vmid, 'restart', vm.name)}
                              title="Restart Guest"
                              className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#D29922] text-[#8B949E] hover:text-[#D29922] transition-colors"
                            >
                              <RotateCw className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handlePowerAction(vm.vmid, 'stop', vm.name)}
                              title="Shutdown Guest"
                              className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#F85149] text-[#8B949E] hover:text-[#F85149] transition-colors"
                            >
                              <Square className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handlePowerAction(vm.vmid, 'start', vm.name)}
                            title="Power On Guest"
                            className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#238636] text-[#7EE787] transition-colors"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedVmForEdit(vm);
                            setVmModalOpen(true);
                          }}
                          title="Edit configuration & Migrate"
                          className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#4F9CF9] text-[#8B949E] hover:text-[#4F9CF9] transition-colors"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => {
                            setDeleteTarget({
                              type: 'vm',
                              id: vm.vmid,
                              name: vm.name,
                            });
                            setDeleteModalOpen(true);
                          }}
                          title="Destroy / Delete Guest"
                          className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#F85149] text-[#8B949E] hover:text-[#F85149] transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <VmModal
        isOpen={vmModalOpen}
        onClose={() => {
          setVmModalOpen(false);
          setSelectedVmForEdit(null);
        }}
        onSave={handleSaveVm}
        initialVm={selectedVmForEdit}
        nodes={nodes}
        allVms={vms}
      />

      <NodeModal
        isOpen={nodeModalOpen}
        onClose={() => {
          setNodeModalOpen(false);
          setSelectedNodeForEdit(null);
        }}
        onSave={handleSaveNode}
        initialNode={selectedNodeForEdit}
      />

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={
          deleteTarget?.type === 'reset'
            ? 'RESET PROXMOX TOPOLOGY'
            : deleteTarget?.type === 'node'
            ? `REMOVE HOST SERVER (${deleteTarget?.name})`
            : `DESTROY GUEST #${deleteTarget?.id} (${deleteTarget?.name})`
        }
        message={
          deleteTarget?.type === 'reset'
            ? 'Are you sure you want to reset the Proxmox cluster inventory back to default 4 hypervisor servers and 24 VMs? Any custom VMs or servers will be overwritten.'
            : deleteTarget?.type === 'node'
            ? `Are you sure you want to remove hypervisor server "${deleteTarget?.name}"? Any active VMs assigned to this server will be evacuated to another available cluster node.`
            : `Are you sure you want to permanently delete and purge guest instance #${deleteTarget?.id} (${deleteTarget?.name})?`
        }
        confirmLabel={deleteTarget?.type === 'reset' ? 'RESTORE DEFAULTS' : 'DELETE & PURGE'}
        isSubmitting={isActionPending}
      />
    </div>
  );
};
