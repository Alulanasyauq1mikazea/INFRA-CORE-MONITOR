import React, { useState } from 'react';
import {
  Activity,
  Search,
  X,
  Copy,
  Check,
  Filter,
  Info,
  Layers,
  Database,
  Server,
  Zap,
} from 'lucide-react';

interface MetricDef {
  metric: string;
  help: string;
  type: string;
  count: number;
}

interface MetricsInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  metricDefinitions?: MetricDef[];
  rawExporterMetrics?: string;
  endpoint: string;
}

const DEFAULT_METRICS_CATALOG: MetricDef[] = [
  { metric: 'pve_up', help: 'Node/VM/CT-Status is online/running (1.0 = UP, 0.0 = DOWN)', type: 'gauge', count: 28 },
  { metric: 'pve_disk_size_bytes', help: 'Storage and Virtual disk total allocated size in bytes', type: 'gauge', count: 28 },
  { metric: 'pve_disk_usage_bytes', help: 'Storage and Virtual disk used bytes capacity', type: 'gauge', count: 28 },
  { metric: 'pve_memory_usage_bytes', help: 'Node and Virtual machine current memory usage in bytes', type: 'gauge', count: 22 },
  { metric: 'pve_memory_size_bytes', help: 'Virtual machine maximum memory capacity allocated in bytes', type: 'gauge', count: 22 },
  { metric: 'pve_cpu_usage_ratio', help: 'Node and guest virtual machine CPU core utilization ratio (0.0 - 1.0)', type: 'gauge', count: 22 },
  { metric: 'pve_ha_state', help: 'Proxmox High Availability service status state code', type: 'gauge', count: 21 },
  { metric: 'pve_onboot_status', help: 'Proxmox guest VM start at host node boot flag (1.0 = enabled)', type: 'gauge', count: 21 },
  { metric: 'pve_not_backed_up_total', help: 'Number of backup runs missed or without snapshot', type: 'gauge', count: 21 },
  { metric: 'pve_guest_info', help: 'Virtual machine guest OS metadata and network binding status', type: 'gauge', count: 21 },
  { metric: 'pve_node_info', help: 'Proxmox hypervisor host release, kernel version and uptime info', type: 'gauge', count: 4 },
  { metric: 'pve_storage_info', help: 'Storage pool shared status, backend plugin and content types', type: 'gauge', count: 6 },
];

export const MetricsInspectorDrawer: React.FC<MetricsInspectorDrawerProps> = ({
  isOpen,
  onClose,
  metricDefinitions,
  rawExporterMetrics,
  endpoint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedMetric, setCopiedMetric] = useState<string | null>(null);

  if (!isOpen) return null;

  const catalog = (metricDefinitions && metricDefinitions.length > 0)
    ? metricDefinitions
    : DEFAULT_METRICS_CATALOG;

  const filteredMetrics = catalog.filter((m) => {
    const matchesSearch =
      m.metric.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.help.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'vm') return m.metric.includes('guest') || m.metric.includes('onboot') || m.help.includes('VM');
    if (selectedCategory === 'node') return m.metric.includes('node');
    if (selectedCategory === 'storage') return m.metric.includes('disk') || m.metric.includes('storage');
    if (selectedCategory === 'ha') return m.metric.includes('ha') || m.metric.includes('backed');
    return true;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMetric(id);
    setTimeout(() => setCopiedMetric(null), 2000);
  };

  return (
    <div className="bg-[#161B22] border-2 border-[#238636] p-4 space-y-3 shadow-2xl animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#0D1117] border border-[#238636] text-[#7EE787]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                LIVE PROMETHEUS METRIC INGESTION INSPECTOR
              </h3>
              <span className="text-[9px] px-1.5 py-0.2 bg-[#238636]/20 border border-[#238636] text-[#7EE787] font-bold">
                {catalog.length} INGESTED METRIC FAMILIES
              </span>
            </div>
            <p className="text-[10px] text-[#8B949E] font-mono">
              TARGET ENDPOINT: {endpoint} • EXPORTER PROTOCOL: PROMETHEUS OPENMETRICS
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 bg-[#0D1117] border border-[#30363D] hover:border-[#F85149] text-[#8B949E] hover:text-[#F85149] transition-colors"
          title="Close Metrics Inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D1117] p-2.5 border border-[#30363D]">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8B949E]" />
          <input
            type="text"
            placeholder="Search metric name (e.g. pve_up, pve_disk_size_bytes)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#161B22] border border-[#30363D] pl-8 pr-3 py-1 text-white font-mono text-[11px] focus:outline-none focus:border-[#58A6FF]"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] text-[#8B949E] uppercase mr-1">CATEGORY:</span>
          {(['all', 'vm', 'node', 'storage', 'ha'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors border ${
                selectedCategory === cat
                  ? 'bg-[#238636] text-white border-[#238636]'
                  : 'bg-[#161B22] text-[#8B949E] border-[#30363D] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
        {filteredMetrics.map((item) => (
          <div
            key={item.metric}
            className="bg-[#0D1117] border border-[#30363D] hover:border-[#58A6FF] p-2.5 space-y-1.5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11px] font-bold text-[#58A6FF] truncate">
                  {item.metric}
                </span>
                <span className="text-[8px] px-1 py-0.2 bg-[#161B22] border border-[#30363D] text-[#D29922] uppercase font-bold">
                  {item.type}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-1 bg-[#161B22] text-[#7EE787] font-mono">
                  {item.count} samples
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(item.metric, item.metric)}
                  className="p-1 text-[#8B949E] hover:text-white"
                  title="Copy Metric Name"
                >
                  {copiedMetric === item.metric ? (
                    <Check className="h-3 w-3 text-[#7EE787]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-[#8B949E] leading-relaxed">
              {item.help}
            </p>

            {/* Quick Sample Preview based on Metric */}
            <div className="bg-[#161B22] px-2 py-1 border border-[#30363D]/60 font-mono text-[9px] text-[#7EE787] truncate">
              {item.metric === 'pve_up'
                ? 'pve_up{id="node/informatika"} 1.0 • pve_up{id="qemu/100"} 1.0 • pve_up{id="storage/informatika/local-lvm"} 1.0'
                : item.metric === 'pve_disk_size_bytes'
                ? 'pve_disk_size_bytes{id="storage/informatika/local-lvm"} 3.0064771072e+12'
                : item.metric === 'pve_cpu_usage_ratio'
                ? 'pve_cpu_usage_ratio{id="qemu/101"} 0.0452 • pve_cpu_usage_ratio{id="node/informatika"} 0.081'
                : `${item.metric}{id="..."} <active_telemetry>`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
