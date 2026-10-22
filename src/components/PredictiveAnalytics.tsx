import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Cpu,
  HardDrive,
  RefreshCw,
  Send,
  HelpCircle,
  FileText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Flame,
  Activity,
  Server,
  Globe,
  Radio,
  Clock,
  Database,
  Layers,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { NodeMetric, PredictiveAnalysisResult } from '../types';

interface PredictiveAnalyticsProps {
  nodes: NodeMetric[];
}

export const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({ nodes }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'server' | 'network' | 'waf' | 'ssl'>('all');
  const [timeHorizon, setTimeHorizon] = useState<'7' | '14' | '30' | '90'>('30');

  const [analysisReport, setAnalysisReport] = useState<{
    overallHealthScore: number;
    criticalPredictions: PredictiveAnalysisResult[];
    aiExecutiveSummary: string;
    preventativeActions: string[];
    wafThreatForecast?: {
      projectedAttacksNext7Days: number;
      primaryThreatVector: string;
      sslExpiryRiskDays: number;
      wafRateLimitRisk: string;
    };
    domainSummaries?: {
      storageRunoutWarning?: string;
      networkBandwidthPeak?: string;
      securityThreatTrend?: string;
      sslExpirationsCount?: number;
    };
  }>({
    overallHealthScore: 86,
    criticalPredictions: [
      {
        nodeId: 'reverseproxy-crowdsec-gateway',
        nodeName: 'NPMPlus & CrowdSec WAF (VM ReverseProxy - PVE Dekanat)',
        domainCategory: 'waf',
        riskScore: 82,
        predictedExhaustionDays: 9,
        predictedFailureType: 'WAF Rate-Limiting & SQLi/XSS Attack Velocity Surge',
        confidence: 91,
        trendDirection: 'increasing',
        anomalySummary: 'Pintu gerbang ReverseProxy memproteksi traffic sebelum menuju backend. Pola request mencurigakan (SQL Injection & Bot probe) diproyeksikan naik +18.4% dalam 7 hari kedepan.',
        recommendedAction: 'Sinkronkan CrowdSec active decisions ke MikroTik RAW Address-List dan optimasi rate-limiting zone di NPMPlus.',
      },
      {
        nodeId: 'mikrotik-ccr1036',
        nodeName: 'MikroTik CCR1036-12G-4S Gateway (192.168.77.1)',
        domainCategory: 'network',
        riskScore: 76,
        predictedExhaustionDays: 18,
        predictedFailureType: 'Trafik Uplink Peak & Beban Tabel NAT Connection State',
        confidence: 86,
        trendDirection: 'increasing',
        anomalySummary: 'Trafik sfp-sfpplus1 WAN Primary mencapai 382 Mbps pada jam sibuk perkuliahan (08:00 - 15:00). Tabel connection tracker menyentuh 48.000 / 65.536 entri.',
        recommendedAction: 'Aktifkan FastTrack hardware acceleration pada RouterOS CCR1036 untuk memotong beban packet forwarding & NAT state table.',
      },
      {
        nodeId: 'pve-dekanat-web',
        nodeName: 'PVE-Server Dekanat / OJS & Web Apps (192.168.77.30)',
        domainCategory: 'server',
        riskScore: 84,
        predictedExhaustionDays: 12,
        predictedFailureType: 'Saturasi Volume Log Disk & Pertumbuhan Database',
        confidence: 94,
        trendDirection: 'increasing',
        anomalySummary: 'Kapasitas penyimpanan log sistem dan VM aktif meningkat +1.2 GB/hari. Tersisa 18% ruang kosong sebelum batas aman 90% tercapai.',
        recommendedAction: 'Jalankan systemd logrotate pada VM Dekanat dan hapus backup kernel lama yang tidak terpakai.',
      },
      {
        nodeId: 'ssl-portal-akademik',
        nodeName: 'SIAKAD & Portal Akademik Kampus (Uptime Kuma)',
        domainCategory: 'ssl',
        riskScore: 65,
        predictedExhaustionDays: 28,
        predictedFailureType: 'Peringatan Jatuh Tempo Sertifikat SSL Let’s Encrypt',
        confidence: 98,
        trendDirection: 'stable',
        anomalySummary: 'Sertifikat SSL Let’s Encrypt akan kedaluwarsa dalam 28 hari ke depan. Waktu respon HTTP rata-rata stabil di 45ms.',
        recommendedAction: 'Verifikasi cron job Certbot auto-renewal di ReverseProxy Dekanat untuk memastikan pembaruan sertifikat berhasil tanpa kendala DNS challenge.',
      },
      {
        nodeId: 'pve-informatika-master',
        nodeName: 'PVE-Informatika (Master Node - 192.168.14.222)',
        domainCategory: 'server',
        riskScore: 18,
        predictedExhaustionDays: 120,
        predictedFailureType: 'Optimal Storage Headroom & Utilisasi RAM Stabil',
        confidence: 96,
        trendDirection: 'stable',
        anomalySummary: 'Kapasitas storage pool (Hardisk2-4 & local-lvm 7.12 TiB) dan beban RAM beroperasi normal (Load ~18%). Alokasi VM stabil dengan performa optimal.',
        recommendedAction: 'Pertahankan snapshot harian otomatis dan pantau utilisasi I/O disk bootdisk VM.',
      },
      {
        nodeId: 'ruijie-gateway-campus',
        nodeName: 'Ruijie Gateway & Reyee AP Cluster',
        domainCategory: 'network',
        riskScore: 54,
        predictedExhaustionDays: 45,
        predictedFailureType: 'Lonjakan Klien Asosiasi Wi-Fi saat Masa Perkuliahan',
        confidence: 82,
        trendDirection: 'increasing',
        anomalySummary: 'Asosiasi perangkat mobile mahasiswa diproyeksikan bertambah +25% pada awal semester baru di gedung kuliah umum.',
        recommendedAction: 'Lakukan penyesuaian transmit power dan band steering 5GHz pada Ruijie Reyee Controller untuk meratakan beban Access Point.',
      },
    ],
    aiExecutiveSummary: 'Kapasitas infrastruktur 3 Node Proxmox VE (Informatika, Dekanat, Teknik), Router MikroTik CCR1036-12G-4S, dan Pintu Gerbang WAF NPMPlus + CrowdSec (VM ReverseProxy Dekanat) beroperasi stabil dengan indeks kesehatan 86/100. Rekomendasi prioritas mencakup penguatan aturan WAF Rate-Limiting terhadap serangan SQLi/Botnet, persiapan alokasi bandwidth masa KRS, serta rotasi log berkala di PVE Dekanat.',
    preventativeActions: [
      'Sinkronisasi IP penyerang berulang dari CrowdSec LAPI Bouncer ke MikroTik RAW Firewall Drop List',
      'Perketat Nginx WAF / NPMPlus rate-limiting zone pada endpoint /login dan /api publik',
      'Deploy FastTrack connection bypass rules pada MikroTik CCR1036-12G-4S Gateway (192.168.77.1)',
      'Verifikasi cronjob Certbot SSL auto-renewal di ReverseProxy untuk sertifikat SIAKAD & OJS',
      'Jalankan pembersihan log berkala (logrotate) pada VM Proxmox Dekanat sebelum menyentuh batas 90%',
    ],
    wafThreatForecast: {
      projectedAttacksNext7Days: 1420,
      primaryThreatVector: 'Automated SQLi Probing & HTTP Flood',
      sslExpiryRiskDays: 28,
      wafRateLimitRisk: 'Moderate (Peak Hours 09:00 - 15:00)',
    },
    domainSummaries: {
      storageRunoutWarning: 'PVE Dekanat disk mencapai 90% dalam 12 hari bila rotasi log tidak dijalankan',
      networkBandwidthPeak: 'Uplink sfp-sfpplus1 diperkirakan menyentuh 382 Mbps saat jam sibuk akademik',
      securityThreatTrend: 'Laju serangan Web Scraper & SQLi diproyeksikan naik +18.4% dalam 7 hari',
      sslExpirationsCount: 2,
    },
  });

  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Dynamic Multi-Horizon Forecast Curve (7, 14, 30, 90 Days)
  const forecastDataMap: Record<'7' | '14' | '30' | '90', any[]> = {
    '7': [
      { point: 'Hari 1', cpu: 42, disk: 72, trafficMbps: 210, wafAttacks: 180 },
      { point: 'Hari 2', cpu: 44, disk: 73, trafficMbps: 230, wafAttacks: 210 },
      { point: 'Hari 3', cpu: 48, disk: 75, trafficMbps: 290, wafAttacks: 260 },
      { point: 'Hari 4', cpu: 46, disk: 76, trafficMbps: 280, wafAttacks: 240 },
      { point: 'Hari 5', cpu: 52, disk: 78, trafficMbps: 340, wafAttacks: 310 },
      { point: 'Hari 6', cpu: 55, disk: 80, trafficMbps: 365, wafAttacks: 350 },
      { point: 'Hari 7', cpu: 58, disk: 82, trafficMbps: 382, wafAttacks: 410 },
    ],
    '14': [
      { point: 'H+1', cpu: 42, disk: 72, trafficMbps: 210, wafAttacks: 180 },
      { point: 'H+3', cpu: 46, disk: 75, trafficMbps: 260, wafAttacks: 240 },
      { point: 'H+6', cpu: 54, disk: 79, trafficMbps: 350, wafAttacks: 330 },
      { point: 'H+9', cpu: 59, disk: 83, trafficMbps: 380, wafAttacks: 450 },
      { point: 'H+12', cpu: 64, disk: 87, trafficMbps: 410, wafAttacks: 580 },
      { point: 'H+14', cpu: 68, disk: 90, trafficMbps: 430, wafAttacks: 670 },
    ],
    '30': [
      { point: 'H+1', cpu: 42, disk: 72, trafficMbps: 210, wafAttacks: 180 },
      { point: 'H+5', cpu: 45, disk: 75, trafficMbps: 240, wafAttacks: 240 },
      { point: 'H+10', cpu: 52, disk: 79, trafficMbps: 310, wafAttacks: 360 },
      { point: 'H+15', cpu: 60, disk: 84, trafficMbps: 380, wafAttacks: 510 },
      { point: 'H+20', cpu: 74, disk: 89, trafficMbps: 420, wafAttacks: 720 },
      { point: 'H+25', cpu: 82, disk: 93, trafficMbps: 460, wafAttacks: 980 },
      { point: 'H+30', cpu: 88, disk: 96, trafficMbps: 490, wafAttacks: 1420 },
    ],
    '90': [
      { point: 'Bulan 1', cpu: 45, disk: 74, trafficMbps: 240, wafAttacks: 320 },
      { point: 'Bulan 2', cpu: 65, disk: 85, trafficMbps: 390, wafAttacks: 890 },
      { point: 'Bulan 3', cpu: 84, disk: 95, trafficMbps: 485, wafAttacks: 1650 },
    ],
  };

  const handleRunAiAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/predictive-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodesData: nodes, timeHorizon }),
      });
      const result = await response.json();
      if (result.data) {
        setAnalysisReport(result.data);
      }
    } catch (err) {
      console.error('AI Predictive Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiagnoseCustomQuery = async (queryText?: string) => {
    const textToSend = queryText || aiPromptInput;
    if (!textToSend) return;
    setIsDiagnosing(true);
    try {
      const response = await fetch('/api/ai/diagnose-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logEntry: { userQuery: textToSend, time: new Date() } }),
      });
      const data = await response.json();
      setAiDiagnosisResult(data.diagnosis || 'Diagnosis completed.');
    } catch (err) {
      setAiDiagnosisResult('Analysis error. Please try again.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const filteredPredictions = analysisReport.criticalPredictions.filter((item) => {
    if (activeCategoryFilter === 'server') {
      return item.domainCategory === 'server' || item.nodeId.includes('pve') || item.nodeName.includes('PVE');
    }
    if (activeCategoryFilter === 'network') {
      return (
        item.domainCategory === 'network' ||
        item.nodeId.includes('mikrotik') ||
        item.nodeName.includes('CCR') ||
        item.nodeName.includes('MikroTik') ||
        item.nodeName.includes('Ruijie')
      );
    }
    if (activeCategoryFilter === 'waf') {
      return (
        item.domainCategory === 'waf' ||
        item.nodeId.includes('waf') ||
        item.nodeName.includes('WAF') ||
        item.nodeName.includes('CrowdSec')
      );
    }
    if (activeCategoryFilter === 'ssl') {
      return (
        item.domainCategory === 'ssl' ||
        item.nodeId.includes('ssl') ||
        item.nodeName.includes('SSL') ||
        item.nodeName.includes('SIAKAD') ||
        item.nodeName.includes('Uptime')
      );
    }
    return true;
  });

  const quickPrompts = [
    'Berapa sisa hari sebelum disk Proxmox Dekanat mencapai kapasitas penuh 90%?',
    'Apakah bandwidth MikroTik 192.168.77.1 cukup untuk masa registrasi KRS mahasiswa?',
    'Sertifikat SSL website mana yang paling cepat kedaluwarsa di Uptime Kuma?',
    'Bagaimana rekomendasi mitigasi serangan SQL Injection dan setting rate-limit di WAF NPMPlus?',
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-cyan-800/40 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-100">AI Predictive Analytics & Capacity Forecast</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Deep Neural Forecast: Prediksi Kapasitas Server Proxmox, Saturasi Bandwidth MikroTik, Ancaman Siber WAF, dan Masa Berlaku SSL
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Time Horizon Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="px-2 text-slate-500 text-[11px] font-mono">Horizon:</span>
            {(['7', '14', '30', '90'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setTimeHorizon(h)}
                className={`px-2.5 py-1 rounded-lg font-mono transition ${
                  timeHorizon === h
                    ? 'bg-cyan-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {h}H
              </button>
            ))}
          </div>

          <button
            onClick={handleRunAiAnalysis}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-cyan-900/30 transition flex items-center space-x-2 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Scanning AI...' : 'Scan Ulang Gemini'}</span>
          </button>
        </div>
      </div>

      {/* 4 DOMAIN PREDICTION OVERVIEW CARDS (Menjawab: "Ini untuk prediksi apa saja?") */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Domain 1: Server Storage & RAM */}
        <div
          onClick={() => setActiveCategoryFilter('server')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeCategoryFilter === 'server'
              ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Server className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
              Proxmox VE
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-100 mt-3">1. Kapasitas Server & Storage</h4>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Prediksi tanggal kepenuhan disk (Runout Date) dan risiko kehabisan RAM/OOM di 3 Node PVE.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Peringatan Terdekat:</span>
            <span className="text-amber-400 font-bold">~12 Hari (Dekanat)</span>
          </div>
        </div>

        {/* Domain 2: Network & WAN Bandwidth */}
        <div
          onClick={() => setActiveCategoryFilter('network')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeCategoryFilter === 'network'
              ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              MikroTik & Ruijie
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-100 mt-3">2. Saturasi Trafik & Gateway</h4>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Prediksi jam sibuk perkuliahan (KRS), saturasi link WAN 192.168.77.1, dan kapasitas tabel NAT.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Puncak Proyeksi:</span>
            <span className="text-amber-400 font-bold">382 Mbps (09:00)</span>
          </div>
        </div>

        {/* Domain 3: WAF & Cyber Security */}
        <div
          onClick={() => setActiveCategoryFilter('waf')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeCategoryFilter === 'waf'
              ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
              NPMPlus + CrowdSec
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-100 mt-3">3. Ancaman Keamanan & WAF</h4>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Proyeksi tren serangan SQL Injection, bot scraper, dan beban zona rate-limiting reverse proxy.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Proyeksi 7 Hari:</span>
            <span className="text-rose-400 font-bold">~1.420 Serangan</span>
          </div>
        </div>

        {/* Domain 4: SSL Certificates & Web SLA */}
        <div
          onClick={() => setActiveCategoryFilter('ssl')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeCategoryFilter === 'ssl'
              ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Uptime Kuma (42 Sites)
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-100 mt-3">4. Masa Berlaku SSL & SLA Web</h4>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Peringatan dini masa berlaku sertifikat SSL (&lt;30 hari) dan prediksi degradasi latensi portal.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">SIAKAD SSL:</span>
            <span className="text-emerald-400 font-bold">28 Hari Tersisa</span>
          </div>
        </div>
      </div>

      {/* Health Score & AI Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Predictive Infrastructure Health</span>
          <div className="relative flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-8 border-cyan-500/20 flex items-center justify-center">
              <span className="text-4xl font-extrabold text-cyan-400 font-mono">{analysisReport.overallHealthScore}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-emerald-400 font-semibold block">Infrastruktur Beroperasi Stabil (Aman)</span>
            <span className="text-[11px] text-slate-400 font-mono block">Evaluasi multi-domain aktif</span>
          </div>
        </div>

        {/* AI Executive Summary & Preventative Action List */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI Executive Summary & Rekomendasi Mitigasi</span>
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
            {analysisReport.aiExecutiveSummary}
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Tindakan Preventif yang Disarankan Gemini</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {analysisReport.preventativeActions.map((action, i) => (
                <div key={i} className="flex items-start space-x-2 text-xs text-slate-200 bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Multi-Horizon Predictive Curve */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span>Proyeksi Tren Kapasitas & Beban Jaringan (Horizon {timeHorizon} Hari)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Pertumbuhan beban CPU Server, Kepenuhan Ruang Penyimpanan Disk (%), dan Trafik Uplink Gateway (Mbps)
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
              ● CPU Server (%)
            </span>
            <span className="text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              ● Disk Storage (%)
            </span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              ● Trafik WAN (Mbps)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastDataMap[timeHorizon]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="point" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="cpu" name="Beban CPU Server (%)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="disk" name="Saturasi Disk (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="trafficMbps" name="Trafik WAN (Mbps)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Critical Predictions Breakdown Grid with Category Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Daftar Prediksi Resiko & Estimasi Batas Waktu (Runout Timeline)</span>
          </h3>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                activeCategoryFilter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua Domain ({analysisReport.criticalPredictions.length})
            </button>
            <button
              onClick={() => setActiveCategoryFilter('server')}
              className={`px-3 py-1 rounded-lg transition ${
                activeCategoryFilter === 'server'
                  ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🖥️ Server & Storage
            </button>
            <button
              onClick={() => setActiveCategoryFilter('network')}
              className={`px-3 py-1 rounded-lg transition ${
                activeCategoryFilter === 'network'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🖧 Jaringan & WAN
            </button>
            <button
              onClick={() => setActiveCategoryFilter('waf')}
              className={`px-3 py-1 rounded-lg transition ${
                activeCategoryFilter === 'waf'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛡️ WAF & Siber
            </button>
            <button
              onClick={() => setActiveCategoryFilter('ssl')}
              className={`px-3 py-1 rounded-lg transition ${
                activeCategoryFilter === 'ssl'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔒 SSL & Web SLA
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPredictions.map((item, idx) => {
            const isWaf = item.domainCategory === 'waf' || item.nodeId.includes('waf');
            const isRouter = item.domainCategory === 'network' || item.nodeId.includes('mikrotik') || item.nodeId.includes('ruijie');
            const isSsl = item.domainCategory === 'ssl' || item.nodeId.includes('ssl');
            const isOptimal = item.riskScore < 40;

            return (
              <div
                key={idx}
                className={`bg-slate-900/90 border rounded-2xl p-5 space-y-3 flex flex-col justify-between transition hover:border-slate-700 ${
                  isWaf
                    ? 'border-rose-500/30 shadow-lg shadow-rose-950/20'
                    : isRouter
                    ? 'border-amber-500/30'
                    : isSsl
                    ? 'border-emerald-500/30'
                    : isOptimal
                    ? 'border-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-100 text-sm leading-tight">{item.nodeName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono whitespace-nowrap border ${
                        item.riskScore > 80
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : item.riskScore > 50
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isOptimal ? `Optimal: ${item.riskScore}/100` : `Risk: ${item.riskScore}/100`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        isWaf
                          ? 'bg-rose-500/20 text-rose-300'
                          : isRouter
                          ? 'bg-amber-500/20 text-amber-300'
                          : isSsl
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {isWaf
                        ? '🛡️ WAF & Security'
                        : isRouter
                        ? '🖧 Network & WAN'
                        : isSsl
                        ? '🔒 SSL Certificate'
                        : '🖥️ Proxmox Server'}
                    </span>
                    {item.predictedExhaustionDays && (
                      <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Timeline: ~{item.predictedExhaustionDays} hari</span>
                      </span>
                    )}
                  </div>

                  <div className={`text-xs font-semibold leading-snug ${isOptimal ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.predictedFailureType}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    {item.anomalySummary}
                  </p>
                </div>

                <div className="text-[11px] text-cyan-400 font-medium pt-2 border-t border-slate-800/60">
                  ⚡ Rekomendasi: {item.recommendedAction}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gemini AI Incident Diagnostic Assistant & Quick Questions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-slate-100">Tanya AI Copilot Prediktif (Gemini 3.8 Flash)</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Konsultasi Kapasitas & Mitigasi Otomatis</span>
        </div>

        {/* Quick Question Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-400 flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pilih pertanyaan cepat:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiPromptInput(q);
                  handleDiagnoseCustomQuery(q);
                }}
                className="text-left text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 px-3 py-1.5 rounded-xl border border-slate-800 transition flex items-center space-x-1.5"
              >
                <span>{q}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500" />
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDiagnoseCustomQuery();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Tulis pertanyaan prediksi lainnya, misal: 'Bagaimana tren penggunaan RAM Proxmox Informatika jika menambah 3 VM baru?'"
            value={aiPromptInput}
            onChange={(e) => setAiPromptInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            type="submit"
            disabled={isDiagnosing}
            className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>{isDiagnosing ? 'Menganalisis...' : 'Kirim'}</span>
          </button>
        </form>

        {aiDiagnosisResult && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 whitespace-pre-line leading-relaxed font-mono">
            {aiDiagnosisResult}
          </div>
        )}
      </div>
    </div>
  );
};
