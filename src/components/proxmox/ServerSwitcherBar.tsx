import React from 'react';
import { CustomDataSource } from '../../types';
import {
  Server,
  Activity,
  SlidersHorizontal,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
} from 'lucide-react';

interface ServerSwitcherBarProps {
  currentEndpoint: string;
  dataSources: CustomDataSource[];
  onSelectDataSource: (ds: CustomDataSource) => void;
  onNavigateConfig?: () => void;
  activeMetricsCount: number;
  onToggleMetricsDrawer: () => void;
  isMetricsDrawerOpen: boolean;
  isLive: boolean;
  lastLatencyMs?: number;
}

export const ServerSwitcherBar: React.FC<ServerSwitcherBarProps> = ({
  currentEndpoint,
  dataSources,
  onSelectDataSource,
  onNavigateConfig,
  activeMetricsCount,
  onToggleMetricsDrawer,
  isMetricsDrawerOpen,
  isLive,
  lastLatencyMs,
}) => {
  const proxmoxSources = dataSources.filter(
    (ds) => ds.type === 'proxmox' || ds.targetDashboard === 'proxmox'
  );

  // Determine active data source
  const currentSource = proxmoxSources.find(
    (ds) => ds.endpoint === currentEndpoint || currentEndpoint.includes(ds.instanceIp || '')
  ) || proxmoxSources[0];

  return (
    <div className="bg-[#161B22] border border-[#30363D] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left: Server Switcher dropdown and current active IP */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0D1117] border border-[#30363D] text-[#7EE787]">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider">
                CONNECTED SERVER SOURCE:
              </span>
              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 bg-[#238636]/20 border border-[#238636] text-[#7EE787] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7EE787] animate-pulse" />
                {isLive ? 'REAL-TIME' : 'POLLING'}
                {lastLatencyMs ? ` • ${lastLatencyMs}ms` : ''}
              </span>
            </div>

            {/* Quick Switch Dropdown */}
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={currentSource?.id || ''}
                onChange={(e) => {
                  const target = proxmoxSources.find((s) => s.id === e.target.value);
                  if (target) onSelectDataSource(target);
                }}
                className="bg-[#0D1117] border border-[#30363D] hover:border-[#58A6FF] text-white font-bold text-[11px] px-2.5 py-1 focus:outline-none focus:border-[#58A6FF] cursor-pointer"
              >
                {proxmoxSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.instanceIp || ds.endpoint.replace(/https?:\/\//, '').split('/')[0]})
                  </option>
                ))}
                {proxmoxSources.length === 0 && (
                  <option value="">Default Proxmox VE (192.168.14.2)</option>
                )}
              </select>

              <span className="text-[10px] font-mono text-[#58A6FF] hidden sm:inline-block">
                {currentSource?.endpoint || currentEndpoint}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Metrics Ingestion Badge & Connect New Server Shortcut */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Active Metrics Toggle Drawer Button */}
        <button
          type="button"
          onClick={onToggleMetricsDrawer}
          className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 border ${
            isMetricsDrawerOpen
              ? 'bg-[#238636] text-white border-[#238636]'
              : 'bg-[#0D1117] hover:bg-[#21262D] text-[#7EE787] border-[#30363D] hover:border-[#238636]'
          }`}
          title="Toggle live Prometheus exporter metrics list"
        >
          <Activity className="h-3.5 w-3.5 text-[#7EE787]" />
          <span>{activeMetricsCount} METRICS ACTIVE</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isMetricsDrawerOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Connect New Server (Jump to Config & Topologi) */}
        {onNavigateConfig && (
          <button
            type="button"
            onClick={onNavigateConfig}
            className="px-2.5 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] hover:text-white border border-[#30363D] hover:border-[#58A6FF] text-[11px] font-bold uppercase transition-all flex items-center gap-1.5"
            title="Kelola Data Source & Topologi (CRUD Server Baru)"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>+ CONFIG & TOPOLOGI</span>
            <ExternalLink className="h-2.5 w-2.5 text-[#8B949E]" />
          </button>
        )}
      </div>
    </div>
  );
};
