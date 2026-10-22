import React, { useState } from 'react';
import {
  BookOpen,
  GitBranch,
  Terminal,
  Server,
  Key,
  ShieldCheck,
  Code,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  Layers,
} from 'lucide-react';

export const TechDocsAndGuide: React.FC = () => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopy = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            Panduan Pengembang & Dokumentasi Teknis
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Arsitektur sistem OmniGuard-Live, perintah Git repository, spesifikasi REST API, serta konfigurasi environment.
          </p>
        </div>

        <a
          href="https://github.com/Alulanasyauq1mikazea/NetWach"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition flex items-center gap-2 border border-slate-700 hover:border-cyan-500/50"
        >
          <GitBranch className="w-4 h-4 text-cyan-400" /> GitHub Repository <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Quick Repository Clone & Setup Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" /> 1. Quickstart - Clone & Local Setup
        </h2>

        <div className="space-y-3 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-cyan-400">git clone https://github.com/Alulanasyauq1mikazea/NetWach.git</span>
            <button
              onClick={() => handleCopy('git clone https://github.com/Alulanasyauq1mikazea/NetWach.git', 'clone')}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
            >
              {copiedCmd === 'clone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-emerald-400">cd NetWach && npm install && npm run dev</span>
            <button
              onClick={() => handleCopy('cd NetWach && npm install && npm run dev', 'run')}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
            >
              {copiedCmd === 'run' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4" /> Frontend Engine
          </div>
          <h3 className="text-sm font-bold text-slate-100">React 19 + Vite + Tailwind v4</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Antarmuka kustom cepat, visualisasi data berbasis Recharts, animasi Tailwind CSS, dan komponen terisolasi.
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
            <Server className="w-4 h-4" /> Backend & Ingestion
          </div>
          <h3 className="text-sm font-bold text-slate-100">Express Node.js + tsx</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            API Gateway bawaan untuk penanganan proxy REST, sinkronisasi Prometheus, serta integrasi alert Telegram Bot.
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" /> AI Analytics Engine
          </div>
          <h3 className="text-sm font-bold text-slate-100">Google Gemini API 2.5</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Prediksi anomali lalu lintas, perhitungan estimasi kehabisan disk, dan rekomendasi optimasi keamanan secara otomatis.
          </p>
        </div>
      </div>

      {/* API Reference Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" /> 2. Spesifikasi REST API Endpoints
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Endpoint Path</th>
                <th className="py-2.5 px-3">Deskripsi / Fungsi</th>
                <th className="py-2.5 px-3">Auth Header</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-400">GET</td>
                <td className="py-2.5 px-3 text-cyan-400">/api/v1/telemetry</td>
                <td className="py-2.5 px-3">Mengambil data telemetri real-time bandwidth & latency</td>
                <td className="py-2.5 px-3 text-slate-500">X-API-KEY</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-400">GET</td>
                <td className="py-2.5 px-3 text-cyan-400">/api/v1/mikrotik/status</td>
                <td className="py-2.5 px-3">Mengambil telemetri RouterOS, DHCP, & Interface</td>
                <td className="py-2.5 px-3 text-slate-500">X-API-KEY</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-cyan-400">POST</td>
                <td className="py-2.5 px-3 text-cyan-400">/api/alerts/test-telegram</td>
                <td className="py-2.5 px-3">Mengirim notifikasi tes langsung ke bot Telegram</td>
                <td className="py-2.5 px-3 text-slate-500">Session Auth</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-cyan-400">POST</td>
                <td className="py-2.5 px-3 text-cyan-400">/api/predictive/analyze</td>
                <td className="py-2.5 px-3">Memicu analisis kehabisan disk dengan Gemini AI</td>
                <td className="py-2.5 px-3 text-slate-500">Session Auth</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
