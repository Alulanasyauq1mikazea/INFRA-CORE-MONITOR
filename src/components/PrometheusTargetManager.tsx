import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Search,
  Sliders,
  Terminal,
  Zap,
  Layers,
  Database,
  ExternalLink,
  Plus,
  Copy,
  Check,
  Globe,
  Shield,
  Cpu,
  Edit3,
  Trash2,
  Play,
  Pause,
  Save,
  Sparkles,
  RefreshCw,
  Filter,
  CheckCircle,
  BookOpen,
  Info,
  HelpCircle,
  FileText,
  Code,
  Table,
  Lock,
  Timer,
  BarChart3,
  History,
  Download,
} from 'lucide-react';
import { PrometheusTarget } from '../types';
import {
  subscribeToTargets,
  seedInitialTargetsIfEmpty,
  updateTargetInDb,
  saveTargetToDb,
  deleteTargetFromDb,
  saveTargetsBatchToDb,
  subscribeToAuditLogs,
  logAuditAction,
  resetHubDefaultSeeds,
  AuditLogItem
} from '../services/targetDbService';

export const PrometheusTargetManager: React.FC = () => {
  const [promHost, setPromHost] = useState<string>('http://192.168.77.30:9090');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTargets, setActiveTargets] = useState<PrometheusTarget[]>(() => {
    try {
      const savedLocal = localStorage.getItem('omniguard_prometheus_targets') || localStorage.getItem('netwatch_prometheus_targets');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [applySuccessBanner, setApplySuccessBanner] = useState<boolean>(false);
  const [syncErrorBanner, setSyncErrorBanner] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [dbSyncStatus, setDbSyncStatus] = useState<'syncing' | 'synced' | 'local'>('synced');

  // Audit Logs State
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Target Installation Wizard Modal
  const [guideTarget, setGuideTarget] = useState<PrometheusTarget | null>(null);

  // Full Target Documentation Modal
  const [selectedDocTarget, setSelectedDocTarget] = useState<PrometheusTarget | null>(null);
  const [docTab, setDocTab] = useState<'metrics' | 'labels' | 'derived'>('metrics');

  // Single Metric Inspector Modal
  const [inspectingMetric, setInspectingMetric] = useState<{
    metricName: string;
    target: PrometheusTarget;
  } | null>(null);

  // Custom PromQL query test
  const [promQlQuery, setPromQlQuery] = useState<string>('rate(node_cpu_seconds_total[1m])');
  const [promQlResult, setPromQlResult] = useState<string | null>(null);

  // New Target Form Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newJobName, setNewJobName] = useState<string>('');
  const [newEndpoint, setNewEndpoint] = useState<string>('');
  const [newNodeName, setNewNodeName] = useState<string>('');
  const [newModule, setNewModule] = useState<'mikrotik' | 'server' | 'waf' | 'website' | 'system' | 'custom'>('server');
  const [newState, setNewState] = useState<'UP' | 'PENDING_INSTALL'>('UP');

  // Edit Target Form Modal
  const [editingTarget, setEditingTarget] = useState<PrometheusTarget | null>(null);
  const [customMetricInput, setCustomMetricInput] = useState<string>('');

  // Metric Documentation Information Generator
  const getMetricDocDetail = (metricName: string, target?: PrometheusTarget) => {
    const job = target?.job || 'uptime-kuma-local';
    const ep = target?.endpoint || 'http://192.168.77.30:3001/metrics';
    const name = String(metricName || '').trim();

    if (name === 'monitor_status') {
      return {
        name: 'monitor_status',
        title: 'Status Ketersediaan Website / Monitor Realtime',
        type: 'Gauge (Integer Status Code)',
        unit: 'Status Flag (0, 1, 2, 3)',
        category: 'Availability & Uptime Core',
        icon: Activity,
        iconColor: 'text-emerald-400',
        description:
          'Metrik utama yang melaporkan status kesehatan website atau port layanan yang dipantau oleh probe Uptime Kuma secara berkala.',
        thresholdsOrValues: [
          { label: '1', value: 'UP / Online', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', desc: 'Layanan aktif normal merespon HTTP 200 OK' },
          { label: '0', value: 'DOWN / Offline', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', desc: 'Layanan gagal dihubungi / Timeout / Error 5xx' },
          { label: '2', value: 'PENDING', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', desc: 'Inisialisasi atau probe awal sedang berjalan' },
          { label: '3', value: 'MAINTENANCE', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', desc: 'Layanan dalam jadwal perawatan / pemeliharaan' },
        ],
        promqlExample: `monitor_status{job="${job}"}`,
        labelsExtracted: [
          { name: 'monitor_name', desc: 'Nama instansi/website (misal: Website FKIP, Portal PMB)', sample: 'Portal PMB Online' },
          { name: 'monitor_type', desc: 'Tipe protokol pengecekan (http, https, ping, port, docker)', sample: 'https' },
          { name: 'monitor_url', desc: 'Alamat lengkap URL tujuan yang dimonitor', sample: 'https://fkip.unmus.ac.id' },
          { name: 'monitor_hostname', desc: 'Alamat IP atau hostname host tujuan', sample: '192.168.77.29' },
          { name: 'monitor_port', desc: 'Port layanan yang diuji', sample: '443' },
          { name: 'monitor_group_name', desc: 'Grup kategori Uptime Kuma untuk tab filter', sample: 'Website & Portal' },
        ],
        dashboardUsage:
          'Menjadi pemicu lampu indikator status hijau/merah di sub-dashboard Website & SSL, kalkulasi Uptime percentage (100%/0%), dan penghitung kartu ringkasan Total Online / Offline.',
        sampleValue: '1 (UP)',
      };
    }

    if (name === 'monitor_response_time' || name === 'monitor_ping_time') {
      return {
        name: 'monitor_response_time',
        title: 'Waktu Respon / Latensi Koneksi HTTP',
        type: 'Gauge (Float/Integer Latency)',
        unit: 'Milidetik (ms)',
        category: 'Performance & Latency',
        icon: Timer,
        iconColor: 'text-cyan-400',
        description:
          'Mengukur durasi waktu bolak-balik (Round Trip Time / HTTP Latency) yang dibutuhkan dari runner probe Uptime Kuma hingga server website membalas respon.',
        thresholdsOrValues: [
          { label: '< 150 ms', value: 'Optimal (Sangat Cepat)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', desc: 'Respon server sangat cepat dan responsif' },
          { label: '150 - 350 ms', value: 'Normal (Standar)', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', desc: 'Kecepatan akses standar dalam batas wajar' },
          { label: '> 350 ms', value: 'Degraded / Warning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', desc: 'Respon mulai lambat, beban server mungkin tinggi' },
          { label: '0 / Timeout', value: 'Failed / Unreachable', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', desc: 'Koneksi terputus atau timeout melebihi batas' },
        ],
        promqlExample: `avg(monitor_response_time{job="${job}"}) by (monitor_name)`,
        labelsExtracted: [
          { name: 'monitor_name', desc: 'Nama instansi/layanan yang diukur latensinya', sample: 'Portal PMB Online' },
          { name: 'monitor_type', desc: 'Tipe protokol pengujian respon', sample: 'https' },
          { name: 'monitor_url', desc: 'Alamat endpoint URL yang dites responnya', sample: 'https://pmb.unmus.ac.id' },
        ],
        dashboardUsage:
          'Ditampilkan secara live di kolom Latensi pada tabel monitor, menentukan status Degraded (>350ms), dan mencatat riwayat heartbeat sparkline 30 titik.',
        sampleValue: '48.2 ms',
      };
    }

    if (name === 'monitor_cert_days_remaining' || name === 'monitor_tls_days_remaining') {
      return {
        name: 'monitor_cert_days_remaining',
        title: 'Sisa Masa Aktif Sertifikat SSL/TLS HTTPS',
        type: 'Gauge (Integer Days Remaining)',
        unit: 'Hari (Days)',
        category: 'Security & TLS Certificate',
        icon: Lock,
        iconColor: 'text-amber-400',
        description:
          'Jumlah hari tersisa sebelum masa berlaku sertifikat keamanan SSL/TLS HTTPS kedaluwarsa (Expired) pada domain website kampus/instansi.',
        thresholdsOrValues: [
          { label: '> 30 Hari', value: 'Aman (Valid)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', desc: 'Sertifikat SSL valid dan terlindungi dengan baik' },
          { label: '15 - 30 Hari', value: 'Perhatian (Expiring Soon)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', desc: 'Segera ajukan perpanjangan sertifikat ke CA/Let’s Encrypt' },
          { label: '< 15 Hari', value: 'Kritis (Critical Alert)', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', desc: 'Sertifikat mendekati masa hangus, bahaya security warning' },
        ],
        promqlExample: `min(monitor_cert_days_remaining{job="${job}"})`,
        labelsExtracted: [
          { name: 'monitor_name', desc: 'Nama domain/website pemegang sertifikat', sample: 'Website FKIP Unmus' },
          { name: 'monitor_url', desc: 'Alamat HTTPS yang diuji sertifikatnya', sample: 'https://fkip.unmus.ac.id' },
          { name: 'monitor_hostname', desc: 'Domain SSL yang diverifikasi', sample: 'fkip.unmus.ac.id' },
        ],
        dashboardUsage:
          'Menampilkan status SSL di kolom Keamanan, memicu badge SSL Alert di tombol filter, dan memberi peringatan dini sebelum domain terblokir browser.',
        sampleValue: '84 hari',
      };
    }

    // Default Fallback info for other Prometheus metrics
    return {
      name: name,
      title: `Metrik PromQL: ${name}`,
      type: name.includes('total') ? 'Counter' : 'Gauge',
      unit: name.includes('bytes') ? 'Bytes' : name.includes('seconds') ? 'Detik' : 'Unit Numerik',
      category: target?.mappedModule || 'System Metric',
      icon: Code,
      iconColor: 'text-cyan-400',
      description: `Metrik Prometheus yang diekspor dari target ${job} (${ep}) untuk pemantauan performa dan status telemetri server.`,
      thresholdsOrValues: [
        { label: 'Nilai Normal', value: 'Telemetri Aktif', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', desc: 'Data berhasil discrape secara periodik' },
      ],
      promqlExample: `${name}{job="${job}"}`,
      labelsExtracted: [
        { name: 'instance', desc: 'Host IP & Port instance target', sample: target?.labels?.instance || '192.168.77.30:3001' },
        { name: 'job', desc: 'Nama job scrape Prometheus', sample: job },
      ],
      dashboardUsage: `Digunakan pada dashboard modul ${target?.mappedModule || 'server'} untuk visualisasi telemetri real-time.`,
      sampleValue: '124.5',
    };
  };

  const getModuleDefaultMetrics = (moduleName: string, jobName: string = ''): string[] => {
    const mod = String(moduleName || '').toLowerCase();
    const job = String(jobName || '').toLowerCase();

    if (mod === 'mikrotik' || job.includes('mikrotik') || job.includes('snmp')) {
      return ['routeros_cpu_load', 'routeros_memory_free_bytes', 'snmp_interface_rx_bytes'];
    }
    if (mod === 'waf' || job.includes('crowdsec') || job.includes('waf') || job.includes('nginx')) {
      return ['nginx_http_requests_total', 'crowdsec_decisions_active', 'rate_limit_blocked_total'];
    }
    if (mod === 'website' || job.includes('kuma') || job.includes('uptime')) {
      return ['monitor_status', 'monitor_response_time', 'monitor_cert_days_remaining', 'monitor_cert_is_valid'];
    }
    if (job.includes('blackbox')) {
      return ['probe_success', 'probe_http_status_code', 'probe_duration_seconds'];
    }
    if (mod === 'system' || job.includes('prometheus')) {
      return ['prometheus_http_requests_total', 'prometheus_build_info', 'prometheus_tsdb_head_samples_appended_total'];
    }
    return ['node_cpu_seconds_total', 'node_memory_MemTotal_bytes', 'node_network_receive_bytes_total'];
  };

  const getStoredPausedMap = (): Record<string, boolean> => {
    try {
      const raw = localStorage.getItem('omniguard_paused_endpoints_map');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const normalizeTargetList = (targets: any[]): PrometheusTarget[] => {
    if (!Array.isArray(targets)) return [];
    const pausedMap = getStoredPausedMap();

    return targets.map((raw, idx) => {
      const job = raw.job || raw.jobName || raw.labels?.job || raw.discoveredLabels?.job || `target-job-${idx + 1}`;
      const instance = raw.labels?.instance || raw.endpoint || raw.scrapeUrl || `192.168.77.${10 + idx}`;
      const endpoint = raw.endpoint || raw.scrapeUrl || (String(instance).startsWith('http') ? instance : `http://${instance}`);
      const cleanEndpoint = String(endpoint).replace(/[^a-zA-Z0-9_.-]/g, '_');
      const cleanJob = String(job).replace(/[^a-zA-Z0-9_.-]/g, '_');
      const id = raw.id ? String(raw.id) : `tgt-${cleanJob}-${cleanEndpoint}`;
      
      const healthLower = String(raw.health || '').toLowerCase();
      const rawStateUpper = String(raw.state || '').toUpperCase();

      // Explicit per-ID or per-job pause check
      const isExplicitlyPaused = pausedMap[id] === true || (pausedMap[id] === undefined && pausedMap[job] === true);
      const isExplicitlyUnpaused = pausedMap[id] === false || (pausedMap[id] === undefined && pausedMap[job] === false);

      let isUserPaused = false;
      if (isExplicitlyPaused) {
        isUserPaused = true;
      } else if (isExplicitlyUnpaused) {
        isUserPaused = false;
      } else {
        isUserPaused = raw.isPaused === true;
      }

      let state: 'UP' | 'DOWN' | 'PENDING_INSTALL' = 'UP';
      if (isUserPaused) {
        state = 'DOWN';
      } else if (healthLower === 'down' || healthLower === 'unhealthy' || (rawStateUpper === 'DOWN' && !String(raw.healthReason || '').includes('Dijeda'))) {
        state = 'DOWN';
      } else if (healthLower === 'up' || rawStateUpper === 'UP') {
        state = 'UP';
      } else if (rawStateUpper === 'PENDING_INSTALL') {
        state = 'PENDING_INSTALL';
      }

      const jobLower = String(job).toLowerCase();
      const endpointLower = String(endpoint).toLowerCase();

      let mappedModule = raw.mappedModule || raw.module;
      if (jobLower === 'uptime-kuma-local' || jobLower.includes('uptime-kuma')) {
        mappedModule = 'website';
      } else if (jobLower.includes('blackbox')) {
        mappedModule = 'system';
      } else if (!mappedModule) {
        mappedModule = (
          jobLower.includes('mikrotik') ? 'mikrotik' :
          jobLower.includes('crowdsec') || jobLower.includes('nginx') ? 'waf' :
          jobLower.includes('prometheus') ? 'system' : 'server'
        );
      }

      // If selected metrics contain mismatched node metrics for specialized targets, auto-correct
      let selectedMetrics = raw.selectedMetrics;
      const isWebsiteOrKuma = mappedModule === 'website' || jobLower === 'uptime-kuma-local' || jobLower.includes('uptime-kuma');
      const isBlackbox = jobLower.includes('blackbox');
      const hasNodeMetrics = Array.isArray(selectedMetrics) && selectedMetrics.some((m: string) => m.startsWith('node_'));

      if (!Array.isArray(selectedMetrics) || selectedMetrics.length === 0 || ((isWebsiteOrKuma || isBlackbox) && hasNodeMetrics)) {
        selectedMetrics = getModuleDefaultMetrics(mappedModule, job);
      }

      return {
        id,
        job: String(job),
        endpoint: String(endpoint),
        state,
        isPaused: isUserPaused,
        labels: raw.labels || { instance, job },
        lastScrape: isUserPaused ? 'Paused / Stopped' : (raw.lastScrape || raw.lastScrapeTime || '5s ago'),
        scrapeDuration: raw.scrapeDuration || '12.4ms',
        mappedModule,
        mappedNodeName: raw.mappedNodeName || raw.nodeName || `${job.toUpperCase()} Node`,
        selectedMetrics,
        exporterType: raw.exporterType || 'Prometheus Exporter',
        installedOnTarget: raw.installedOnTarget !== undefined ? raw.installedOnTarget : true,
        healthReason: isUserPaused ? 'Dijeda oleh pengguna dari Target Manager (Paused)' : (raw.healthReason || raw.lastError || ''),
      };
    });
  };

  const isTargetsEqual = (a: any[], b: any[]): boolean => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort((x, y) => (x.id || '').localeCompare(y.id || ''));
    const sortedB = [...b].sort((x, y) => (x.id || '').localeCompare(y.id || ''));

    for (let i = 0; i < sortedA.length; i++) {
      if (
        sortedA[i].id !== sortedB[i].id ||
        sortedA[i].endpoint !== sortedB[i].endpoint ||
        sortedA[i].state !== sortedB[i].state ||
        sortedA[i].isPaused !== sortedB[i].isPaused ||
        sortedA[i].mappedModule !== sortedB[i].mappedModule ||
        JSON.stringify(sortedA[i].selectedMetrics) !== JSON.stringify(sortedB[i].selectedMetrics)
      ) {
        return false;
      }
    }
    return true;
  };

  const fetchTargets = async (forceLive: boolean = false, silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Load initial cache from local storage if available and not silent
      if (!forceLive && !silent) {
        const savedLocal = localStorage.getItem('omniguard_prometheus_targets') || localStorage.getItem('netwatch_prometheus_targets');
        if (savedLocal) {
          try {
            const parsed = JSON.parse(savedLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const normalized = normalizeTargetList(parsed);
              setActiveTargets((prev) => (isTargetsEqual(prev, normalized) ? prev : normalized));
            }
          } catch (e) {
            console.error('Failed to parse local target cache', e);
          }
        }
      }

      // 2. Query live backend API (with graceful fallback)
      try {
        const res = await fetch(`/api/prometheus/targets?promHost=${encodeURIComponent(promHost)}&refresh=${forceLive ? 'true' : 'false'}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.activeTargets) {
            const normalized = normalizeTargetList(data.activeTargets);
            setActiveTargets((prev) => (isTargetsEqual(prev, normalized) ? prev : normalized));
            localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(normalized));
            if (forceLive) {
              setApplySuccessBanner(true);
            }
          }
        }
      } catch (fetchErr) {
        // Fallback gracefully to offline cache without breaking UI
        console.warn('Network offline or backend sync pending for Prometheus targets:', fetchErr);
      }
    } catch (err) {
      console.warn('Targets loading fallback active:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // 0. Load current configured Prometheus Host from database
    fetch('/api/prometheus/current-host')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success && d.promHost) {
          setPromHost(d.promHost);
        }
      })
      .catch(() => {});

    // 1. Initial silent fetch from API / local cache (prevents layout flickering)
    fetchTargets(false, true);

    // 2. Subscribe to Firestore in real-time for multi-device synchronization
    let unsubscribeFirestore: (() => void) | undefined;
    try {
      unsubscribeFirestore = subscribeToTargets(
        (firestoreTargets) => {
          if (firestoreTargets && firestoreTargets.length > 0) {
            const normalized = normalizeTargetList(firestoreTargets);
            setActiveTargets((prev) => (isTargetsEqual(prev, normalized) ? prev : normalized));
            localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(normalized));
            setDbSyncStatus('synced');
          } else {
            // First time run or empty DB: seed default targets to Firestore
            const savedLocal = localStorage.getItem('omniguard_prometheus_targets');
            if (savedLocal) {
              try {
                const parsed = JSON.parse(savedLocal);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  seedInitialTargetsIfEmpty(parsed);
                }
              } catch {}
            }
            setDbSyncStatus('synced');
          }
        },
        (error) => {
          console.warn('[Firestore] Live sync warning (falling back to local/REST):', error);
          setDbSyncStatus('local');
        }
      );
    } catch (e) {
      console.warn('[Firestore] Realtime subscription init error:', e);
      setDbSyncStatus('local');
    }

    // 3. Subscribe to Audit Logs from Firestore
    const unsubscribeAudit = subscribeToAuditLogs((logs) => {
      setAuditLogs(logs);
    });

    // 4. Auto-poll Prometheus status every 15 seconds smoothly
    const interval = setInterval(() => {
      fetchTargets(false, true);
    }, 15000);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeAudit) unsubscribeAudit();
      clearInterval(interval);
    };
  }, []);

  const handleCopyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(label);
    setTimeout(() => setCopiedScript(null), 2500);
  };

  const handleToggleMetric = async (targetId: string, metricName: string) => {
    let nextMetrics: string[] = [];
    const updated = activeTargets.map((t) => {
      if (t.id === targetId) {
        const current = t.selectedMetrics || [];
        const exists = current.includes(metricName);
        nextMetrics = exists
          ? current.filter((m) => m !== metricName)
          : [...current, metricName];
        return { ...t, selectedMetrics: nextMetrics };
      }
      return t;
    });

    setActiveTargets(updated);
    localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(updated));

    // Save to Firestore & backend in background
    try {
      await updateTargetInDb(
        targetId,
        { selectedMetrics: nextMetrics },
        'toggle_metric',
        `Metrik diperbarui pada target ${targetId}: ${nextMetrics.join(', ')}`
      );
    } catch (err) {
      console.warn('[Firestore] Toggle metric db update error:', err);
    }
  };

  const handleAddCustomTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName || !newEndpoint) return;

    const formattedEndpoint = newEndpoint.startsWith('http://') || newEndpoint.startsWith('https://')
      ? newEndpoint
      : `http://${newEndpoint}`;

    const hostPart = formattedEndpoint.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const defaultMetrics = getModuleDefaultMetrics(newModule, newJobName);

    const newTargetItem: PrometheusTarget = {
      id: `tgt-${Date.now()}`,
      job: newJobName,
      endpoint: formattedEndpoint,
      instanceIp: hostPart,
      state: newState,
      labels: { instance: hostPart, job: newJobName },
      lastScrape: newState === 'UP' ? '5.120s ago' : 'Never (Exporter Pending)',
      scrapeDuration: newState === 'UP' ? '12.4ms' : '0ms',
      mappedModule: newModule,
      mappedNodeName: newNodeName || `${newJobName.toUpperCase()} Target Server`,
      selectedMetrics: defaultMetrics,
      exporterType: 'Custom Prometheus Exporter',
      installedOnTarget: newState === 'UP'
    };

    const nextList = [newTargetItem, ...activeTargets];
    setActiveTargets(nextList);
    localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(nextList));
    localStorage.setItem('netwatch_prometheus_targets', JSON.stringify(nextList));
    setNewJobName('');
    setNewEndpoint('');
    setNewNodeName('');
    setShowAddModal(false);

    // Save to Firestore & backend
    try {
      await saveTargetToDb(newTargetItem);
      await fetch('/api/prometheus/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: nextList }),
      });
      window.dispatchEvent(new CustomEvent('omniguard:targets-updated', { detail: nextList }));
    } catch (err) {
      console.warn('[Firestore] Add target db save error:', err);
    }
  };

  const handleSaveEditedTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;

    const updatedList = activeTargets.map((t) =>
      t.id === editingTarget.id ? editingTarget : t
    );
    setActiveTargets(updatedList);
    localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(updatedList));
    localStorage.setItem('netwatch_prometheus_targets', JSON.stringify(updatedList));

    const targetToSave = { ...editingTarget };
    setEditingTarget(null);

    // Non-blocking sync to Firestore & backend server
    try {
      await updateTargetInDb(
        targetToSave.id,
        targetToSave,
        'edit_target_ip_config',
        `Konfigurasi target diperbarui: ${targetToSave.job} (${targetToSave.endpoint})`
      );
      await fetch('/api/prometheus/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: updatedList }),
      });
      window.dispatchEvent(new CustomEvent('omniguard:targets-updated', { detail: updatedList }));
      window.dispatchEvent(new CustomEvent('netwatch:targets-updated', { detail: updatedList }));
    } catch (err) {
      console.error('Failed to sync edited target to DB:', err);
    }
  };

  const handleDeleteTarget = async (targetId: string, targetEndpoint?: string, targetJob?: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus target ini dari integrasi database & dashboard?')) {
      const filtered = activeTargets.filter((t) => {
        const isMatch = targetId ? t.id === targetId : (targetEndpoint && t.endpoint === targetEndpoint);
        return !isMatch;
      });
      setActiveTargets(filtered);
      localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(filtered));
      localStorage.setItem('netwatch_prometheus_targets', JSON.stringify(filtered));

      try {
        await deleteTargetFromDb(targetId, targetJob || targetEndpoint);
        await fetch('/api/prometheus/targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets: filtered }),
        });
        window.dispatchEvent(new CustomEvent('omniguard:targets-updated', { detail: filtered }));
        window.dispatchEvent(new CustomEvent('netwatch:targets-updated', { detail: filtered }));
      } catch (err) {
        console.warn('[Firestore] Delete target db error:', err);
      }
    }
  };

  const handleTogglePauseTarget = async (targetId: string, targetEndpoint?: string) => {
    const pausedMap = getStoredPausedMap();
    let nextIsPaused = false;
    let nextState: 'UP' | 'DOWN' | 'PENDING_INSTALL' = 'UP';
    let targetJob = '';

    const updated = activeTargets.map((t) => {
      const isMatch = targetId ? t.id === targetId : (targetEndpoint && t.endpoint === targetEndpoint);
      if (isMatch) {
        nextIsPaused = !(t.isPaused === true);
        nextState = nextIsPaused ? 'DOWN' : 'UP';
        targetJob = t.job || t.id;

        // Update persistent paused map strictly per target id and job
        if (nextIsPaused) {
          if (t.id) pausedMap[t.id] = true;
          if (t.job) pausedMap[t.job] = true;
        } else {
          if (t.id) delete pausedMap[t.id];
          if (t.job) delete pausedMap[t.job];
          if (t.endpoint) delete pausedMap[t.endpoint];
          // Also clear any targetId variations
          delete pausedMap[targetId];
          delete pausedMap[`tgt-${targetId}`];
        }

        return {
          ...t,
          state: nextState,
          isPaused: nextIsPaused,
          healthReason: nextIsPaused ? 'Dijeda oleh pengguna dari Target Manager (Paused)' : undefined,
          lastScrape: nextIsPaused ? 'Paused / Stopped' : '1.2s ago',
        };
      }
      return t;
    });

    localStorage.setItem('omniguard_paused_endpoints_map', JSON.stringify(pausedMap));
    setActiveTargets(updated);
    localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(updated));
    localStorage.setItem('netwatch_prometheus_targets', JSON.stringify(updated));

    // Sync with Firestore & backend & broadcast event
    try {
      updateTargetInDb(
        targetId,
        { isPaused: nextIsPaused, state: nextState },
        nextIsPaused ? 'pause_target' : 'resume_target',
        `Target ${targetJob} (${targetEndpoint || targetId}) ${nextIsPaused ? 'DIJEDA' : 'DIAKTIFKAN KEMBALI'}`
      ).catch((err) => console.warn('Hub target sync notice:', err));

      fetch('/api/prometheus/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: updated }),
      }).catch((err) => console.warn('Local targets sync notice:', err));

      window.dispatchEvent(new CustomEvent('omniguard:targets-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('netwatch:targets-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('omniguard:target-paused-changed', {
        detail: { targetId, targetEndpoint, targets: updated }
      }));
    } catch (e) {
      console.warn('Target state broadcast notice:', e);
    }
  };

  // Main Action: Run & Apply All Targets to Dashboard
  const handleApplyToAllDashboards = async () => {
    setSaving(true);
    try {
      // 1. Save to LocalStorage
      localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(activeTargets));

      // 2. Save all targets to Firestore atomically (Single WriteBatch to avoid snapshot storm)
      await saveTargetsBatchToDb(
        activeTargets,
        'apply_all_dashboards',
        'Sinkronisasi menyeluruh konfigurasi target ke seluruh sub-dashboard'
      );

      // 3. Save to Backend Endpoint
      await fetch('/api/prometheus/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: activeTargets }),
      });

      // 4. Dispatch Custom Window Event for real-time app update
      window.dispatchEvent(
        new CustomEvent('omniguard:targets-updated', { detail: activeTargets })
      );
      window.dispatchEvent(
        new CustomEvent('netwatch:targets-updated', { detail: activeTargets })
      );

      // 5. Show success banner
      setApplySuccessBanner(true);
      setTimeout(() => setApplySuccessBanner(false), 5000);
    } catch (err) {
      console.error('Failed to apply targets:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetTo11CampusTargets = async () => {
    if (
      !window.confirm(
        'Apakah Anda yakin ingin mereset seluruh daftar target ke 11 job resmi Prometheus Kampus (MikroTik, CrowdSec, Proxmox Dekanat/Simlitabmas/Teknik/Lab-TI, Node Exporter, Nginx, Uptime Kuma, Blackbox)?'
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const targets = await resetHubDefaultSeeds();
      setActiveTargets(targets);
      localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(targets));
      localStorage.setItem('netwatch_prometheus_targets', JSON.stringify(targets));
      setApplySuccessBanner(true);
      setTimeout(() => setApplySuccessBanner(false), 5000);
    } catch (err: any) {
      alert(`Gagal mereset target: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncRealPrometheus = async () => {
    let cleanTarget = promHost.trim();
    if (!cleanTarget) {
      setSyncErrorBanner('Harap masukkan alamat IP atau URL Server Prometheus (contoh: http://192.168.77.30:9090).');
      return;
    }

    if (!cleanTarget.startsWith('http://') && !cleanTarget.startsWith('https://')) {
      cleanTarget = `http://${cleanTarget}`;
    }
    try {
      const u = new URL(cleanTarget);
      cleanTarget = `${u.protocol}//${u.host}`;
    } catch {
      cleanTarget = cleanTarget
        .replace(/\/classic.*$/i, '')
        .replace(/\/targets.*$/i, '')
        .replace(/\/graph.*$/i, '')
        .replace(/\/api.*$/i, '')
        .replace(/\/+$/, '');
    }
    setPromHost(cleanTarget);

    setLoading(true);
    setSyncErrorBanner(null);
    setSyncSuccessMsg(null);

    try {
      const res = await fetch('/api/prometheus/sync-live-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promHost: cleanTarget }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'Backend server belum me-restart file server baru (masih proses lama). Silakan jalankan perintah restart di terminal Ubuntu.'
        );
      }

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.promHost) {
          setPromHost(data.promHost);
        }
        const normalized = normalizeTargetList(data.activeTargets || []);
        setActiveTargets(normalized);
        localStorage.setItem('omniguard_prometheus_targets', JSON.stringify(normalized));
        localStorage.setItem('netwatch_prometheus_targets', JSON.stringify(normalized));
        setSyncSuccessMsg(
          data.message || `Berhasil terhubung ke ${data.promHost}! Menampilkan ${normalized.length} target riil.`
        );
        setApplySuccessBanner(true);
        setTimeout(() => setApplySuccessBanner(false), 8000);
      } else {
        setSyncErrorBanner(
          data.error || `Gagal menghubungi Prometheus di ${cleanTarget}. Pastikan port 9090 dapat diakses.`
        );
      }
    } catch (err: any) {
      setSyncErrorBanner(`Gagal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanSlate = async () => {
    if (
      !window.confirm(
        'Bersihkan seluruh data dummy, audit log sampel, dan cache simulasi?\n\nSistem akan beralih ke Mode Bersih (Clean Slate Production) dan siap membaca 100% telemetri riil dari server/router lokal Anda.'
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/system/clean-dummy-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preserveTargets: true }),
      });
      const data = await res.json();
      if (data.success) {
        setApplySuccessBanner(true);
        setTimeout(() => setApplySuccessBanner(false), 6000);
        await fetchTargets();
      } else {
        alert(data.error || 'Gagal membersihkan data dummy');
      }
    } catch (err: any) {
      alert(`Gagal terhubung ke backend: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPrometheusYaml = () => {
    window.location.href = '/api/hub/prometheus/scrape-config';
  };

  const executePromQlTest = () => {
    setPromQlResult('Querying Prometheus TSDB engine...');
    setTimeout(() => {
      setPromQlResult(
        `[PromQL SUCCESS 200 OK]\nMetric: ${promQlQuery}\nTimestamp: ${new Date().toLocaleTimeString()}\nValue: {instance="192.168.77.30:9090", job="node"} => 0.042 (4.2% CPU load average)`
      );
    }, 600);
  };

  const filteredTargets = activeTargets.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.job.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.mappedNodeName && t.mappedNodeName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesModule =
      selectedModuleFilter === 'all' || t.mappedModule === selectedModuleFilter;

    const matchesState =
      selectedStateFilter === 'all' || t.state === selectedStateFilter;

    return matchesSearch && matchesModule && matchesState;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Apply Control */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Manajemen Target IP, Port & Metrik Prometheus
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold">
                  SINKRONISASI OTOMATIS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ubah IP, Port, atau tambah server target secara manual. Klik tombol <strong className="text-orange-300">Run & Terapkan</strong> untuk menyesuaikan seluruh tampilan dashboard secara instan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Realtime Database Sync status badge */}
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300 font-bold">DB:</span>
              </div>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                SQLite 3 Native
              </span>
            </div>

            {/* Audit Logs button */}
            <button
              onClick={() => setShowAuditModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Lihat riwayat perubahan IP, penjedaan, dan konfigurasi target di Database"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Riwayat Audit</span>
              {auditLogs.length > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 rounded-full text-[9px] font-bold">
                  {auditLogs.length}
                </span>
              )}
            </button>

            {/* Download prometheus.yml */}
            <button
              onClick={handleDownloadPrometheusYaml}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Unduh file konfigurasi scrape prometheus.yml berdasarkan target aktif saat ini"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export prometheus.yml</span>
            </button>

            {/* Reset 12 Targets */}
            <button
              onClick={handleResetTo11CampusTargets}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-rose-900/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Reset ke 12 job target default resmi Prometheus Kampus"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reset 12 Target Kampus</span>
            </button>

            {/* Clean Slate Button */}
            <button
              onClick={handleCleanSlate}
              className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Bersihkan seluruh data dummy, log sampel, dan cache simulasi untuk mulai dari nol"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>🧹 Bersihkan Data Dummy</span>
            </button>

            {/* Add Target Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tambah Target Manual</span>
            </button>

            {/* Clean Solid Action Button */}
            <button
              onClick={handleApplyToAllDashboards}
              disabled={saving}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-2 shadow-md shadow-amber-900/30 transition border border-amber-500/40"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'MENERAPKAN...' : 'TERAPKAN KE SEMUA DASHBOARD'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner when "Run & Apply" or "Sync" is clicked */}
        {applySuccessBanner && (
          <div className="bg-emerald-950/90 border border-emerald-500/50 rounded-xl p-3.5 text-xs text-emerald-200 flex items-center justify-between gap-3 animate-fade-in shadow-lg">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>Berhasil Terhubung!</strong> {syncSuccessMsg || `Seluruh tampilan dashboard telah otomatis disesuaikan berdasarkan target riil aktif dari Prometheus (${activeTargets.length} Total Target).`}
              </span>
            </div>
            <button
              onClick={() => {
                setApplySuccessBanner(false);
                setSyncSuccessMsg(null);
              }}
              className="text-emerald-400 hover:text-white font-bold text-sm px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sync Error Banner */}
        {syncErrorBanner && (
          <div className="bg-rose-950/95 border border-rose-500/60 rounded-xl p-3.5 text-xs text-rose-200 flex items-center justify-between gap-3 animate-fade-in shadow-xl">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300">Gagal Mengambil Target:</strong> {syncErrorBanner}
                <div className="text-[11px] text-rose-400/80 mt-1">
                  💡 <em>Solusi:</em> Pastikan IP dan Port 9090 Prometheus benar, service aktif (<code className="bg-rose-900/60 px-1 rounded text-rose-200">systemctl status prometheus</code>), dan port 9090 diizinkan di firewall (<code className="bg-rose-900/60 px-1 rounded text-rose-200">sudo ufw allow 9090</code>).
                </div>
              </div>
            </div>
            <button
              onClick={() => setSyncErrorBanner(null)}
              className="text-rose-400 hover:text-white font-bold text-sm px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* IP Endpoint Config & Live Sync Status */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 shadow-inner">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
            <span className="text-xs text-slate-300 font-semibold font-mono whitespace-nowrap flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              Server Prometheus:
            </span>
            <input
              type="text"
              value={promHost}
              onChange={(e) => setPromHost(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSyncRealPrometheus();
                }
              }}
              className="bg-slate-900 border border-slate-700/80 focus:border-orange-500 text-orange-300 font-mono text-xs rounded-xl px-3 py-1.5 w-full md:w-80 focus:outline-none focus:ring-1 focus:ring-orange-500/50 shadow-inner"
              placeholder="http://192.168.77.30:9090"
              title="Ketik URL/IP Prometheus Anda, lalu klik 'Panggil Target Riil' atau tekan Enter"
            />
            <button
              onClick={handleSyncRealPrometheus}
              disabled={loading}
              className="px-3.5 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition shadow-md shadow-orange-900/30 disabled:opacity-50 cursor-pointer"
              title="Hubungi server Prometheus di IP ini dan ambil seluruh target riil yang aktif"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menghubungi...' : '⚡ Panggil Target Riil'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/50 px-2.5 py-1 rounded-lg border border-cyan-800/50">
              <span className="font-bold text-sm text-cyan-200">{activeTargets.length}</span>
              <span className="text-slate-400">Total Target Riil</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-800/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeTargets.filter((t) => t.state === 'UP').length} UP</span>
            </div>
            {activeTargets.filter((t) => t.state === 'DOWN').length > 0 && (
              <div className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-800/60">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{activeTargets.filter((t) => t.state === 'DOWN').length} DOWN</span>
              </div>
            )}
            {activeTargets.filter((t) => t.state === 'PENDING_INSTALL').length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-800/40">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{activeTargets.filter((t) => t.state === 'PENDING_INSTALL').length} Pending</span>
              </div>
            )}
            <a
              href={`${promHost.replace(/\/+$/, '')}/targets`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 ml-1"
              title="Buka UI native Prometheus di tab baru"
            >
              Classic UI <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Target Job, Endpoint, atau IP..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Module Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
            <span className="text-[11px] text-slate-400 font-mono pl-1">Modul Dashboard:</span>
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Semua Modul</option>
              <option value="mikrotik" className="bg-slate-900">MikroTik Router</option>
              <option value="server" className="bg-slate-900">Server & Proxmox VM</option>
              <option value="waf" className="bg-slate-900">Nginx WAF / CrowdSec</option>
              <option value="website" className="bg-slate-900">Blackbox / Website</option>
            </select>
          </div>

          {/* Target State Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
            <span className="text-[11px] text-slate-400 font-mono pl-1">Status Exporter:</span>
            <select
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Semua Status</option>
              <option value="UP" className="bg-slate-900">UP (Aktif Scrape)</option>
              <option value="PENDING_INSTALL" className="bg-slate-900">PENDING_INSTALL (Perlu Exporter)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Target Exporter Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTargets.map((target, idx) => (
          <div
            key={target.id || `tgt-${idx}`}
            className={`bg-slate-900/90 border rounded-2xl p-4 space-y-3 transition relative overflow-hidden flex flex-col justify-between ${
              target.state === 'UP'
                ? 'border-slate-800 hover:border-emerald-500/50'
                : target.state === 'DOWN'
                ? 'border-rose-500/60 bg-rose-950/20 hover:border-rose-400'
                : 'border-amber-500/40 bg-slate-900/95'
            }`}
          >
            <div className="space-y-2">
              {/* Job Header & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      target.state === 'UP'
                        ? 'bg-emerald-400'
                        : target.state === 'DOWN'
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-bold text-sm text-slate-100 font-mono truncate max-w-[150px]">
                    {target.job}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      target.isPaused
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : target.state === 'UP'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : target.state === 'DOWN'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {target.isPaused ? 'PAUSED' : target.state}
                  </span>
                  
                  <button
                    onClick={() => handleDeleteTarget(target.id, target.endpoint)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                    title="Hapus Target"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Endpoint & Instance Details */}
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-cyan-300 font-bold truncate">{target.endpoint}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Instance IP: <span className="text-slate-200">{target.labels.instance || 'localhost'}</span></span>
                  <span>Scrape: <span className="text-slate-200">{target.scrapeDuration}</span></span>
                </div>
              </div>

              {target.state === 'DOWN' && target.healthReason && (
                <div className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-800/50 p-1.5 rounded-lg font-mono truncate" title={target.healthReason}>
                  <span className="font-bold">Reason:</span> {target.healthReason}
                </div>
              )}

              {/* Mapped Dashboard Module & Node Name */}
              <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px]">Modul Target:</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase font-bold">
                  {target.mappedModule || 'server'}
                </span>
              </div>

              {/* Selected Metrics Chips */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>Metrik PromQL Diambil:</span>
                    <button
                      onClick={() => setSelectedDocTarget(target)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 text-[10px] font-mono transition shadow-sm"
                      title="Buka Popup Dokumentasi Lengkap Metrik Target Ini"
                    >
                      <BookOpen className="w-2.5 h-2.5" />
                      <span>Dokumentasi</span>
                    </button>
                  </div>
                  <span className="text-cyan-400 text-[10px] font-mono">
                    {target.selectedMetrics?.length || 0} Metrik
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {(target.selectedMetrics || getModuleDefaultMetrics(target.mappedModule, target.job)).map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInspectingMetric({ metricName: m, target })}
                      className="px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 font-mono text-[10px] flex items-center gap-1 border border-cyan-700/60 hover:border-cyan-400 transition cursor-pointer shadow-sm active:scale-95 group"
                      title={`Klik untuk melihat detail & dokumentasi metrik ${m}`}
                    >
                      <span className="group-hover:text-cyan-100">{m}</span>
                      <span className="text-emerald-400 font-bold">✓</span>
                      <Info className="w-2.5 h-2.5 text-cyan-400/70 group-hover:text-cyan-200 ml-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
              <button
                onClick={() => setEditingTarget(target)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit IP</span>
              </button>

              <button
                onClick={() => handleTogglePauseTarget(target.id, target.endpoint)}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition border ${
                  target.isPaused
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                    : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-700/60'
                }`}
                title={target.isPaused ? 'Lanjutkan Scrape Metrik' : 'Jeda / Hentikan Scrape Metrik'}
              >
                {target.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Lanjutkan</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Jeda</span>
                  </>
                )}
              </button>

              {target.state === 'PENDING_INSTALL' && (
                <button
                  onClick={() => setGuideTarget(target)}
                  className="py-1.5 px-2.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                  title="Panduan Install Exporter"
                >
                  <Terminal className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Edit Existing Target */}
      {editingTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditedTarget}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-orange-400" />
                <span>Edit Target Exporter & IP / Port</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Nama Job (Job Name):</label>
                <input
                  type="text"
                  required
                  value={editingTarget.job}
                  onChange={(e) => setEditingTarget({ ...editingTarget, job: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Metrics Endpoint URL (IP & Port Target):</label>
                <input
                  type="text"
                  required
                  value={editingTarget.endpoint}
                  onChange={(e) =>
                    setEditingTarget({
                      ...editingTarget,
                      endpoint: e.target.value,
                      labels: { ...editingTarget.labels, instance: e.target.value.replace(/^https?:\/\//, '').replace(/\/.*$/, '') }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-orange-300 font-bold focus:outline-none focus:border-orange-500"
                  placeholder="http://192.168.77.100:9100/metrics"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nama Node / Host di Dashboard:</label>
                <input
                  type="text"
                  value={editingTarget.mappedNodeName || ''}
                  onChange={(e) => setEditingTarget({ ...editingTarget, mappedNodeName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  placeholder="misal: PVE-Node-01 Master Host"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Modul Dashboard:</label>
                  <select
                    value={editingTarget.mappedModule || 'server'}
                    onChange={(e: any) => {
                      const newMod = e.target.value;
                      const currentMetrics = editingTarget.selectedMetrics || [];
                      const defaultPreset = getModuleDefaultMetrics(newMod, editingTarget.job);
                      // Merge preset if current is empty or generic
                      const nextMetrics = currentMetrics.length === 0 ? defaultPreset : currentMetrics;
                      setEditingTarget({ ...editingTarget, mappedModule: newMod, selectedMetrics: nextMetrics });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="server">Server & Proxmox VM</option>
                    <option value="mikrotik">MikroTik RouterOS</option>
                    <option value="waf">Nginx WAF / CrowdSec</option>
                    <option value="website">Website & Blackbox Probe</option>
                    <option value="system">Prometheus Engine System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Status Exporter:</label>
                  <select
                    value={editingTarget.state}
                    onChange={(e: any) => setEditingTarget({ ...editingTarget, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="UP">UP (Scrape Aktif)</option>
                    <option value="PENDING_INSTALL">PENDING_INSTALL (Pending Exporter)</option>
                  </select>
                </div>
              </div>

              {/* Custom & Preset Metrics Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-semibold text-xs">Pilih Metrik PromQL untuk Sub-Dashboard:</label>
                
                {/* Active Selected Metrics Tags */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800 min-h-[42px] items-center">
                  {(editingTarget.selectedMetrics || []).length === 0 && (
                    <span className="text-slate-500 text-[11px] italic">Belum ada metrik dipilih. Pilih rekomendasi di bawah atau ketik metrik custom.</span>
                  )}
                  {(editingTarget.selectedMetrics || []).map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-mono text-[11px] flex items-center gap-1.5"
                    >
                      <span>{m}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (editingTarget.selectedMetrics || []).filter((x) => x !== m);
                          setEditingTarget({ ...editingTarget, selectedMetrics: next });
                        }}
                        className="text-rose-400 hover:text-rose-300 font-bold ml-1"
                        title="Hapus Metrik"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* Preset Suggestions based on selected module */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Rekomendasi Metrik Modul ({editingTarget.mappedModule || 'server'}):</span>
                  <div className="flex flex-wrap gap-1">
                    {getModuleDefaultMetrics(editingTarget.mappedModule || 'server', editingTarget.job).map((preset) => {
                      const isSelected = (editingTarget.selectedMetrics || []).includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const current = editingTarget.selectedMetrics || [];
                            const next = isSelected
                              ? current.filter((x) => x !== preset)
                              : [...current, preset];
                            setEditingTarget({ ...editingTarget, selectedMetrics: next });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                            isSelected
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/80 font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {preset} {isSelected ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Metric Input Field */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customMetricInput}
                    onChange={(e) => setCustomMetricInput(e.target.value)}
                    placeholder="misal: container_cpu_usage_seconds_total"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customMetricInput.trim()) return;
                      const metricName = customMetricInput.trim();
                      const current = editingTarget.selectedMetrics || [];
                      if (!current.includes(metricName)) {
                        setEditingTarget({ ...editingTarget, selectedMetrics: [...current, metricName] });
                      }
                      setCustomMetricInput('');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl font-mono text-xs font-semibold"
                  >
                    + Tambah
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold font-mono"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Custom Target Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddCustomTarget}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <span>Tambah Target Server / Exporter Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Nama Job Target (Job Name):</label>
                <input
                  type="text"
                  required
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  placeholder="misal: pve-node-03 atau mysql-db"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Metrics Endpoint URL / IP & Port Target:</label>
                <input
                  type="text"
                  required
                  value={newEndpoint}
                  onChange={(e) => setNewEndpoint(e.target.value)}
                  placeholder="http://192.168.77.x:9100/metrics"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nama Label Node Server:</label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="misal: Storage Backup Node 02"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Modul Dashboard:</label>
                  <select
                    value={newModule}
                    onChange={(e: any) => setNewModule(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="server">Server & Proxmox VM</option>
                    <option value="mikrotik">MikroTik RouterOS</option>
                    <option value="waf">Nginx WAF / CrowdSec</option>
                    <option value="website">Website & Blackbox Probe</option>
                    <option value="system">Prometheus Engine System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Status Exporter:</label>
                  <select
                    value={newState}
                    onChange={(e: any) => setNewState(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="UP">UP (Scrape Aktif)</option>
                    <option value="PENDING_INSTALL">PENDING_INSTALL (Pending)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold font-mono"
              >
                Simpan Target
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Target Exporter Installation Wizard Modal */}
      {guideTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Panduan Install Exporter: {guideTarget.job}
                </h3>
              </div>
              <button
                onClick={() => setGuideTarget(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Karena target server <strong className="text-orange-300">{guideTarget.job}</strong> belum memiliki Prometheus Exporter aktif, jalankan perintah di bawah ini pada server target (<code className="text-cyan-300 font-mono">{guideTarget.labels.instance || guideTarget.endpoint}</code>):
              </p>

              {/* Command Step 1: Install Node Exporter on Target Server */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-200">
                  <span>1. Perintah Instalasi Exporter di Ubuntu/Debian Server Target:</span>
                  <button
                    onClick={() =>
                      handleCopyCode(
                        `sudo apt update && sudo apt install -y prometheus-node-exporter && sudo systemctl enable --now prometheus-node-exporter`,
                        'cmd1'
                      )
                    }
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[11px] flex items-center gap-1"
                  >
                    {copiedScript === 'cmd1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript === 'cmd1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                  sudo apt update && sudo apt install -y prometheus-node-exporter && sudo systemctl enable --now prometheus-node-exporter
                </div>
              </div>

              {/* Command Step 2: Prometheus.yml configuration snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-200">
                  <span>2. Tambahkan Job ini ke `/etc/prometheus/prometheus.yml` di Server Prometheus (192.168.77.30):</span>
                  <button
                    onClick={() =>
                      handleCopyCode(
                        `  - job_name: '${guideTarget.job}'\n    static_configs:\n      - targets: ['${guideTarget.labels.instance || '192.168.77.x:9100'}']`,
                        'cmd2'
                      )
                    }
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-orange-300 rounded-lg text-[11px] flex items-center gap-1"
                  >
                    {copiedScript === 'cmd2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript === 'cmd2' ? 'Copied' : 'Copy YML'}</span>
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-orange-300 whitespace-pre overflow-x-auto">
{`  - job_name: '${guideTarget.job}'
    static_configs:
      - targets: ['${guideTarget.labels.instance || '192.168.77.x:9100'}']`}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setGuideTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Single Metric Inspector Pop-up Modal */}
      {inspectingMetric && (() => {
        const metricDetail = getMetricDocDetail(inspectingMetric.metricName, inspectingMetric.target);
        const IconComponent = metricDetail.icon || Code;
        const targetMetrics = inspectingMetric.target.selectedMetrics || getModuleDefaultMetrics(inspectingMetric.target.mappedModule, inspectingMetric.target.job);

        return (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-700/50 text-cyan-300">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-100 font-mono text-cyan-300">
                        {metricDetail.name}
                      </h3>
                      <button
                        onClick={() => handleCopyCode(metricDetail.name, 'metric-name')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 text-xs transition"
                        title="Salin Nama Metrik"
                      >
                        {copiedScript === 'metric-name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30">
                        {metricDetail.type}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30">
                        Satuan: {metricDetail.unit}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-sans">
                      {metricDetail.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingMetric(null)}
                  className="text-slate-400 hover:text-slate-200 text-base font-bold p-1.5 rounded-lg hover:bg-slate-800 transition"
                  title="Tutup Popup"
                >
                  ✕
                </button>
              </div>

              {/* Target Context */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Target:</span>
                  <span className="text-slate-200 font-bold">{inspectingMetric.target.job}</span>
                  <span className="text-cyan-400 truncate max-w-[220px]">({inspectingMetric.target.endpoint})</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 text-[10px] font-bold uppercase">
                  Modul: {inspectingMetric.target.mappedModule || 'website'}
                </span>
              </div>

              {/* Deskripsi & Fungsi */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Deskripsi & Fungsi Metrik</span>
                </h4>
                <p className="text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  {metricDetail.description}
                </p>
              </div>

              {/* Nilai Return & Ambang Batas (Thresholds) */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Kondisi Nilai / Ambang Batas (Thresholds)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {metricDetail.thresholdsOrValues.map((tv, idx) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-200">{tv.label}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tv.color}`}>
                          {tv.value}
                        </span>
                      </div>
                      {tv.desc && <p className="text-[11px] text-slate-400">{tv.desc}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* PromQL Query Example */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-cyan-400" />
                    <span>Contoh PromQL Query:</span>
                  </span>
                  <button
                    onClick={() => handleCopyCode(metricDetail.promqlExample, 'promql-metric')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[11px] font-mono flex items-center gap-1 transition"
                  >
                    {copiedScript === 'promql-metric' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript === 'promql-metric' ? 'Tersalin' : 'Salin Query'}</span>
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                  {metricDetail.promqlExample}
                </div>
              </div>

              {/* Label Metadata yang Diekstrak */}
              {metricDetail.labelsExtracted && metricDetail.labelsExtracted.length > 0 && (
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                    <Table className="w-4 h-4 text-indigo-400" />
                    <span>Label Metadata Prometheus yang Diekstrak</span>
                  </h4>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">Nama Label</th>
                          <th className="p-2">Fungsi / Deskripsi</th>
                          <th className="p-2">Contoh Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {metricDetail.labelsExtracted.map((lbl, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="p-2 text-cyan-300 font-bold">{lbl.name}</td>
                            <td className="p-2 text-slate-300 font-sans">{lbl.desc}</td>
                            <td className="p-2 text-emerald-300">{lbl.sample || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Implementasi di Dashboard */}
              <div className="bg-indigo-950/40 border border-indigo-700/50 p-3 rounded-xl space-y-1 text-xs">
                <h5 className="font-bold text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Implementasi pada Sub-Dashboard Website & SSL:</span>
                </h5>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {metricDetail.dashboardUsage}
                </p>
              </div>

              {/* Quick Switcher for other metrics on the same target */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">Pilih Metrik Lain:</span>
                  {targetMetrics.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInspectingMetric({ metricName: m, target: inspectingMetric.target })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold transition border ${
                        m === inspectingMetric.metricName
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      const tgt = inspectingMetric.target;
                      setInspectingMetric(null);
                      setSelectedDocTarget(tgt);
                    }}
                    className="px-3 py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Dokumentasi Lengkap</span>
                  </button>
                  <button
                    onClick={() => setInspectingMetric(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. Full Target Metrics & Integration Documentation Pop-up Modal */}
      {selectedDocTarget && (() => {
        const targetMetrics = selectedDocTarget.selectedMetrics || getModuleDefaultMetrics(selectedDocTarget.mappedModule, selectedDocTarget.job);

        return (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative my-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-300">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-100 font-mono text-indigo-200">
                        Dokumentasi Metrik: {selectedDocTarget.job}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        selectedDocTarget.isPaused
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : selectedDocTarget.state === 'UP'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {selectedDocTarget.isPaused ? 'PAUSED' : selectedDocTarget.state}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-mono">
                      Endpoint: <span className="text-cyan-300">{selectedDocTarget.endpoint}</span> • Modul: <span className="text-indigo-300 uppercase font-bold">{selectedDocTarget.mappedModule || 'website'}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDocTarget(null)}
                  className="text-slate-400 hover:text-slate-200 text-base font-bold p-1.5 rounded-lg hover:bg-slate-800 transition"
                  title="Tutup Dokumentasi"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setDocTab('metrics')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    docTab === 'metrics'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>3 Metrik Inti Uptime Kuma</span>
                </button>
                <button
                  onClick={() => setDocTab('labels')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    docTab === 'labels'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Label Metadata Prometheus</span>
                </button>
                <button
                  onClick={() => setDocTab('derived')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    docTab === 'derived'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Alur & Data Turunan Engine</span>
                </button>
              </div>

              {/* Tab 1: 3 Metrik Inti */}
              {docTab === 'metrics' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs leading-relaxed">
                    Endpoint <code className="text-cyan-300 font-mono font-bold">{selectedDocTarget.endpoint}</code> secara periodik menghasilkan 3 metrik numerik utama yang digunakan secara live di Sub-Dashboard Website & SSL:
                  </div>

                  <div className="space-y-3">
                    {targetMetrics.map((metricName, idx) => {
                      const info = getMetricDocDetail(metricName, selectedDocTarget);
                      const Icon = info.icon || Code;

                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3 hover:border-cyan-500/40 transition"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-mono font-bold text-sm text-cyan-300">
                                  {info.name}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-sans">{info.title}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                                Tipe: {info.type}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono">
                                Satuan: {info.unit}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedDocTarget(null);
                                  setInspectingMetric({ metricName, target: selectedDocTarget });
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-semibold transition flex items-center gap-1"
                              >
                                <span>Rincian</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-slate-300 text-xs">{info.description}</p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            {info.thresholdsOrValues.slice(0, 4).map((th, thIdx) => (
                              <div key={thIdx} className="bg-slate-900/90 p-2 rounded-lg border border-slate-800/80 text-[11px]">
                                <div className="font-mono font-bold text-slate-200">{th.label}</div>
                                <div className="text-slate-400 truncate text-[10px]">{th.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Label Metadata Prometheus */}
              {docTab === 'labels' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs leading-relaxed">
                    Setiap baris metrik pada Prometheus Uptime Kuma menyertakan label-label metadata berikut untuk identifikasi spesifik website/layanan yang dipantau:
                  </div>

                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Nama Label Metadata</th>
                          <th className="p-3">Fungsi & Peranan</th>
                          <th className="p-3">Contoh Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold">monitor_name</td>
                          <td className="p-3 font-sans">Nama instansi, aplikasi, atau nama website kampus yang dipantau</td>
                          <td className="p-3 text-emerald-300 font-sans">"Website FKIP", "Portal PMB"</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold">monitor_type</td>
                          <td className="p-3 font-sans">Protokol pemeriksaan probe ketersediaan</td>
                          <td className="p-3 text-emerald-300">http, https, ping, port, docker</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold">monitor_url</td>
                          <td className="p-3 font-sans">URL lengkap tujuan website untuk pengujian HTTP dan tombol link langsung</td>
                          <td className="p-3 text-emerald-300">https://fkip.unmus.ac.id</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold">monitor_hostname</td>
                          <td className="p-3 font-sans">Hostname atau domain host target yang dievaluasi sertifikat SSL-nya</td>
                          <td className="p-3 text-emerald-300">pmb.unmus.ac.id</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold">monitor_port</td>
                          <td className="p-3 font-sans">Port jaringan layanan yang dipantau</td>
                          <td className="p-3 text-emerald-300">80, 443, 8006</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-3 text-cyan-300 font-bold">monitor_group_name</td>
                          <td className="p-3 font-sans">Kategori grup dari Uptime Kuma untuk otomatis memetakan tab filter</td>
                          <td className="p-3 text-emerald-300 font-sans">"Aplikasi E-Campuz", "Server & PROXMOX"</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Alur & Data Turunan Engine */}
              {docTab === 'derived' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                        <RotateCw className="w-4 h-4 text-cyan-400" />
                        <span>1. Siklus Live Scraping Real-time (3 Detik)</span>
                      </h4>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Sub-dashboard Website & SSL melakukan polling setiap 3 detik ke endpoint proxy backend <code className="text-cyan-300 font-mono">/api/prometheus/uptime-kuma</code>. Seluruh data diuraikan (*parsed*) secara otomatis tanpa membebani browser.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>2. Grafik Heartbeat History (30 Sampel Terakhir)</span>
                      </h4>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Setiap kali metrik <code className="text-cyan-300 font-mono">monitor_status</code> dan <code className="text-cyan-300 font-mono">monitor_response_time</code> diterima, engine menyimpan riwayat bar chart 30 titik status ketersediaan secara lokal per monitor.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                        <Pause className="w-4 h-4 text-amber-400" />
                        <span>3. Kontrol Jeda Terpusat (Target Manager)</span>
                      </h4>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Menekan tombol <strong>[ ⏸ Jeda ]</strong> pada kartu target ini akan langsung menghentikan polling scrape pada Sub-Dashboard Website & SSL seketika dan menyimpan status jeda secara persisten di storage.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedDocTarget(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
                >
                  Tutup Dokumentasi
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. Database Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-300">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <span>Riwayat Audit Konfigurasi Database (SQLite 3)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                      LIVE REALTIME
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mencatat setiap aksi perubahan IP target, metrik yang diambil, jeda/resume, dan penambahan target secara transparan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-200 text-base font-bold p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Audit Log Entries List */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  Belum ada riwayat audit perubahan target yang tercatat di database.
                </div>
              ) : (
                auditLogs.map((log) => {
                  const isPause = log.action === 'pause_target';
                  const isResume = log.action === 'resume_target';
                  const isEdit = log.action === 'edit_target_ip_config';
                  const isDelete = log.action === 'delete_target';
                  const isAdd = log.action === 'create_target';
                  const isMetric = log.action === 'toggle_metric';

                  const badgeColor = isPause
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : isResume
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : isEdit
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : isDelete
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

                  return (
                    <div
                      key={log.id}
                      className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeColor}`}>
                            {log.action.toUpperCase()}
                          </span>
                          <span className="font-mono text-cyan-300 font-bold text-[11px]">
                            {log.targetId ? `Target: ${log.targetId}` : 'Sistem'}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs font-sans">
                          {log.details}
                        </p>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap sm:text-right shrink-0">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) : '-'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Koleksi: <code>prometheus_audit_logs</code></span>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrometheusTargetManager;
