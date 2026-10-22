import React, { useState, useEffect } from 'react';
import {
  Database,
  Router,
  Server,
  ShieldCheck,
  Globe,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  Settings2,
  Download,
  Upload,
  Activity,
  Clock,
  Key,
  Network,
  Save,
  X,
  Target,
  Terminal,
  Zap,
  Sliders,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Cpu,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { SqliteDataSource, DashboardSourceMapping, EnvironmentPreset } from '../types';
import { PrometheusTargetManager } from './PrometheusTargetManager';

interface DataSourceManagerProps {
  onNavigateTab?: (tab: string) => void;
  onRefreshGlobal?: () => void;
  initialSubTab?: 'targets' | 'sources' | 'mappings' | 'presets' | 'deployment' | 'logs';
}

export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  onNavigateTab,
  onRefreshGlobal,
  initialSubTab = 'targets',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'targets' | 'sources' | 'mappings' | 'presets' | 'deployment' | 'logs'>(initialSubTab);
  const [dataSources, setDataSources] = useState<SqliteDataSource[]>([]);
  const [mappings, setMappings] = useState<DashboardSourceMapping[]>([]);
  const [presets, setPresets] = useState<EnvironmentPreset[]>([]);
  const [dbStats, setDbStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showArchitectureGuide, setShowArchitectureGuide] = useState<boolean>(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Testing probe state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Edit/Add Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<Partial<SqliteDataSource> | null>(null);
  const [isNewSource, setIsNewSource] = useState<boolean>(false);

  // Quick Preset Applying State
  const [isApplyingPreset, setIsApplyingPreset] = useState<boolean>(false);

  // Sync initialSubTab if parent changes it
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Load Data from SQLite Backend
  const loadDatabaseData = async () => {
    setIsLoading(true);
    try {
      const [sourcesRes, mappingsRes, statsRes, presetsRes, logsRes] = await Promise.all([
        fetch('/api/database/sources').then((r) => r.json()).catch(() => ({ sources: [] })),
        fetch('/api/database/dashboard-mappings').then((r) => r.json()).catch(() => ({ mappings: [] })),
        fetch('/api/database/status').then((r) => r.json()).catch(() => ({ stats: null })),
        fetch('/api/database/presets').then((r) => r.json()).catch(() => ({ presets: [] })),
        fetch('/api/database/audit-logs?limit=30').then((r) => r.json()).catch(() => ({ logs: [] })),
      ]);

      if (sourcesRes.success) setDataSources(sourcesRes.sources || []);
      if (mappingsRes.success) setMappings(mappingsRes.mappings || []);
      if (statsRes.success) setDbStats(statsRes.stats);
      if (presetsRes.success) setPresets(presetsRes.presets || []);
      if (logsRes.success) setAuditLogs(logsRes.logs || []);
    } catch (err: any) {
      showMessage('error', `Gagal memuat database SQLite: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Master Sync All Data Sources & Prometheus Targets
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const res = await fetch('/api/database/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showMessage('success', data.message || 'Seluruh Data Sources & Target Prometheus berhasil disinkronkan!');
        loadDatabaseData();
        if (onRefreshGlobal) onRefreshGlobal();
      } else {
        showMessage('error', data.error || 'Gagal menyinkronkan data.');
      }
    } catch (err: any) {
      showMessage('error', `Error sinkronisasi: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Test Probe Connection
  const handleTestConnection = async (source: SqliteDataSource) => {
    setTestingId(source.id);
    try {
      const res = await fetch('/api/database/sources/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: source.id,
          endpoint_url: source.endpoint_url,
          ip_address: source.ip_address,
          port: source.port,
        }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [source.id]: data }));

      if (data.reachable) {
        showMessage('success', `Koneksi ke ${source.name} (${source.ip_address}:${source.port}) BERHASIL (${data.responseTimeMs} ms)!`);
      } else {
        showMessage('error', `Target ${source.ip_address}:${source.port} tidak merespons HTTP: ${data.error || 'Timeout'}`);
      }
      // Refresh list to show updated status
      const updatedSourcesRes = await fetch('/api/database/sources').then((r) => r.json());
      if (updatedSourcesRes.success) setDataSources(updatedSourcesRes.sources);
    } catch (err: any) {
      showMessage('error', `Error probe koneksi: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  // Apply Environment Preset
  const handleApplyPreset = async (presetId: string) => {
    if (!window.confirm(`Terapkan preset lingkungan ini ke seluruh database SQLite? Seluruh IP dan endpoint akan langsung diperbarui dan disinkronkan ke Target Prometheus.`)) {
      return;
    }
    setIsApplyingPreset(true);
    try {
      const res = await fetch('/api/database/presets/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', data.message || 'Preset lingkungan berhasil diterapkan.');
        loadDatabaseData();
        if (onRefreshGlobal) onRefreshGlobal();
      } else {
        showMessage('error', data.error || 'Gagal menerapkan preset.');
      }
    } catch (err: any) {
      showMessage('error', `Gagal menerapkan preset: ${err.message}`);
    } finally {
      setIsApplyingPreset(false);
    }
  };

  // Save / Update Data Source
  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource || !editingSource.name) return;

    try {
      let res;
      if (isNewSource) {
        res = await fetch('/api/database/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingSource),
        });
      } else {
        res = await fetch(`/api/database/sources/${editingSource.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingSource),
        });
      }

      const data = await res.json();
      if (data.success) {
        showMessage('success', isNewSource ? 'Sumber data baru berhasil ditambahkan.' : 'Sumber data berhasil diperbarui.');
        setIsModalOpen(false);
        setEditingSource(null);
        loadDatabaseData();
        if (onRefreshGlobal) onRefreshGlobal();
      } else {
        showMessage('error', data.error || 'Gagal menyimpan sumber data.');
      }
    } catch (err: any) {
      showMessage('error', `Error menyimpan data: ${err.message}`);
    }
  };

  // Delete Data Source
  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    if (!window.confirm(`Yakin ingin menghapus sumber data "${sourceName}" dari SQLite?`)) return;

    try {
      const res = await fetch(`/api/database/sources/${sourceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `Sumber data "${sourceName}" berhasil dihapus.`);
        loadDatabaseData();
        if (onRefreshGlobal) onRefreshGlobal();
      } else {
        showMessage('error', data.error || 'Gagal menghapus sumber data.');
      }
    } catch (err: any) {
      showMessage('error', `Error menghapus data: ${err.message}`);
    }
  };

  // Update Mapping
  const handleUpdateMapping = async (dashboardKey: string, field: string, value: any) => {
    const current = mappings.find((m) => m.dashboard_key === dashboardKey);
    if (!current) return;

    const payload = { ...current, [field]: value };
    try {
      const res = await fetch(`/api/database/dashboard-mappings/${dashboardKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMappings((prev) => prev.map((m) => (m.dashboard_key === dashboardKey ? data.mapping : m)));
        showMessage('success', `Mapping dashboard ${dashboardKey} diperbarui.`);
        if (onRefreshGlobal) onRefreshGlobal();
      }
    } catch (err: any) {
      showMessage('error', `Gagal mengubah mapping: ${err.message}`);
    }
  };

  // Export & Import SQLite Config
  const handleExportConfig = () => {
    window.location.href = '/api/database/export';
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const res = await fetch('/api/database/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        });
        const data = await res.json();
        if (data.success) {
          showMessage('success', 'Konfigurasi SQLite berhasil diimpor!');
          loadDatabaseData();
          if (onRefreshGlobal) onRefreshGlobal();
        } else {
          showMessage('error', data.error || 'Gagal mengimpor file.');
        }
      } catch (err: any) {
        showMessage('error', `File JSON tidak valid: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredSources = dataSources.filter((s) => {
    if (filterCategory === 'all') return true;
    return s.category === filterCategory;
  });

  // Deployment Guide Scripts
  const pm2DeployCommands = `# 1. Masuk ke direktori server NetWatch Pro
cd /var/www/netwatch-pro

# 2. Pastikan dependensi terpasang & build produksi
npm install
npm run build

# 3. Jalankan server Node.js backend dengan PM2 (Binds to 0.0.0.0:3000)
pm2 start dist/server.cjs --name "netwatch-pro"
pm2 save
pm2 startup

# 4. Cek status & monitor log
pm2 status
pm2 logs netwatch-pro`;

  const nginxConfigSnippet = `# /etc/nginx/sites-available/netwatch-pro
server {
    listen 80;
    server_name monitoring.unmus.ac.id; # Ganti domain / IP Server Anda

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Aktifkan konfigurasi & reload Nginx:
# sudo ln -s /etc/nginx/sites-available/netwatch-pro /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx`;

  const sqliteStorageGuide = `# 1. Lokasi Berkas Basis Data SQLite 3 Native
ls -lh /var/www/netwatch-pro/data/netwatch.db

# 2. Cek Integritas Basis Data & Hitung Target via sqlite3 CLI
sqlite3 /var/www/netwatch-pro/data/netwatch.db "PRAGMA integrity_check;"
sqlite3 /var/www/netwatch-pro/data/netwatch.db "SELECT count(*) AS total_targets FROM prometheus_targets;"
sqlite3 /var/www/netwatch-pro/data/netwatch.db "SELECT count(*) AS total_sources FROM data_sources;"

# 3. Pencadangan Cepat (Atomic Copy Backup)
cp /var/www/netwatch-pro/data/netwatch.db /var/www/netwatch-pro/data/netwatch_backup_$(date +%F).db

# CATATAN ARSITEKTUR:
# NetWatch Pro 100% menggunakan engine embedded SQLite 3 (Node.js DatabaseSync).
# ZERO dependency MariaDB/MySQL server, tidak butuh konfigurasi grant atau user terpisah.`;

  const prometheusSetupCommands = `# 1. Update paket & Install Prometheus + Exporters resmi Ubuntu 24.04
sudo apt update
sudo apt install -y prometheus prometheus-node-exporter prometheus-snmp-exporter prometheus-blackbox-exporter

# 2. Pasang file prometheus.yml yang dihasilkan dari SQLite
sudo cp prometheus.yml /etc/prometheus/prometheus.yml

# 3. Validasi sintaks konfigurasi menggunakan promtool
promtool check config /etc/prometheus/prometheus.yml

# 4. Aktifkan & Jalankan Prometheus Service
sudo systemctl enable --now prometheus
sudo systemctl restart prometheus
sudo systemctl enable --now prometheus-node-exporter

# 5. Verifikasi status scrape engine
sudo systemctl status prometheus --no-pager`;

  return (
    <div className="space-y-6 font-mono text-slate-200">
      {/* Top Banner & Title */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-xl font-bold text-white tracking-wide">
                  Master Data Sources & Scrape Targets
                </h1>
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold">
                  SQLite 3 Native
                </span>
                <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold">
                  12 Prometheus Targets
                </span>
                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-semibold">
                  7 Data Sources
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Pusat kendali terpadu seluruh sumber data telemetri kampus. Mengelola target scrape daemon <span className="text-amber-300 font-semibold">Prometheus</span>, sumber data API <span className="text-cyan-300 font-semibold">NetWatch</span>, dan pemetaan ke dashboard. Semua tersimpan konsisten di database <span className="text-emerald-400 font-semibold">data/netwatch.db</span>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="px-3.5 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold rounded flex items-center space-x-1.5 shadow-md shadow-amber-900/30 transition"
              title="Sinkronkan seluruh IP Data Sources ke Target Prometheus & Mappings"
            >
              <Zap className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Menyinkronkan...' : 'Sinkronkan Semua'}</span>
            </button>

            <a
              href="/api/config/prometheus"
              download="prometheus.yml"
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center space-x-1.5 transition"
              title="Download File prometheus.yml untuk Linux Server"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download prometheus.yml</span>
            </a>

            <button
              onClick={handleExportConfig}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center space-x-1.5 transition"
              title="Download Backup JSON dari Database SQLite"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>

            <label className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center space-x-1.5 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
            </label>

            <button
              onClick={() => {
                setIsNewSource(true);
                setEditingSource({
                  name: '',
                  category: 'mikrotik',
                  driver: 'mikrotik_rest',
                  endpoint_url: 'http://192.168.1.1/rest',
                  ip_address: '192.168.1.1',
                  port: 80,
                  auth_type: 'basic',
                  auth_credentials: { username: 'admin', password: '', snmpCommunity: 'public' },
                  scrape_interval_sec: 10,
                  is_default: false,
                  status: 'active',
                });
                setIsModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded flex items-center space-x-1.5 shadow-md shadow-cyan-900/30 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Source</span>
            </button>

            <button
              onClick={loadDatabaseData}
              disabled={isLoading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition"
              title="Refresh Data dari SQLite"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Database Health Mini Stats */}
        {dbStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase">Engine SQLite</span>
              <span className="text-white font-bold">{dbStats.engine ? dbStats.engine.split(' ')[0] : 'Node.js'} v3</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase">File Database</span>
              <span className="text-cyan-400 font-bold truncate block">{dbStats.databaseFile?.split('/').pop() || 'netwatch.db'}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase">Ukuran SQLite DB</span>
              <span className="text-emerald-400 font-bold">{dbStats.sizeFormatted || '60 KB'}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px] uppercase">Data Sources & Targets</span>
              <span className="text-purple-400 font-bold">{dbStats.sourcesCount || dataSources.length} Sumber / 12 Targets</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block text-[10px] uppercase">Active Profile</span>
              <span className="text-amber-400 font-bold capitalize">{dbStats.activeProfile || 'Kampus Unmus'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Architectural Explainer Card (Clarity of Data Sources vs Targets) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowArchitectureGuide(!showArchitectureGuide)}
          className="w-full p-3.5 bg-slate-950/70 hover:bg-slate-950 flex items-center justify-between border-b border-slate-800/80 text-left transition"
        >
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white tracking-wide">
              PANDUAN & HUBUNGAN FUNGSIONAL: DATA SOURCES vs PROMETHEUS TARGETS
            </span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="text-[11px]">{showArchitectureGuide ? 'Sembunyikan' : 'Buka Penjelasan'}</span>
            {showArchitectureGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showArchitectureGuide && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
            <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30">
              <div className="flex items-center space-x-2 text-amber-400 font-bold mb-1.5">
                <Target className="w-4 h-4" />
                <span>1. Prometheus Scrape Targets (Tab 1)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Tingkat Daemon Server Linux.</strong> Mengatur 12 target sensor yang ditarik oleh Prometheus Server (<span className="text-amber-300">port 9090</span>) tiap 15-30 detik. Target ini mengekspor file resmi <span className="text-slate-200">/etc/prometheus/prometheus.yml</span>.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold mb-1.5">
                <Database className="w-4 h-4" />
                <span>2. Data Sources Aplikasi (Tab 2)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Tingkat Aplikasi NetWatch Pro.</strong> Mengatur koneksi langsung dashboard ke REST API atau driver perangkat (misal: REST API MikroTik, CrowdSec LAPI, Proxmox Cluster) untuk aksi manajemen operasional (blokir IP, reboot VM, DHCP leases).
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-purple-950/20 border border-purple-500/30">
              <div className="flex items-center space-x-2 text-purple-400 font-bold mb-1.5">
                <Layers className="w-4 h-4" />
                <span>3. Pemetaan & Sinkronisasi (Tab 3 & 4)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Tersinkronisasi Otomatis.</strong> Kedua modul disimpan dalam database SQLite terpadu (<span className="text-purple-300">data/netwatch.db</span>). Mengubah IP di Data Source otomatis memperbarui target Prometheus saat klik tombol <em>"Sinkronkan Semua"</em>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notifications / Feedback */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
            message.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1">
        <button
          onClick={() => setActiveSubTab('targets')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center space-x-2 ${
            activeSubTab === 'targets'
              ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400 border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Target Scrape Prometheus (12 Sensor)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sources')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center space-x-2 ${
            activeSubTab === 'sources'
              ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400 border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Data Sources Aplikasi ({dataSources.length} Induk)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mappings')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center space-x-2 ${
            activeSubTab === 'mappings'
              ? 'bg-slate-800 text-purple-400 border-t-2 border-purple-400 border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Pemetaan Dashboard ({mappings.length} Modul)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('presets')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center space-x-2 ${
            activeSubTab === 'presets'
              ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-400 border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Profil Lingkungan Jaringan</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deployment')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center space-x-2 ${
            activeSubTab === 'deployment'
              ? 'bg-slate-800 text-rose-400 border-t-2 border-rose-400 border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Panduan Server & SQLite 3</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center space-x-2 ${
            activeSubTab === 'logs'
              ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400 border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Audit Log SQLite ({auditLogs.length})</span>
        </button>
      </div>

      {/* SUB-TAB 0: PROMETHEUS SCRAPE TARGETS (EMBEDDED) */}
      {activeSubTab === 'targets' && (
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>
                Seluruh target di bawah ini terhubung langsung ke tabel <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">prometheus_targets</code> di SQLite. Perubahan disimpan secara instan dan dapat diunduh langsung sebagai <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">prometheus.yml</code>.
              </span>
            </div>
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition flex items-center space-x-1 shrink-0 ml-2"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Target</span>
            </button>
          </div>
          <PrometheusTargetManager />
        </div>
      )}

      {/* SUB-TAB 1: MANAGED DATA SOURCES */}
      {activeSubTab === 'sources' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            <span className="text-xs text-slate-400 mr-2">Filter Kategori:</span>
            {[
              { id: 'all', label: 'Semua Kategori' },
              { id: 'prometheus', label: 'Prometheus TSDB' },
              { id: 'mikrotik', label: 'MikroTik Router' },
              { id: 'ruijie', label: 'Ruijie Gateway' },
              { id: 'server_node', label: 'Proxmox VE' },
              { id: 'waf_crowdsec', label: 'CrowdSec WAF' },
              { id: 'website_kuma', label: 'Uptime Kuma' },
              { id: 'custom_api', label: 'Custom REST' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  filterCategory === cat.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map((source) => {
              const test = testResults[source.id];
              const isTesting = testingId === source.id;

              return (
                <div
                  key={source.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition group shadow-md"
                >
                  <div className="space-y-3">
                    {/* Source Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-slate-800 rounded text-cyan-400 border border-slate-700">
                          {source.category === 'mikrotik' && <Router className="w-4 h-4" />}
                          {source.category === 'ruijie' && <Network className="w-4 h-4" />}
                          {source.category === 'server_node' && <Server className="w-4 h-4" />}
                          {source.category === 'waf_crowdsec' && <ShieldCheck className="w-4 h-4" />}
                          {source.category === 'website_kuma' && <Globe className="w-4 h-4" />}
                          {source.category === 'prometheus' && <Activity className="w-4 h-4" />}
                          {source.category === 'custom_api' && <Key className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                            {source.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Driver: {source.driver}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {source.is_default && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded font-semibold">
                            DEFAULT
                          </span>
                        )}
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            source.last_status === 'online'
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                              : 'bg-rose-400'
                          }`}
                          title={`Status: ${source.last_status}`}
                        />
                      </div>
                    </div>

                    {/* Endpoint & Details */}
                    <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800/80 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Alamat IP:</span>
                        <span className="text-white font-semibold">{source.ip_address}:{source.port}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Endpoint URL:</span>
                        <span className="text-cyan-400 truncate max-w-[190px]" title={source.endpoint_url}>
                          {source.endpoint_url}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Auth:</span>
                        <span className="text-slate-300 uppercase text-[10px]">{source.auth_type}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Interval:</span>
                        <span className="text-slate-300">{source.scrape_interval_sec}s</span>
                      </div>
                    </div>

                    {/* Probe Test Output */}
                    {test && (
                      <div
                        className={`p-2 rounded text-[11px] border ${
                          test.reachable
                            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{test.reachable ? 'Target Merespons' : 'Gagal Menghubungi'}</span>
                          <span>{test.responseTimeMs} ms</span>
                        </div>
                        {test.error && <p className="text-[10px] text-rose-400 mt-1">{test.error}</p>}
                      </div>
                    )}
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-xs">
                    <button
                      onClick={() => handleTestConnection(source)}
                      disabled={isTesting}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold border border-slate-700 flex items-center space-x-1 transition"
                    >
                      <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Probing...' : 'Test Probe'}</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          setIsNewSource(false);
                          setEditingSource(source);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
                        title="Edit Konfigurasi"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteSource(source.id, source.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-950/40 rounded transition"
                        title="Hapus Sumber Data"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DASHBOARD MAPPING */}
      {activeSubTab === 'mappings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Pemetaan Sumber Data ke Halaman Dashboard NetWatch</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mengatur rute sumber data primer dan fallback untuk setiap modul visualisasi.
              </p>
            </div>
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Zap className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>Sinkronkan ke Dashboard</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Modul Dashboard</th>
                  <th className="py-2.5 px-3">Sumber Primer (Primary)</th>
                  <th className="py-2.5 px-3">Sumber Sekunder (Fallback)</th>
                  <th className="py-2.5 px-3">Mode Operasi</th>
                  <th className="py-2.5 px-3">Auto Fallback</th>
                  <th className="py-2.5 px-3">Refresh (detik)</th>
                  <th className="py-2.5 px-3">Aksi Navigasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {mappings.map((map) => (
                  <tr key={map.dashboard_key} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <span className="font-bold text-white block">{map.title}</span>
                      <span className="text-[10px] text-slate-500">{map.dashboard_key}</span>
                    </td>

                    {/* Primary Source Dropdown */}
                    <td className="py-3 px-3">
                      <select
                        value={map.primary_source_id}
                        onChange={(e) => handleUpdateMapping(map.dashboard_key, 'primary_source_id', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-400 text-xs focus:border-cyan-500 focus:outline-hidden"
                      >
                        {dataSources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.ip_address})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Secondary Source Dropdown */}
                    <td className="py-3 px-3">
                      <select
                        value={map.secondary_source_id || ''}
                        onChange={(e) => handleUpdateMapping(map.dashboard_key, 'secondary_source_id', e.target.value || null)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:border-cyan-500 focus:outline-hidden"
                      >
                        <option value="">-- Tidak Ada Backup --</option>
                        {dataSources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.ip_address})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Mode Selector */}
                    <td className="py-3 px-3">
                      <select
                        value={map.mode}
                        onChange={(e) => handleUpdateMapping(map.dashboard_key, 'mode', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:border-cyan-500 focus:outline-hidden"
                      >
                        <option value="direct_api">Direct REST API</option>
                        <option value="prometheus_only">Prometheus Exporter</option>
                        <option value="hybrid">Hybrid (REST + Prometheus)</option>
                      </select>
                    </td>

                    {/* Auto Fallback Toggle */}
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={map.auto_fallback}
                        onChange={(e) => handleUpdateMapping(map.dashboard_key, 'auto_fallback', e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Refresh Interval */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="2"
                        max="60"
                        value={map.refresh_interval_sec}
                        onChange={(e) => handleUpdateMapping(map.dashboard_key, 'refresh_interval_sec', Number(e.target.value))}
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-cyan-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Link to actual dashboard tab */}
                    <td className="py-3 px-3">
                      {onNavigateTab && (
                        <button
                          onClick={() => onNavigateTab(map.dashboard_key)}
                          className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded flex items-center space-x-1 border border-slate-700"
                        >
                          <span>Buka</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ENVIRONMENT PRESETS */}
      {activeSubTab === 'presets' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center space-x-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <span>Preset Lingkungan Jaringan (One-Click Environment Switching)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Pindahkan seluruh sistem ke subnet jaringan lain secara instan tanpa menyentuh script kode apapun. Memilih preset di bawah ini akan secara otomatis memperbarui seluruh IP dan endpoint di database SQLite, serta menyinkronkan 12 target scrape Prometheus.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {presets.map((preset) => {
                const isActive = dbStats?.activeProfile === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-lg border transition flex flex-col justify-between ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-cyan-400">
                          Subnet Prefix: {preset.subnetPrefix}.x
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded font-bold">
                            SEDANG AKTIF
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white">{preset.name}</h4>
                      <p className="text-xs text-slate-400">{preset.description}</p>

                      <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400 font-mono">
                        {preset.sources.slice(0, 4).map((s, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-slate-500">{s.id?.replace('ds-', '')}:</span>
                            <span className="text-slate-300">{s.ip_address}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyPreset(preset.id)}
                      disabled={isActive || isApplyingPreset}
                      className={`mt-4 w-full py-1.5 px-3 rounded text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                        isActive
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Profil Aktif' : 'Terapkan Preset Ini'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SERVER DEPLOYMENT & SQLITE GUIDE */}
      {activeSubTab === 'deployment' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-rose-400" />
                <span>Panduan Deployment Server Linux & SQLite 3 (Ubuntu 24.04 LTS)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Langkah-langkah resmi menjalankan NetWatch Pro, Prometheus Server, dan reverse proxy Nginx di lingkungan kampus.
              </p>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase">Engine Backend</span>
                <span className="text-white font-bold">Node.js v22 & PM2</span>
                <p className="text-[10px] text-slate-500 mt-1">Daemon process manager</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase">Basis Data</span>
                <span className="text-emerald-400 font-bold">SQLite 3 Native</span>
                <p className="text-[10px] text-slate-500 mt-1">Zero MariaDB configuration</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase">Scrape Daemon</span>
                <span className="text-amber-400 font-bold">Prometheus v2.45+</span>
                <p className="text-[10px] text-slate-500 mt-1">Auto-generated prometheus.yml</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase">Reverse Proxy</span>
                <span className="text-cyan-400 font-bold">Nginx HTTP/2</span>
                <p className="text-[10px] text-slate-500 mt-1">Port 80/443 ke 3000</p>
              </div>
            </div>

            {/* Code Snippet 1: PM2 Deployment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>1. Deployment PM2 (Jalankan NetWatch Pro di Background)</span>
                </span>
                <button
                  onClick={() => copyToClipboard(pm2DeployCommands, 1)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center space-x-1"
                >
                  {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === 1 ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 overflow-x-auto font-mono">
                {pm2DeployCommands}
              </pre>
            </div>

            {/* Code Snippet 2: Nginx Config */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>2. Konfigurasi Nginx Reverse Proxy</span>
                </span>
                <button
                  onClick={() => copyToClipboard(nginxConfigSnippet, 2)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center space-x-1"
                >
                  {copiedIndex === 2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === 2 ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 overflow-x-auto font-mono">
                {nginxConfigSnippet}
              </pre>
            </div>

            {/* Code Snippet 3: SQLite Storage & Backup */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>3. Perawatan & Pencadangan Basis Data SQLite 3</span>
                </span>
                <button
                  onClick={() => copyToClipboard(sqliteStorageGuide, 3)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center space-x-1"
                >
                  {copiedIndex === 3 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === 3 ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 overflow-x-auto font-mono">
                {sqliteStorageGuide}
              </pre>
            </div>

            {/* Code Snippet 4: Prometheus Server Setup */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>4. Pasang & Jalankan Daemon Prometheus</span>
                </span>
                <button
                  onClick={() => copyToClipboard(prometheusSetupCommands, 4)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center space-x-1"
                >
                  {copiedIndex === 4 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === 4 ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 overflow-x-auto font-mono">
                {prometheusSetupCommands}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: AUDIT LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Riwayat Aktivitas & Perubahan Konfigurasi SQLite</span>
            </h2>
            <span className="text-xs text-slate-400">Total {auditLogs.length} rekaman terakhir</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-3">Waktu</th>
                  <th className="py-2 px-3">Aksi</th>
                  <th className="py-2 px-3">Operator</th>
                  <th className="py-2 px-3">Detail Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300 font-semibold">{log.operator}</td>
                    <td className="py-2 px-3 text-slate-200">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DATA SOURCE */}
      {isModalOpen && editingSource && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>{isNewSource ? 'Tambah Sumber Data Baru ke SQLite' : 'Edit Sumber Data'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSource(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSource} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nama Sumber Data</label>
                <input
                  type="text"
                  required
                  value={editingSource.name || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                  placeholder="Contoh: Router Utama MikroTik CCR"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Kategori</label>
                  <select
                    value={editingSource.category || 'mikrotik'}
                    onChange={(e) => setEditingSource({ ...editingSource, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                  >
                    <option value="prometheus">Prometheus Server</option>
                    <option value="mikrotik">MikroTik RouterOS</option>
                    <option value="ruijie">Ruijie Gateway & AP</option>
                    <option value="server_node">Proxmox VE / Linux</option>
                    <option value="waf_crowdsec">CrowdSec WAF</option>
                    <option value="website_kuma">Website & Kuma</option>
                    <option value="custom_api">Custom REST API</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Driver Protokol</label>
                  <select
                    value={editingSource.driver || 'mikrotik_rest'}
                    onChange={(e) => setEditingSource({ ...editingSource, driver: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                  >
                    <option value="mikrotik_rest">MikroTik REST API</option>
                    <option value="mikrotik_snmp">MikroTik SNMP</option>
                    <option value="prometheus_promql">Prometheus PromQL</option>
                    <option value="ruijie_eweb">Ruijie eWeb API</option>
                    <option value="ruijie_snmp">Ruijie SNMP</option>
                    <option value="proxmox_api">Proxmox API</option>
                    <option value="crowdsec_lapi">CrowdSec LAPI</option>
                    <option value="http_probe">HTTP Uptime Probe</option>
                    <option value="custom_json">Custom JSON</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 block mb-1">Alamat IP Target</label>
                  <input
                    type="text"
                    required
                    value={editingSource.ip_address || ''}
                    onChange={(e) => {
                      const ip = e.target.value;
                      const port = editingSource.port || 80;
                      setEditingSource({
                        ...editingSource,
                        ip_address: ip,
                        endpoint_url: `http://${ip}:${port}`,
                      });
                    }}
                    placeholder="192.168.1.1 atau 10.10.0.1"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Port Layanan</label>
                  <input
                    type="number"
                    value={editingSource.port || 80}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      const ip = editingSource.ip_address || '127.0.0.1';
                      setEditingSource({
                        ...editingSource,
                        port: p,
                        endpoint_url: `http://${ip}:${p}`,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Endpoint URL Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingSource.endpoint_url || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, endpoint_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Tipe Autentikasi</label>
                  <select
                    value={editingSource.auth_type || 'basic'}
                    onChange={(e) => setEditingSource({ ...editingSource, auth_type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                  >
                    <option value="none">Tanpa Auth (Public/Internal)</option>
                    <option value="basic">HTTP Basic (User/Pass)</option>
                    <option value="token">Bearer Token / API Key</option>
                    <option value="snmp_community">SNMP Community</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Interval Scrape (detik)</label>
                  <input
                    type="number"
                    value={editingSource.scrape_interval_sec || 15}
                    onChange={(e) => setEditingSource({ ...editingSource, scrape_interval_sec: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Conditional Auth Fields */}
              {editingSource.auth_type === 'basic' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Username</label>
                    <input
                      type="text"
                      value={editingSource.auth_credentials?.username || ''}
                      onChange={(e) =>
                        setEditingSource({
                          ...editingSource,
                          auth_credentials: { ...editingSource.auth_credentials, username: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Password</label>
                    <input
                      type="password"
                      value={editingSource.auth_credentials?.password || ''}
                      onChange={(e) =>
                        setEditingSource({
                          ...editingSource,
                          auth_credentials: { ...editingSource.auth_credentials, password: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {editingSource.auth_type === 'snmp_community' && (
                <div>
                  <label className="text-slate-400 block mb-1">SNMP Community String</label>
                  <input
                    type="text"
                    value={editingSource.auth_credentials?.snmpCommunity || 'public'}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        auth_credentials: { ...editingSource.auth_credentials, snmpCommunity: e.target.value },
                      })
                    }
                    placeholder="public"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSource(null);
                  }}
                  className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-900/40"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan ke SQLite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourceManager;
