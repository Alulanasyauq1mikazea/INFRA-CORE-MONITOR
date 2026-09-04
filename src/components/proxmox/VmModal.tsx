import React, { useState, useEffect } from 'react';
import { ProxmoxVm, ProxmoxNode } from '../../types';
import { X, Cpu, Layers, HardDrive, Server, Shield, Play, Square, ArrowRightLeft } from 'lucide-react';

interface VmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vmData: any) => Promise<void>;
  initialVm?: ProxmoxVm | null;
  nodes: ProxmoxNode[];
  allVms: ProxmoxVm[];
}

export const VmModal: React.FC<VmModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVm,
  nodes,
  allVms,
}) => {
  const isEditing = !!initialVm;

  // Extract clean node key (e.g. 'pve-node-01')
  const cleanNodeKey = (nodeName: string) => {
    const match = nodeName.match(/(pve-node-\d+|[a-zA-Z0-9_-]+)/);
    return match ? match[1] : nodeName;
  };

  const getNextAvailableVmid = () => {
    const ids = allVms.map((v) => Number(v.vmid)).filter((id) => !isNaN(id));
    return ids.length > 0 ? Math.max(...ids) + 1 : 101;
  };

  const [vmid, setVmid] = useState<number>(101);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'qemu' | 'lxc'>('qemu');
  const [node, setNode] = useState<string>('');
  const [cpuCores, setCpuCores] = useState<number>(4);
  const [ramMb, setRamMb] = useState<number>(4096);
  const [diskGb, setDiskGb] = useState<number>(50);
  const [status, setStatus] = useState<'running' | 'stopped'>('running');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialVm) {
        setVmid(initialVm.vmid);
        setName(initialVm.name);
        setType(initialVm.type);
        setNode(cleanNodeKey(initialVm.node));
        setCpuCores(initialVm.maxCpu || 2);
        setRamMb(Math.round((initialVm.maxMemBytes || 4 * 1024 * 1024 * 1024) / (1024 * 1024)));
        setDiskGb(Math.round((initialVm.maxDiskBytes || 50 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024)));
        setStatus(initialVm.status === 'stopped' ? 'stopped' : 'running');
      } else {
        setVmid(getNextAvailableVmid());
        setName(`srv-app-${getNextAvailableVmid()}`);
        setType('qemu');
        setNode(nodes.length > 0 ? cleanNodeKey(nodes[0].name) : 'pve-node-01');
        setCpuCores(4);
        setRamMb(4096);
        setDiskGb(50);
        setStatus('running');
      }
    }
  }, [isOpen, initialVm, nodes]);

  if (!isOpen) return null;

  const isMigrating = isEditing && initialVm && cleanNodeKey(initialVm.node) !== node;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Guest instance name is required');
      return;
    }
    if (!node) {
      setError('Target host server is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        vmid: Number(vmid),
        name: name.trim(),
        type,
        node,
        cpuCores: Number(cpuCores),
        ramMb: Number(ramMb),
        diskGb: Number(diskGb),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save VM configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono animate-in fade-in duration-150">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#161B22] text-[#D29922] border border-[#30363D]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {isEditing ? `CONFIG / MIGRATE VM #${vmid} (${name})` : 'DEPLOY NEW VIRTUAL MACHINE / LXC'}
              </h3>
              <p className="text-[10px] text-[#8B949E]">
                {isEditing ? 'MODIFY VCPU, MEMORY, STORAGE ALLOCATION OR LIVE-MIGRATE' : 'PROVISION A NEW GUEST INSTANCE IN THE PROXMOX VE CLUSTER'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8B949E] hover:text-white hover:bg-[#30363D] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-[#F85149]/10 border border-[#F85149] text-[#F85149] text-[11px] font-bold">
              ERROR: {error}
            </div>
          )}

          {isMigrating && (
            <div className="p-3 bg-[#1F6FEB]/10 border border-[#1F6FEB] text-[#4F9CF9] text-[11px] flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 shrink-0 text-[#4F9CF9]" />
              <span>
                <strong>LIVE MIGRATION DETECTED:</strong> This guest will be migrated from <strong>{initialVm?.node}</strong> to target hypervisor <strong>{node}</strong>.
              </span>
            </div>
          )}

          {/* VMID & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-[#8B949E] uppercase font-bold mb-1">
                VMID (IDENTIFIER)
              </label>
              <input
                type="number"
                disabled={isEditing}
                value={vmid}
                onChange={(e) => setVmid(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white disabled:opacity-60 disabled:cursor-not-allowed focus:border-[#D29922] outline-none"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] text-[#8B949E] uppercase font-bold mb-1">
                GUEST NAME / HOSTNAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. srv-k8s-worker04"
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white focus:border-[#D29922] outline-none"
                required
              />
            </div>
          </div>

          {/* Guest Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#8B949E] uppercase font-bold mb-1">
                VIRTUALIZATION TYPE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('qemu')}
                  className={`py-1.5 px-3 border text-[11px] font-bold uppercase transition-colors ${
                    type === 'qemu'
                      ? 'bg-[#1F6FEB] text-white border-[#1F6FEB]'
                      : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
                  }`}
                >
                  QEMU (KVM VM)
                </button>
                <button
                  type="button"
                  onClick={() => setType('lxc')}
                  className={`py-1.5 px-3 border text-[11px] font-bold uppercase transition-colors ${
                    type === 'lxc'
                      ? 'bg-[#238636] text-white border-[#238636]'
                      : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
                  }`}
                >
                  LXC CONTAINER
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#8B949E] uppercase font-bold mb-1">
                POWER STATE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('running')}
                  className={`py-1.5 px-3 border text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 transition-colors ${
                    status === 'running'
                      ? 'bg-[#238636] text-white border-[#238636]'
                      : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
                  }`}
                >
                  <Play className="h-3 w-3" /> RUNNING
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('stopped')}
                  className={`py-1.5 px-3 border text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 transition-colors ${
                    status === 'stopped'
                      ? 'bg-[#30363D] text-white border-[#8B949E]'
                      : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
                  }`}
                >
                  <Square className="h-3 w-3" /> STOPPED
                </button>
              </div>
            </div>
          </div>

          {/* Target Host Server Node */}
          <div>
            <label className="block text-[10px] text-[#8B949E] uppercase font-bold mb-1">
              TARGET HOST SERVER (HYPERVISOR NODE)
            </label>
            <select
              value={node}
              onChange={(e) => setNode(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-white focus:border-[#D29922] outline-none"
            >
              {nodes.map((n) => {
                const key = cleanNodeKey(n.name);
                return (
                  <option key={n.name} value={key}>
                    {key} — {n.name} ({n.cpuCores} Cores, {(n.maxMemBytes / 1e9).toFixed(0)}GB RAM)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Resource Allocation: CPU, RAM, Disk */}
          <div className="p-3 bg-[#0D1117] border border-[#30363D] space-y-3">
            <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block border-b border-[#30363D]/60 pb-1">
              HARDWARE RESOURCE ALLOCATION
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* vCPU */}
              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase mb-1 flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-[#D29922]" /> VCPU CORES
                </label>
                <select
                  value={cpuCores}
                  onChange={(e) => setCpuCores(Number(e.target.value))}
                  className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-white outline-none"
                >
                  <option value={1}>1 Core</option>
                  <option value={2}>2 Cores</option>
                  <option value={4}>4 Cores</option>
                  <option value={8}>8 Cores</option>
                  <option value={16}>16 Cores</option>
                  <option value={32}>32 Cores</option>
                </select>
              </div>

              {/* RAM */}
              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase mb-1 flex items-center gap-1">
                  <Layers className="h-3 w-3 text-[#4F9CF9]" /> MEMORY (RAM MB)
                </label>
                <input
                  type="number"
                  min={512}
                  step={512}
                  value={ramMb}
                  onChange={(e) => setRamMb(Number(e.target.value))}
                  className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-white outline-none"
                />
                <span className="text-[9px] text-[#8B949E] mt-0.5 block">
                  {(ramMb / 1024).toFixed(1)} GB RAM
                </span>
              </div>

              {/* Disk */}
              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase mb-1 flex items-center gap-1">
                  <HardDrive className="h-3 w-3 text-[#7EE787]" /> DISK SIZE (GB)
                </label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={diskGb}
                  onChange={(e) => setDiskGb(Number(e.target.value))}
                  className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-white outline-none"
                />
                <span className="text-[9px] text-[#8B949E] mt-0.5 block">
                  {diskGb} GB Virtual Disk
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-[#30363D] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#0D1117] border border-[#30363D] text-[#8B949E] hover:text-white uppercase font-bold text-[11px] transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#238636] hover:bg-[#2ea043] text-white uppercase font-bold text-[11px] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>SAVING...</span>
              ) : isMigrating ? (
                <>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  MIGRATE & SAVE
                </>
              ) : isEditing ? (
                'UPDATE GUEST CONFIG'
              ) : (
                'PROVISION GUEST INSTANCE'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
