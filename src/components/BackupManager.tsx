import React, { useState } from 'react';
import {
  Database,
  Download,
  Play,
  Calendar,
  CheckCircle2,
  Clock,
  HardDrive,
  FileText,
  Lock,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { BackupSnapshot } from '../types';

interface BackupManagerProps {
  backups: BackupSnapshot[];
  onTriggerBackup: (title: string, targetType: BackupSnapshot['targetType']) => void;
  userRole?: string;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ backups, onTriggerBackup, userRole = 'Super Admin' }) => {
  const [backupTitle, setBackupTitle] = useState('');
  const [targetType, setTargetType] = useState<BackupSnapshot['targetType']>('Full System Bundle');
  const [isGenerating, setIsGenerating] = useState(false);

  const isReadOnly = userRole === 'Viewer';

  const handleCreateBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsGenerating(true);
    setTimeout(() => {
      onTriggerBackup(backupTitle || 'Manual OmniGuard-Live System Snapshot', targetType);
      setBackupTitle('');
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Automated Daily Backup System</h2>
            <p className="text-xs text-slate-400">Scheduled backup snapshots for MikroTik RouterOS (.rsc), InfluxDB metrics & Ubuntu/Nginx configs</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Schedule: Active (02:00 AM)</span>
          </span>
        </div>
      </div>

      {/* Manual Backup Trigger Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Trigger Instant On-Demand Backup Snapshot</span>
        </h3>

        <form onSubmit={handleCreateBackup} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <input
            type="text"
            placeholder="Backup Title / Note (e.g., Pre-maintenance snapshot)"
            value={backupTitle}
            onChange={(e) => setBackupTitle(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          />

          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as BackupSnapshot['targetType'])}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="Full System Bundle">Full System Bundle (MikroTik + Ubuntu + InfluxDB)</option>
            <option value="MikroTik RSC">MikroTik RouterOS Script Export (.rsc)</option>
            <option value="Ubuntu Config">Ubuntu 24.04 Server & Nginx Configs</option>
            <option value="InfluxDB Dump">InfluxDB 2.7 Metric & Audit Log Dump</option>
            <option value="Nginx WAF Rules">Nginx ModSecurity WAF Core Rules</option>
          </select>

          <button
            type="submit"
            disabled={isGenerating || isReadOnly}
            className={`font-medium py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              isReadOnly
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30'
            }`}
            title={isReadOnly ? 'Fitur ini membutuhkan hak akses Super Admin' : 'Buat Backup Instant'}
          >
            <Play className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>
              {isReadOnly
                ? '🔒 Read-Only Mode (Viewer Role)'
                : isGenerating
                ? 'Compressing Archive...'
                : 'Generate Backup Snapshot'}
            </span>
          </button>
        </form>
      </div>

      {/* Backup Snapshots History Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2 pb-2 border-b border-slate-800">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Stored Backup Snapshots Archive</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/60">
                <th className="p-3">Backup Title</th>
                <th className="p-3">Target Scope</th>
                <th className="p-3">Size</th>
                <th className="p-3">Created At</th>
                <th className="p-3">Checksum</th>
                <th className="p-3">Status</th>
                <th className="p-3">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {backups.map((bk) => (
                <tr key={bk.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-semibold text-slate-200">{bk.title}</td>
                  <td className="p-3 text-cyan-400">{bk.targetType}</td>
                  <td className="p-3 text-slate-300">{bk.sizeFormatted}</td>
                  <td className="p-3 text-slate-400">{bk.createdAt}</td>
                  <td className="p-3 text-slate-400 text-[10px]">{bk.checksum}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                      {bk.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">
                    <a
                      href={bk.downloadUrl}
                      download
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-medium inline-flex items-center space-x-1 border border-slate-700 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
