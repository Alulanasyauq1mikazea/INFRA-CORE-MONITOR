import React, { useState, useEffect } from 'react';
import { ProxmoxNode } from '../../types';
import { X, Server, Cpu, Layers, HardDrive } from 'lucide-react';

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeData: any) => Promise<void>;
  initialNode?: ProxmoxNode | null;
}

export const NodeModal: React.FC<NodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNode,
}) => {
  const isEditing = !!initialNode;

  const [name, setName] = useState<string>('');
  const [hardwareSpec, setHardwareSpec] = useState<string>('');
  const [cpuCores, setCpuCores] = useState<number>(32);
  const [maxMemGb, setMaxMemGb] = useState<number>(128);
  const [maxDiskGb, setMaxDiskGb] = useState<number>(4000);
  const [status, setStatus] = useState<'online' | 'offline'>('online');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to separate base name and spec
  const parseNodeName = (full: string) => {
    const match = full.match(/^([^(]+)(?:\s*\(([^)]+)\))?$/);
    if (match) {
      return {
        baseName: match[1].trim(),
        spec: match[2]?.trim() || '',
      };
    }
    return { baseName: full, spec: '' };
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialNode) {
        const { baseName, spec } = parseNodeName(initialNode.name);
        setName(baseName);
        setHardwareSpec(spec);
        setCpuCores(initialNode.cpuCores || 32);
        setMaxMemGb(Math.round((initialNode.maxMemBytes || 128 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024)));
        setMaxDiskGb(Math.round((initialNode.maxDiskBytes || 4000 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024)));
        setStatus(initialNode.status || 'online');
      } else {
        setName('pve-node-05');
        setHardwareSpec('AMD EPYC 7742 64C/128T');
        setCpuCores(64);
        setMaxMemGb(256);
        setMaxDiskGb(8000);
        setStatus('online');
      }
    }
  }, [isOpen, initialNode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Server node name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        hardwareSpec: hardwareSpec.trim(),
        cpuCores: Number(cpuCores),
        maxMemGb: Number(maxMemGb),
        maxDiskGb: Number(maxDiskGb),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save hypervisor node');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono animate-in fade-in duration-150">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#161B22] text-[#4F9CF9] border border-[#30363D]">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {isEditing ? `CONFIG HYPERVISOR SERVER (${name})` : 'ADD NEW HYPERVISOR HOST SERVER'}
              </h3>
              <p className="text-[10px] text-[#8B949E]">
                {isEditing ? 'UPDATE HOST SPECIFICATIONS AND CLUSTER STATUS' : 'EXPAND CLUSTER COMPUTE AND STORAGE CAPACITY'}
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

          {/* Node Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] text-[#8B949E] uppercase font-bold mb-1">
                SERVER NODE NAME
              </label>
              <input
                type="text"
                disabled={isEditing}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. pve-node-05"
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white disabled:opacity-60 focus:border-[#4F9CF9] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8B949E] uppercase font-bold mb-1">
                NODE STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white outline-none"
              >
                <option value="online">ONLINE</option>
                <option value="offline">OFFLINE / MAINT</option>
              </select>
            </div>
          </div>

          {/* Hardware CPU Specification */}
          <div>
            <label className="block text-[10px] text-[#8B949E] uppercase font-bold mb-1">
              CPU PROCESSOR MODEL / SPECIFICATION
            </label>
            <input
              type="text"
              value={hardwareSpec}
              onChange={(e) => setHardwareSpec(e.target.value)}
              placeholder="e.g. AMD EPYC 7742 64C/128T or Intel Xeon Gold 6330"
              className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-white focus:border-[#4F9CF9] outline-none"
            />
          </div>

          {/* Compute & Storage Capacity */}
          <div className="p-3 bg-[#0D1117] border border-[#30363D] space-y-3">
            <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block border-b border-[#30363D]/60 pb-1">
              HYPERVISOR CAPACITY & POOLS
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* CPU Cores */}
              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase mb-1 flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-[#D29922]" /> PHYSICAL CORES
                </label>
                <input
                  type="number"
                  min={4}
                  max={256}
                  value={cpuCores}
                  onChange={(e) => setCpuCores(Number(e.target.value))}
                  className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-white outline-none"
                  required
                />
              </div>

              {/* Total RAM */}
              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase mb-1 flex items-center gap-1">
                  <Layers className="h-3 w-3 text-[#4F9CF9]" /> TOTAL RAM (GB)
                </label>
                <input
                  type="number"
                  min={16}
                  step={16}
                  value={maxMemGb}
                  onChange={(e) => setMaxMemGb(Number(e.target.value))}
                  className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-white outline-none"
                  required
                />
                <span className="text-[9px] text-[#8B949E] mt-0.5 block">
                  {maxMemGb} GB DDR4/DDR5 ECC
                </span>
              </div>

              {/* Total Disk */}
              <div>
                <label className="block text-[10px] text-[#8B949E] uppercase mb-1 flex items-center gap-1">
                  <HardDrive className="h-3 w-3 text-[#7EE787]" /> STORAGE (GB)
                </label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  value={maxDiskGb}
                  onChange={(e) => setMaxDiskGb(Number(e.target.value))}
                  className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-white outline-none"
                  required
                />
                <span className="text-[9px] text-[#8B949E] mt-0.5 block">
                  {(maxDiskGb / 1000).toFixed(1)} TB ZFS/Ceph
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
              className="px-5 py-2 bg-[#1F6FEB] hover:bg-[#388bfd] text-white uppercase font-bold text-[11px] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>SAVING...</span>
              ) : isEditing ? (
                'UPDATE SERVER CONFIG'
              ) : (
                'ADD SERVER TO CLUSTER'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
