import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Database,
  ShieldAlert,
  Info,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  Activity,
  Server,
  Clock,
} from 'lucide-react';
import { InfluxAuditLog } from '../types';

interface AuditLogViewerProps {
  logs?: InfluxAuditLog[];
  onRefresh?: () => void;
}

interface PrometheusIncidentEvent {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'WARN' | 'INFO' | 'RECOVERED';
  targetNode: string;
  sourceIp: string;
  alertName: string;
  description: string;
  status: 'FIRING' | 'RESOLVED';
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  // Prometheus TSDB Incident Log Buffer
  const [incidentLogs, setIncidentLogs] = useState<PrometheusIncidentEvent[]>([
    {
      id: 'prom-inc-101',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toLocaleString('id-ID'),
      severity: 'CRITICAL',
      targetNode: 'PVE-Informatika / VM 105 (SIAKAD Unmus)',
      sourceIp: '192.168.14.105',
      alertName: 'InstanceDown / Target Unreachable',
      description: 'VM status berubah menjadi STOPPED. Prometheus exporter pve_exporter melaporkan target unreachable.',
      status: 'FIRING',
    },
    {
      id: 'prom-inc-102',
      timestamp: new Date(Date.now() - 1000 * 60 * 42).toLocaleString('id-ID'),
      severity: 'WARN',
      targetNode: 'MikroTik RB5009 (Gateway Unmus)',
      sourceIp: '192.168.89.1',
      alertName: 'HighCpuUtilizationThreshold',
      description: 'Penggunaan CPU Router Gateway bertahan diatas 82% selama lebih dari 5 menit pada jam sibuk perkuliahan.',
      status: 'FIRING',
    },
    {
      id: 'prom-inc-103',
      timestamp: new Date(Date.now() - 1000 * 60 * 95).toLocaleString('id-ID'),
      severity: 'RECOVERED',
      targetNode: 'PVE-Dekanat / DAS-WAF-X (VM 100)',
      sourceIp: '192.168.14.10',
      alertName: 'HighRamPressureResolved',
      description: 'Penggunaan RAM WAF kembali normal di angka 62% setelah dilakukan pembersihan buffer cache.',
      status: 'RESOLVED',
    },
    {
      id: 'prom-inc-104',
      timestamp: new Date(Date.now() - 1000 * 60 * 210).toLocaleString('id-ID'),
      severity: 'WARN',
      targetNode: 'Portal Web Unmus (Probe #2)',
      sourceIp: '10.10.0.15',
      alertName: 'HttpProbeSlowResponse',
      description: 'Waktu respon HTTP GET ke portal akademik melonjak hingga 2.4 detik (Threshold: > 1.5s).',
      status: 'RESOLVED',
    },
    {
      id: 'prom-inc-105',
      timestamp: new Date(Date.now() - 1000 * 60 * 360).toLocaleString('id-ID'),
      severity: 'INFO',
      targetNode: 'PVE-Backup (PBS Host Unmus)',
      sourceIp: '192.168.14.250',
      alertName: 'DailyPrometheusBackupSnapshot',
      description: 'Snapshot riwayat metrik Prometheus TSDB berhasil disimpan otomatis ke penyimpanan backup harian.',
      status: 'RESOLVED',
    },
  ]);

  const handleSyncLogs = async () => {
    setLoading(true);
    if (onRefresh) onRefresh();

    try {
      const res = await fetch('/api/waf/alerts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const livePromLogs: PrometheusIncidentEvent[] = data.map((item: any, idx: number) => ({
            id: `prom-live-${idx}-${Date.now()}`,
            timestamp: new Date().toLocaleString('id-ID'),
            severity: item.severity === 'high' ? 'CRITICAL' : item.severity === 'medium' ? 'WARN' : 'INFO',
            targetNode: item.ip || 'WAF-CrowdSec Exporter',
            sourceIp: item.ip || '192.168.14.10',
            alertName: item.reason || 'PrometheusAlertTriggered',
            description: `Aktivitas tercatat dari Prometheus TSDB (Kategori: ${item.country || 'Lokal'}). Akses: ${item.action || 'Monitor'}`,
            status: 'FIRING',
          }));

          setIncidentLogs((prev) => [...livePromLogs, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to sync Prometheus incident logs:', err);
    } finally {
      setTimeout(() => setLoading(false), 400);
    }
  };

  const filteredLogs = incidentLogs.filter((log) => {
    const matchesQuery =
      log.alertName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetNode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.sourceIp.includes(searchQuery) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === 'ALL' || log.severity === selectedSeverity;
    return matchesQuery && matchesSeverity;
  });

  const handleExportCsv = () => {
    const headers = 'ID,Waktu,Severity,Target Node,IP Address,Alert Name,Status,Deskripsi\n';
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.severity}","${l.targetNode}","${l.sourceIp}","${l.alertName}","${l.status}","${l.description.replace(
            /"/g,
            '""'
          )}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prometheus_TSDB_Incidents_${Date.now()}.csv`;
    a.click();
  };

  const criticalCount = incidentLogs.filter((l) => l.severity === 'CRITICAL' && l.status === 'FIRING').length;
  const warningCount = incidentLogs.filter((l) => l.severity === 'WARN' && l.status === 'FIRING').length;
  const recoveredCount = incidentLogs.filter((l) => l.severity === 'RECOVERED' || l.status === 'RESOLVED').length;

  const severityBadge = (sev: PrometheusIncidentEvent['severity']) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse';
      case 'WARN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'RECOVERED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'INFO':
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">Prometheus Incidents & Alert Logs</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                TSDB
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rekam jejak kronologis pemicu peringatan, insiden downtime, dan ambang batas dari Prometheus Time Series Database.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition border border-slate-700 w-full md:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleSyncLogs}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-1.5 text-xs font-mono"
            title="Sync Prometheus TSDB Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            <span className="hidden sm:inline">Sync TSDB</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 uppercase">Total Insiden</p>
            <p className="text-2xl font-mono font-bold text-slate-100 mt-1">{incidentLogs.length}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 uppercase">Critical Firing</p>
            <p className="text-2xl font-mono font-bold text-rose-400 mt-1">{criticalCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 uppercase">Warning Alerts</p>
            <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{warningCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 uppercase">Recovered / Normal</p>
            <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">{recoveredCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan IP, node (Informatika, SIAKAD, MikroTik), atau pemicu alert..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {['ALL', 'CRITICAL', 'WARN', 'RECOVERED', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition whitespace-nowrap ${
                selectedSeverity === sev
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Incident Logs Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-mono text-slate-400">
            Menampilkan <strong className="text-slate-200">{filteredLogs.length}</strong> dari {incidentLogs.length} entri riwayat TSDB
          </span>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Prometheus TSDB Engine Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/80">
                <th className="p-3">Waktu Log</th>
                <th className="p-3">Keparahan</th>
                <th className="p-3">Target Node / Server</th>
                <th className="p-3">Source IP</th>
                <th className="p-3">Prometheus Alert Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Detail Deskripsi Incident</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition duration-150">
                    <td className="p-3 text-slate-400 whitespace-nowrap flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{log.timestamp}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${severityBadge(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-200 font-semibold">{log.targetNode}</td>
                    <td className="p-3 text-cyan-400 font-bold">{log.sourceIp}</td>
                    <td className="p-3 text-orange-300 font-bold">{log.alertName}</td>
                    <td className="p-3">
                      {log.status === 'FIRING' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 w-fit">
                          🔥 FIRING
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 w-fit">
                          ✅ RESOLVED
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300 max-w-sm truncate" title={log.description}>
                      {log.description}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">
                    Tidak ada catatan insiden yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
