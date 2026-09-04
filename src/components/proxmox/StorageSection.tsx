import React, { useState } from 'react';
import { ProxmoxStorage } from '../../types';
import { HardDrive, Database, Server, Layers, Filter } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

interface StorageSectionProps {
  storages: ProxmoxStorage[];
  selectedStorageFilter?: string;
  onSelectStorageFilter?: (storageId: string) => void;
  selectedNode?: string;
  onSelectNode?: (node: string) => void;
}

export const StorageSection: React.FC<StorageSectionProps> = ({
  storages,
  selectedStorageFilter = 'all',
  onSelectStorageFilter,
  selectedNode = 'all',
  onSelectNode,
}) => {
  // Local view mode: 'grouped' (by host node), 'consolidated' (merged by name), 'flat'
  const [viewMode, setViewMode] = useState<'grouped' | 'consolidated' | 'flat'>('grouped');
  const [localNodeFilter, setLocalNodeFilter] = useState<string>('all');

  // Fallback default storages if telemetry is empty
  const activeStorages: ProxmoxStorage[] =
    storages && storages.length > 0
      ? storages
      : [
          {
            id: 'storage/informatika/local-lvm',
            storage: 'local-lvm',
            node: 'informatika',
            plugintype: 'lvmthin',
            content: 'rootdir,images',
            sizeBytes: 3006477107200, // ~2.73 TB
            usageBytes: 1693245440000, // ~1.54 TB
            shared: false,
            status: 'online',
          },
          {
            id: 'storage/informatika/Hardisk2',
            storage: 'Hardisk2',
            node: 'informatika',
            plugintype: 'dir',
            content: 'images,iso,backup',
            sizeBytes: 2000398934016, // ~1.82 TB
            usageBytes: 1297123987456, // ~1.18 TB
            shared: false,
            status: 'online',
          },
          {
            id: 'storage/informatika/Hardisk3',
            storage: 'Hardisk3',
            node: 'informatika',
            plugintype: 'dir',
            content: 'images,rootdir',
            sizeBytes: 2000398934016, // ~1.82 TB
            usageBytes: 1595014389760, // ~1.45 TB
            shared: false,
            status: 'online',
          },
          {
            id: 'storage/informatika/Hardisk4',
            storage: 'Hardisk4',
            node: 'informatika',
            plugintype: 'dir',
            content: 'backup,vztmpl,iso',
            sizeBytes: 2000398934016, // ~1.82 TB
            usageBytes: 1011494952960, // ~920 GB
            shared: false,
            status: 'online',
          },
          {
            id: 'storage/informatika/local',
            storage: 'local',
            node: 'informatika',
            plugintype: 'dir',
            content: 'vztmpl,iso,backup',
            sizeBytes: 100937891840, // ~94 GB
            usageBytes: 45097156608, // ~42 GB
            shared: false,
            status: 'online',
          },
        ];

  // Distinct nodes list from active storages
  const availableNodes = Array.from(
    new Set(activeStorages.map((s) => s.node || 'informatika'))
  );

  // Active node filter: priority to external selectedNode if not 'all', else localNodeFilter
  const effectiveNodeFilter =
    selectedNode && selectedNode !== 'all' ? selectedNode.toLowerCase() : localNodeFilter;

  // Filter storages by effective node
  const displayedStorages =
    effectiveNodeFilter === 'all'
      ? activeStorages
      : activeStorages.filter(
          (s) => (s.node || 'informatika').toLowerCase() === effectiveNodeFilter.toLowerCase()
        );

  const totalCapacityBytes = displayedStorages.reduce((sum, s) => sum + (s.sizeBytes || 0), 0);
  const totalUsedBytes = displayedStorages.reduce((sum, s) => sum + (s.usageBytes || 0), 0);
  const overallPercent = totalCapacityBytes > 0 ? Math.round((totalUsedBytes / totalCapacityBytes) * 100) : 0;

  // Group storages by node
  const storagesByNode = availableNodes.reduce((acc, nodeName) => {
    const nodeStorages = displayedStorages.filter(
      (s) => (s.node || 'informatika').toLowerCase() === nodeName.toLowerCase()
    );
    if (nodeStorages.length > 0) {
      acc[nodeName] = nodeStorages;
    }
    return acc;
  }, {} as Record<string, ProxmoxStorage[]>);

  // Consolidated storages (merged by storage name across nodes)
  interface ConsolidatedStorage {
    storage: string;
    nodes: { node: string; usageBytes: number; sizeBytes: number }[];
    plugintype: string;
    content: string;
    totalSizeBytes: number;
    totalUsageBytes: number;
    pct: number;
    status: 'online' | 'offline';
  }

  const consolidatedMap = new Map<string, ConsolidatedStorage>();
  displayedStorages.forEach((s) => {
    const key = s.storage;
    const existing = consolidatedMap.get(key);
    const nodeUsage = {
      node: s.node || 'informatika',
      usageBytes: s.usageBytes || 0,
      sizeBytes: s.sizeBytes || 0,
    };

    if (existing) {
      existing.nodes.push(nodeUsage);
      existing.totalSizeBytes += s.sizeBytes || 0;
      existing.totalUsageBytes += s.usageBytes || 0;
      existing.pct =
        existing.totalSizeBytes > 0
          ? Math.min(100, Math.round((existing.totalUsageBytes / existing.totalSizeBytes) * 100))
          : 0;
      if (s.content) {
        const set = new Set([...existing.content.split(','), ...s.content.split(',')]);
        existing.content = Array.from(set).filter(Boolean).join(',');
      }
    } else {
      consolidatedMap.set(key, {
        storage: s.storage,
        nodes: [nodeUsage],
        plugintype: s.plugintype || 'dir',
        content: s.content || '',
        totalSizeBytes: s.sizeBytes || 0,
        totalUsageBytes: s.usageBytes || 0,
        pct:
          (s.sizeBytes || 0) > 0
            ? Math.min(100, Math.round(((s.usageBytes || 0) / (s.sizeBytes || 1)) * 100))
            : 0,
        status: s.status || 'online',
      });
    }
  });

  const consolidatedList = Array.from(consolidatedMap.values());

  const handleCardClick = (uniqueId: string) => {
    if (!onSelectStorageFilter) return;
    if (selectedStorageFilter === uniqueId) {
      onSelectStorageFilter('all');
    } else {
      onSelectStorageFilter(uniqueId);
    }
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-4">
      {/* Header with Title and Mode Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#0D1117] border border-[#30363D] text-[#58A6FF]">
            <HardDrive className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              PROXMOX CLUSTER STORAGE POOLS ({displayedStorages.length} POOLS
              {effectiveNodeFilter !== 'all' ? ` ON ${effectiveNodeFilter.toUpperCase()}` : ''})
            </h3>
            <p className="text-[10px] text-[#8B949E]">
              TOTAL CAPACITY: {formatBytes(totalUsedBytes)} USED / {formatBytes(totalCapacityBytes)} TOTAL ({overallPercent}% ALLOCATED)
            </p>
          </div>
        </div>

        {/* View Mode & Node Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Node Filter Pills */}
          <div className="flex items-center gap-1 bg-[#0D1117] p-1 border border-[#30363D] text-[10px]">
            <span className="text-[#8B949E] font-bold px-1 flex items-center gap-1">
              <Server className="h-3 w-3" /> NODE:
            </span>
            <button
              onClick={() => {
                setLocalNodeFilter('all');
                onSelectNode?.('all');
              }}
              className={`px-2 py-0.5 uppercase font-bold transition-colors ${
                effectiveNodeFilter === 'all'
                  ? 'bg-[#161B22] text-[#58A6FF] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-white'
              }`}
            >
              ALL ({activeStorages.length})
            </button>
            {availableNodes.map((n) => {
              const count = activeStorages.filter(
                (s) => (s.node || 'informatika').toLowerCase() === n.toLowerCase()
              ).length;
              return (
                <button
                  key={n}
                  onClick={() => {
                    setLocalNodeFilter(n);
                    onSelectNode?.(n);
                  }}
                  className={`px-2 py-0.5 uppercase font-bold transition-colors ${
                    effectiveNodeFilter === n.toLowerCase()
                      ? 'bg-[#161B22] text-[#7EE787] border border-[#30363D]'
                      : 'text-[#8B949E] hover:text-white'
                  }`}
                >
                  {n} ({count})
                </button>
              );
            })}
          </div>

          {/* Display Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#0D1117] p-1 border border-[#30363D] text-[10px]">
            <button
              onClick={() => setViewMode('grouped')}
              title="Kelompokkan pool storage per Host Server agar tidak membingungkan"
              className={`px-2 py-0.5 uppercase font-bold transition-colors flex items-center gap-1 ${
                viewMode === 'grouped'
                  ? 'bg-[#161B22] text-[#D29922] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-white'
              }`}
            >
              <Server className="h-3 w-3" />
              PER SERVER
            </button>
            <button
              onClick={() => setViewMode('consolidated')}
              title="Gabungkan storage dengan nama yang sama (local, local-lvm) ke dalam 1 kartu agregat"
              className={`px-2 py-0.5 uppercase font-bold transition-colors flex items-center gap-1 ${
                viewMode === 'consolidated'
                  ? 'bg-[#161B22] text-[#58A6FF] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-white'
              }`}
            >
              <Layers className="h-3 w-3" />
              KONSOLIDASI
            </button>
            <button
              onClick={() => setViewMode('flat')}
              title="Tampilkan semua storage dalam satu grid datar"
              className={`px-2 py-0.5 uppercase font-bold transition-colors ${
                viewMode === 'flat'
                  ? 'bg-[#161B22] text-[#7EE787] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-white'
              }`}
            >
              GRID LENGKAP
            </button>
          </div>
        </div>
      </div>

      {/* Selected Storage Filter Alert Bar */}
      {selectedStorageFilter !== 'all' && (
        <div className="flex items-center justify-between bg-[#1F6FEB]/10 border border-[#1F6FEB]/40 px-3 py-1.5 text-xs text-[#58A6FF]">
          <span className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            FILTER AKTIF: <strong>{selectedStorageFilter}</strong>
          </span>
          <button
            onClick={() => onSelectStorageFilter?.('all')}
            className="text-[10px] text-[#8B949E] hover:text-white underline cursor-pointer"
          >
            HAPUS FILTER
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW MODE 1: GROUPED BY SERVER NODE (Rekomendasi Utama)       */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {Object.entries(storagesByNode).map(([nodeName, nodePools]) => {
            const nodeUsed = nodePools.reduce((sum, s) => sum + (s.usageBytes || 0), 0);
            const nodeTotal = nodePools.reduce((sum, s) => sum + (s.sizeBytes || 0), 0);
            const nodePct = nodeTotal > 0 ? Math.round((nodeUsed / nodeTotal) * 100) : 0;

            return (
              <div key={nodeName} className="bg-[#0D1117] border border-[#30363D] p-3 space-y-2.5">
                {/* Node Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D]/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#7EE787]" />
                    <span className="font-mono font-bold text-xs uppercase text-white tracking-wider">
                      HOST SERVER: <span className="text-[#D29922]">{nodeName}</span>
                    </span>
                    <span className="text-[10px] bg-[#161B22] border border-[#30363D] px-1.5 py-0.2 text-[#8B949E]">
                      {nodePools.length} STORAGE POOLS
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[#8B949E]">
                    KAPASITAS SERVER: <strong className="text-white">{formatBytes(nodeUsed)}</strong> / {formatBytes(nodeTotal)} ({nodePct}%)
                  </div>
                </div>

                {/* Storage Cards for this Node */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {nodePools.map((st, idx) => {
                    const used = st.usageBytes || 0;
                    const total = st.sizeBytes || 1;
                    const pct = Math.min(100, Math.round((used / total) * 100));
                    const free = Math.max(0, total - used);
                    const uniqueKey = st.id || `${st.node || nodeName}/${st.storage}`;
                    const isSelected = selectedStorageFilter === uniqueKey;

                    const barColor =
                      pct >= 90 ? 'bg-[#F85149]' : pct >= 75 ? 'bg-[#D29922]' : 'bg-[#58A6FF]';

                    return (
                      <div
                        key={uniqueKey}
                        onClick={() => handleCardClick(uniqueKey)}
                        className={`bg-[#161B22] border p-3 space-y-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#58A6FF] bg-[#1F6FEB]/10 ring-1 ring-[#58A6FF]'
                            : 'border-[#30363D] hover:border-[#8B949E]'
                        }`}
                      >
                        {/* Storage Name & Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Database className="h-3.5 w-3.5 text-[#58A6FF] flex-shrink-0" />
                            <span className="font-bold text-white text-xs font-mono truncate" title={st.storage}>
                              {st.storage}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.2 bg-[#238636]/20 border border-[#238636] text-[#7EE787]">
                            ONLINE
                          </span>
                        </div>

                        {/* Node & Type */}
                        <div className="flex items-center justify-between text-[9px] text-[#8B949E]">
                          <span>SERVER: <strong className="text-[#D29922]">{st.node || nodeName}</strong></span>
                          <span className="px-1 bg-[#0D1117] border border-[#30363D] text-[#D29922] uppercase font-bold">
                            {st.plugintype}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-[#8B949E]">USAGE:</span>
                            <span className="font-bold text-white">{pct}%</span>
                          </div>
                          <div className="w-full bg-[#0D1117] h-1.5 border border-[#30363D]/60">
                            <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Capacity Numbers */}
                        <div className="flex items-center justify-between text-[10px] pt-0.5">
                          <div>
                            <span className="text-[9px] text-[#8B949E] block">USED</span>
                            <span className="font-bold text-[#E0E0E0]">{formatBytes(used)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-[#8B949E] block">FREE</span>
                            <span className="font-bold text-[#7EE787]">{formatBytes(free)}</span>
                          </div>
                        </div>

                        {/* Content Tags */}
                        <div className="pt-1 border-t border-[#30363D]/60 flex flex-wrap gap-1">
                          {(st.content || 'images').split(',').map((c, cIdx) => (
                            <span
                              key={`${uniqueKey}-${c.trim()}-${cIdx}`}
                              className="text-[8px] px-1 py-0.2 bg-[#0D1117] border border-[#30363D] text-[#8B949E]"
                            >
                              {c.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW MODE 2: CONSOLIDATED (Menggabungkan local & local-lvm)    */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'consolidated' && (
        <div className="space-y-3">
          <div className="text-[10px] text-[#8B949E] bg-[#0D1117] p-2 border border-[#30363D] flex items-center justify-between">
            <span>
              ℹ️ Storage dengan nama yang sama (seperti <code>local</code> dan <code>local-lvm</code>) digabung menjadi 1 kartu cluster dengan rincian per server.
            </span>
            <span className="text-white font-bold">{consolidatedList.length} UNIQUE POOLS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {consolidatedList.map((cs) => {
              const free = Math.max(0, cs.totalSizeBytes - cs.totalUsageBytes);
              const isSelected = selectedStorageFilter === cs.storage;
              const barColor =
                cs.pct >= 90 ? 'bg-[#F85149]' : cs.pct >= 75 ? 'bg-[#D29922]' : 'bg-[#58A6FF]';

              return (
                <div
                  key={cs.storage}
                  onClick={() => handleCardClick(cs.storage)}
                  className={`bg-[#0D1117] border p-3 space-y-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#58A6FF] bg-[#1F6FEB]/10 ring-1 ring-[#58A6FF]'
                      : 'border-[#30363D] hover:border-[#8B949E]'
                  }`}
                >
                  {/* Storage Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Database className="h-3.5 w-3.5 text-[#58A6FF] flex-shrink-0" />
                      <span className="font-bold text-white text-xs font-mono truncate" title={cs.storage}>
                        {cs.storage}
                      </span>
                    </div>
                    <span className="px-1 bg-[#161B22] border border-[#30363D] text-[#D29922] text-[9px] uppercase font-bold">
                      {cs.plugintype}
                    </span>
                  </div>

                  {/* Multi-Node Badges */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#8B949E] block">
                      SERVER INSTANCE ({cs.nodes.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {cs.nodes.map((n) => (
                        <span
                          key={n.node}
                          className="text-[8px] px-1.5 py-0.5 bg-[#161B22] border border-[#30363D] text-[#E0E0E0] font-mono"
                          title={`${n.node}: ${formatBytes(n.usageBytes)} / ${formatBytes(n.sizeBytes)}`}
                        >
                          <strong className="text-[#D29922]">{n.node}</strong>: {formatBytes(n.usageBytes)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-[#8B949E]">TOTAL USAGE:</span>
                      <span className="font-bold text-white">{cs.pct}%</span>
                    </div>
                    <div className="w-full bg-[#161B22] h-1.5 border border-[#30363D]/60">
                      <div className={`h-full ${barColor}`} style={{ width: `${cs.pct}%` }} />
                    </div>
                  </div>

                  {/* Capacity Numbers */}
                  <div className="flex items-center justify-between text-[10px] pt-0.5">
                    <div>
                      <span className="text-[9px] text-[#8B949E] block">TOTAL USED</span>
                      <span className="font-bold text-[#E0E0E0]">{formatBytes(cs.totalUsageBytes)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#8B949E] block">TOTAL FREE</span>
                      <span className="font-bold text-[#7EE787]">{formatBytes(free)}</span>
                    </div>
                  </div>

                  {/* Content Tags */}
                  <div className="pt-1 border-t border-[#30363D]/60 flex flex-wrap gap-1">
                    {(cs.content || 'images').split(',').map((c, cIdx) => (
                      <span
                        key={`${cs.storage}-${c.trim()}-${cIdx}`}
                        className="text-[8px] px-1 py-0.2 bg-[#161B22] border border-[#30363D] text-[#8B949E]"
                      >
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW MODE 3: FLAT GRID WITH CLEAR SERVER LABELS              */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'flat' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {displayedStorages.map((st, idx) => {
            const used = st.usageBytes || 0;
            const total = st.sizeBytes || 1;
            const pct = Math.min(100, Math.round((used / total) * 100));
            const free = Math.max(0, total - used);
            const uniqueKey = st.id || `${st.node || 'node'}/${st.storage}`;
            const isSelected = selectedStorageFilter === uniqueKey;

            const barColor =
              pct >= 90 ? 'bg-[#F85149]' : pct >= 75 ? 'bg-[#D29922]' : 'bg-[#58A6FF]';

            return (
              <div
                key={uniqueKey}
                onClick={() => handleCardClick(uniqueKey)}
                className={`bg-[#0D1117] border p-3 space-y-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#58A6FF] bg-[#1F6FEB]/10 ring-1 ring-[#58A6FF]'
                    : 'border-[#30363D] hover:border-[#8B949E]'
                }`}
              >
                {/* Storage Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Database className="h-3.5 w-3.5 text-[#58A6FF] flex-shrink-0" />
                    <span className="font-bold text-white text-xs font-mono truncate" title={st.storage}>
                      {st.storage}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.2 bg-[#238636]/20 border border-[#238636] text-[#7EE787]">
                    ONLINE
                  </span>
                </div>

                {/* Node & Type */}
                <div className="flex items-center justify-between text-[9px] text-[#8B949E]">
                  <span>SERVER: <strong className="text-[#D29922]">{st.node || 'informatika'}</strong></span>
                  <span className="px-1 bg-[#161B22] border border-[#30363D] text-[#D29922] uppercase font-bold">
                    {st.plugintype}
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-[#8B949E]">USAGE:</span>
                    <span className="font-bold text-white">{pct}%</span>
                  </div>
                  <div className="w-full bg-[#161B22] h-1.5 border border-[#30363D]/60">
                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Capacity Numbers */}
                <div className="flex items-center justify-between text-[10px] pt-0.5">
                  <div>
                    <span className="text-[9px] text-[#8B949E] block">USED</span>
                    <span className="font-bold text-[#E0E0E0]">{formatBytes(used)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#8B949E] block">FREE</span>
                    <span className="font-bold text-[#7EE787]">{formatBytes(free)}</span>
                  </div>
                </div>

                {/* Content Tags */}
                <div className="pt-1 border-t border-[#30363D]/60 flex flex-wrap gap-1">
                  {(st.content || 'images').split(',').map((c, cIdx) => (
                    <span
                      key={`${uniqueKey}-${c.trim()}-${cIdx}`}
                      className="text-[8px] px-1 py-0.2 bg-[#161B22] border border-[#30363D] text-[#8B949E]"
                    >
                      {c.trim()}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

