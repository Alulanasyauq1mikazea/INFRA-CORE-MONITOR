import React, { useState, useEffect } from 'react';
import { ServerConfig } from '../types';
import { DataSourcesManager } from './DataSourcesManager';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Copy, 
  Database, 
  Play, 
  Radio, 
  Cpu, 
  ShieldCheck, 
  Clock, 
  Server, 
  Terminal, 
  Eye, 
  EyeOff, 
  FileCode, 
  FolderDown,
  ExternalLink,
  Layers,
  Plus,
  ArrowRight
} from 'lucide-react';

interface ConfigManagerTabProps {
  initialConfig?: ServerConfig;
  onConfigSaved?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ConfigManagerTab: React.FC<ConfigManagerTabProps> = ({ initialConfig, onConfigSaved, onNavigateTab }) => {
  const [config, setConfig] = useState<ServerConfig | null>(initialConfig || null);
  const [activeSubtab, setActiveSubtab] = useState<'datasources' | 'form' | 'tester' | 'raw' | 'sqlite' | 'deploy'>('datasources');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Endpoint Tester State
  const [testTarget, setTestTarget] = useState<'prometheus' | 'mikrotik' | 'crowdsec' | 'uptimeKuma' | 'proxmox' | 'custom'>('prometheus');
  const [testUrl, setTestUrl] = useState('');
  const [testAuthType, setTestAuthType] = useState<'none' | 'basic' | 'bearer' | 'apiKey'>('none');
  const [testUsername, setTestUsername] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testToken, setTestToken] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // SQLite Raw Query Explorer
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM collector_status;');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Show/Hide password toggles
  const [showMktPass, setShowMktPass] = useState(false);
  const [showCrowdKey, setShowCrowdKey] = useState(false);
  const [showPveSecret, setShowPveSecret] = useState(false);

  // Fetch current config from server
  const fetchCurrentConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (!testUrl && data.prometheus?.endpoint) {
          setTestUrl(data.prometheus.endpoint);
        }
      }
    } catch (err: any) {
      setErrorMessage('Failed to load server configuration: ' + err.message);
    }
  };

  useEffect(() => {
    fetchCurrentConfig();
  }, []);

  const handleSaveConfig = async (configToSave = config) => {
    if (!configToSave) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        if (onConfigSaved) onConfigSaved();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to update configuration');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunEndpointTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const authPayload: any = {};
      if (testAuthType === 'basic') {
        authPayload.username = testUsername;
        authPayload.password = testPassword;
      } else if (testAuthType === 'bearer') {
        authPayload.token = testToken;
      } else if (testAuthType === 'apiKey') {
        authPayload.apiKey = testToken;
      }

      const res = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: testTarget,
          url: testUrl,
          auth: authPayload,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunSqlQuery = async () => {
    setIsExecutingSql(true);
    setSqlError(null);
    try {
      const res = await fetch('/api/sqlite/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery }),
      });
      const data = await res.json();
      if (res.ok) {
        setQueryResult(data);
      } else {
        setSqlError(data.error || 'Query failed');
      }
    } catch (err: any) {
      setSqlError(err.message);
    } finally {
      setIsExecutingSql(false);
    }
  };

  const downloadJsonConfig = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEnvConfig = () => {
    if (!config) return;
    const envContent = `# SentinelPulse Environment Variables Export
PORT=${config.server.port}
HOST=${config.server.host}
POLL_INTERVAL_MS=${config.server.pollIntervalMs}
DEMO_FALLBACK_ENABLED=${config.server.demoFallbackEnabled}

PROMETHEUS_ENABLED=${config.prometheus.enabled}
PROMETHEUS_ENDPOINT=${config.prometheus.endpoint}
PROMETHEUS_BEARER_TOKEN=${config.prometheus.token || ''}

MIKROTIK_ENABLED=${config.mikrotik.enabled}
MIKROTIK_HOST=${config.mikrotik.host}
MIKROTIK_PORT=${config.mikrotik.port}
MIKROTIK_USERNAME=${config.mikrotik.username}
MIKROTIK_PASSWORD=${config.mikrotik.password || ''}
MIKROTIK_INSECURE_TLS=${config.mikrotik.insecureTls}

CROWDSEC_ENABLED=${config.crowdsec.enabled}
CROWDSEC_EXPORTER_ENDPOINT=${config.crowdsec.exporterEndpoint}
CROWDSEC_LAPI_ENDPOINT=${config.crowdsec.lapiEndpoint}
CROWDSEC_API_KEY=${config.crowdsec.apiKey || ''}

UPTIME_KUMA_ENABLED=${config.uptimeKuma.enabled}
UPTIME_KUMA_ENDPOINT=${config.uptimeKuma.endpoint}
UPTIME_KUMA_SLUG=${config.uptimeKuma.slug}

PROXMOX_ENABLED=${config.proxmox.enabled}
PROXMOX_EXPORTER_ENDPOINT=${config.proxmox.exporterEndpoint}
PROXMOX_API_ENDPOINT=${config.proxmox.apiEndpoint || ''}
PROXMOX_TOKEN_ID=${config.proxmox.tokenId || ''}
PROXMOX_TOKEN_SECRET=${config.proxmox.tokenSecret || ''}
PROXMOX_CLUSTER_NAME=${config.proxmox.clusterName}
`;
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center p-12 text-[#8B949E] font-mono">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        <span className="text-xs uppercase tracking-wider">Loading configuration profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0D1117] text-[#4F9CF9] border border-[#30363D]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">CONFIG-DRIVEN ARCHITECTURE & TOPOLOGY</h2>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">Zero hardcoding • Dynamic Hot-Reload • Ubuntu 24.04 Plug & Play</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSaveConfig()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-[11px] uppercase tracking-wider border border-[#238636] transition-all disabled:opacity-50"
          >
            <Save className={`h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'APPLYING...' : 'SAVE & RELOAD'}</span>
          </button>
        </div>
      </div>

      {/* Success / Error Toasts */}
      {saveSuccess && (
        <div className="p-3 bg-[#0D1117] border border-[#238636] text-[#7EE787] text-[11px] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#7EE787]" />
          <span>Configuration saved successfully to <strong>config.json</strong> and collector engine reloaded!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-[#0D1117] border border-[#F85149] text-[#F85149] text-[11px] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[#F85149]" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap border-b border-[#30363D] gap-1 pb-1">
        <button
          onClick={() => setActiveSubtab('datasources')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all border font-bold ${
            activeSubtab === 'datasources' ? 'bg-[#161B22] text-[#4F9CF9] border-[#4F9CF9]' : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>DATA SOURCES & ROUTING [CRUD]</span>
        </button>

        <button
          onClick={() => setActiveSubtab('form')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all border ${
            activeSubtab === 'form' ? 'bg-[#161B22] text-[#4F9CF9] border-[#4F9CF9]' : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>VISUAL EDITOR</span>
        </button>

        <button
          onClick={() => setActiveSubtab('tester')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all border ${
            activeSubtab === 'tester' ? 'bg-[#161B22] text-[#4F9CF9] border-[#4F9CF9]' : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>ENDPOINT TESTER</span>
        </button>

        <button
          onClick={() => setActiveSubtab('raw')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all border ${
            activeSubtab === 'raw' ? 'bg-[#161B22] text-[#4F9CF9] border-[#4F9CF9]' : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
          }`}
        >
          <FileCode className="h-3.5 w-3.5" />
          <span>RAW JSON / .ENV</span>
        </button>

        <button
          onClick={() => setActiveSubtab('sqlite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all border ${
            activeSubtab === 'sqlite' ? 'bg-[#161B22] text-[#4F9CF9] border-[#4F9CF9]' : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>SQLITE EXPLORER</span>
        </button>

        <button
          onClick={() => setActiveSubtab('deploy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all border ${
            activeSubtab === 'deploy' ? 'bg-[#161B22] text-[#4F9CF9] border-[#4F9CF9]' : 'bg-[#0D1117] text-[#8B949E] border-[#30363D] hover:text-white'
          }`}
        >
          <FolderDown className="h-3.5 w-3.5" />
          <span>DEPLOY GUIDE</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 0. DATA SOURCES & ROUTING (CRUD) */}
      {/* ========================================================================= */}
      {activeSubtab === 'datasources' && (
        <DataSourcesManager
          onNavigateTab={onNavigateTab}
          onConfigChanged={() => {
            fetchCurrentConfig();
            if (onConfigSaved) onConfigSaved();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. VISUAL CONFIG FORM */}
      {/* ========================================================================= */}
      {activeSubtab === 'form' && (
        <div className="space-y-4">
          {/* Data Sources Quick Link Banner */}
          <div className="bg-[#0D1117] border border-[#30363D] p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#161B22] border border-[#30363D] text-[#4F9CF9]">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider">Dynamic Multi-Source Telemetry Routing</h4>
                <p className="text-[10px] text-[#8B949E]">
                  Add extra Proxmox nodes, MikroTik switches, or external exporters with custom dashboard targets.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubtab('datasources')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-[#58A6FF] border border-[#30363D] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <span>MANAGE DATA SOURCES [CRUD]</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* General & Polling */}
          <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 border-b border-[#30363D] pb-2">
              <Settings className="h-3.5 w-3.5 text-[#4F9CF9]" />
              ENGINE & STORAGE INTERVALS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">POLL INTERVAL (MS)</label>
                <input
                  type="number"
                  value={config.server.pollIntervalMs}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      server: { ...config.server, pollIntervalMs: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">SQLITE STORAGE PATH</label>
                <input
                  type="text"
                  value={config.storage.sqlitePath}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storage: { ...config.storage, sqlitePath: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">DATA RETENTION (DAYS)</label>
                <input
                  type="number"
                  value={config.storage.retainDays}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storage: { ...config.storage, retainDays: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>
            </div>
          </div>

          {/* 1. Prometheus Config Card */}
          <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-[#4F9CF9]" />
                1. PROMETHEUS TSDB METRICS
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase">
                <input
                  type="checkbox"
                  checked={config.prometheus.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      prometheus: { ...config.prometheus, enabled: e.target.checked },
                    })
                  }
                  className="bg-[#0D1117] border-[#30363D] text-[#4F9CF9]"
                />
                <span className="text-[#8B949E]">ENABLED</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">PROMETHEUS BASE URL</label>
                <input
                  type="text"
                  value={config.prometheus.endpoint}
                  placeholder="http://192.168.1.100:9090"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      prometheus: { ...config.prometheus, endpoint: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">BEARER AUTH TOKEN (OPTIONAL)</label>
                <input
                  type="password"
                  value={config.prometheus.token || ''}
                  placeholder="Bearer token or API secret"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      prometheus: { ...config.prometheus, token: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>
            </div>
          </div>

          {/* 2. MikroTik Config Card */}
          <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-[#4F9CF9]" />
                2. MIKROTIK ROUTEROS API / REST
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase">
                <input
                  type="checkbox"
                  checked={config.mikrotik.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mikrotik: { ...config.mikrotik, enabled: e.target.checked },
                    })
                  }
                  className="bg-[#0D1117] border-[#30363D] text-[#4F9CF9]"
                />
                <span className="text-[#8B949E]">ENABLED</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">ROUTER URL / HOST</label>
                <input
                  type="text"
                  value={config.mikrotik.host}
                  placeholder="https://192.168.1.1"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mikrotik: { ...config.mikrotik, host: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">USERNAME</label>
                <input
                  type="text"
                  value={config.mikrotik.username}
                  placeholder="admin"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mikrotik: { ...config.mikrotik, username: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div className="relative">
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">PASSWORD</label>
                <input
                  type={showMktPass ? 'text' : 'password'}
                  value={config.mikrotik.password || ''}
                  placeholder="RouterOS password"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mikrotik: { ...config.mikrotik, password: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 pr-8 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
                <button
                  type="button"
                  onClick={() => setShowMktPass(!showMktPass)}
                  className="absolute right-2.5 top-6 text-[#8B949E] hover:text-white"
                >
                  {showMktPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] uppercase text-[#8B949E] pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.mikrotik.insecureTls}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mikrotik: { ...config.mikrotik, insecureTls: e.target.checked },
                    })
                  }
                  className="bg-[#0D1117] border-[#30363D] text-[#4F9CF9]"
                />
                <span>Allow Self-Signed TLS Certificates (Insecure HTTPS)</span>
              </label>
            </div>
          </div>

          {/* 3. CrowdSec Config Card */}
          <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-[#F85149]" />
                3. CROWDSEC LAPI & METRICS EXPORTER
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase">
                <input
                  type="checkbox"
                  checked={config.crowdsec.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      crowdsec: { ...config.crowdsec, enabled: e.target.checked },
                    })
                  }
                  className="bg-[#0D1117] border-[#30363D] text-[#4F9CF9]"
                />
                <span className="text-[#8B949E]">ENABLED</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">LAPI ENDPOINT</label>
                <input
                  type="text"
                  value={config.crowdsec.lapiEndpoint}
                  placeholder="http://192.168.1.105:8080"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      crowdsec: { ...config.crowdsec, lapiEndpoint: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">EXPORTER URL</label>
                <input
                  type="text"
                  value={config.crowdsec.exporterEndpoint}
                  placeholder="http://192.168.1.105:6060/metrics"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      crowdsec: { ...config.crowdsec, exporterEndpoint: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div className="relative">
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">LAPI API KEY</label>
                <input
                  type={showCrowdKey ? 'text' : 'password'}
                  value={config.crowdsec.apiKey || ''}
                  placeholder="cscli bouncers add key"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      crowdsec: { ...config.crowdsec, apiKey: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 pr-8 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
                <button
                  type="button"
                  onClick={() => setShowCrowdKey(!showCrowdKey)}
                  className="absolute right-2.5 top-6 text-[#8B949E] hover:text-white"
                >
                  {showCrowdKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 4. Uptime Kuma Config Card */}
          <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[#7EE787]" />
                4. UPTIME KUMA SYNTHETIC CHECKS
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase">
                <input
                  type="checkbox"
                  checked={config.uptimeKuma.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      uptimeKuma: { ...config.uptimeKuma, enabled: e.target.checked },
                    })
                  }
                  className="bg-[#0D1117] border-[#30363D] text-[#4F9CF9]"
                />
                <span className="text-[#8B949E]">ENABLED</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">UPTIME KUMA URL</label>
                <input
                  type="text"
                  value={config.uptimeKuma.endpoint}
                  placeholder="http://192.168.1.110:3001"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      uptimeKuma: { ...config.uptimeKuma, endpoint: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">STATUS PAGE SLUG</label>
                <input
                  type="text"
                  value={config.uptimeKuma.slug || 'default'}
                  placeholder="default"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      uptimeKuma: { ...config.uptimeKuma, slug: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>
            </div>
          </div>

          {/* 5. Proxmox VE Config Card */}
          <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-[#D29922]" />
                5. PROXMOX VE HYPERVISOR EXPORTER & API
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase">
                <input
                  type="checkbox"
                  checked={config.proxmox.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      proxmox: { ...config.proxmox, enabled: e.target.checked },
                    })
                  }
                  className="bg-[#0D1117] border-[#30363D] text-[#4F9CF9]"
                />
                <span className="text-[#8B949E]">ENABLED</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">PVE EXPORTER ENDPOINT</label>
                <input
                  type="text"
                  value={config.proxmox.exporterEndpoint}
                  placeholder="http://192.168.1.120:9221/pve"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      proxmox: { ...config.proxmox, exporterEndpoint: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">API TOKEN ID</label>
                <input
                  type="text"
                  value={config.proxmox.tokenId || ''}
                  placeholder="root@pam!monitoring"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      proxmox: { ...config.proxmox, tokenId: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
              </div>

              <div className="relative">
                <label className="block text-[#8B949E] uppercase text-[10px] mb-1">TOKEN SECRET</label>
                <input
                  type={showPveSecret ? 'text' : 'password'}
                  value={config.proxmox.tokenSecret || ''}
                  placeholder="UUID secret"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      proxmox: { ...config.proxmox, tokenSecret: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 pr-8 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
                />
                <button
                  type="button"
                  onClick={() => setShowPveSecret(!showPveSecret)}
                  className="absolute right-2.5 top-6 text-[#8B949E] hover:text-white"
                >
                  {showPveSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INSTANT ENDPOINT TESTER */}
      {/* ========================================================================= */}
      {activeSubtab === 'tester' && (
        <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-4">
          <div className="border-b border-[#30363D] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-[#4F9CF9]" />
              REAL-TIME ENDPOINT REACHABILITY & AUTH TESTER
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Probe any telemetry endpoint directly from the server with latency and raw payload inspection</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px]">
            <div>
              <label className="block text-[#8B949E] uppercase text-[10px] mb-1">TARGET PROFILE</label>
              <select
                value={testTarget}
                onChange={(e: any) => {
                  const val = e.target.value;
                  setTestTarget(val);
                  if (val === 'prometheus') setTestUrl(config.prometheus.endpoint + '/api/v1/query?query=up');
                  if (val === 'mikrotik') setTestUrl(config.mikrotik.host + '/rest/system/resource');
                  if (val === 'crowdsec') setTestUrl(config.crowdsec.lapiEndpoint + '/v1/decisions');
                  if (val === 'uptimeKuma') setTestUrl(config.uptimeKuma.endpoint + '/api/status-page/heartbeat/' + config.uptimeKuma.slug);
                  if (val === 'proxmox') setTestUrl(config.proxmox.exporterEndpoint);
                }}
                className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
              >
                <option value="prometheus">Prometheus</option>
                <option value="mikrotik">MikroTik REST API</option>
                <option value="crowdsec">CrowdSec LAPI</option>
                <option value="uptimeKuma">Uptime Kuma</option>
                <option value="proxmox">Proxmox PVE Exporter</option>
                <option value="custom">Custom URL</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#8B949E] uppercase text-[10px] mb-1">TARGET URL</label>
              <input
                type="text"
                value={testUrl}
                placeholder="http://192.168.1.100:9090/metrics"
                onChange={(e) => setTestUrl(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
              />
            </div>

            <div>
              <label className="block text-[#8B949E] uppercase text-[10px] mb-1">AUTH TYPE</label>
              <select
                value={testAuthType}
                onChange={(e: any) => setTestAuthType(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none focus:border-[#4F9CF9]"
              >
                <option value="none">None / Public</option>
                <option value="basic">HTTP Basic Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="apiKey">X-Api-Key Header</option>
              </select>
            </div>
          </div>

          {testAuthType === 'basic' && (
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <input
                type="text"
                placeholder="Username"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                className="px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none"
              />
            </div>
          )}

          {(testAuthType === 'bearer' || testAuthType === 'apiKey') && (
            <div className="text-[11px]">
              <input
                type="password"
                placeholder="Token or API Key"
                value={testToken}
                onChange={(e) => setTestToken(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={handleRunEndpointTest}
            disabled={isTesting || !testUrl}
            className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'PROBING...' : 'RUN PROBE TEST'}</span>
          </button>

          {testResult && (
            <div className="mt-3 p-3 border text-[11px] bg-[#0D1117] border-[#30363D] space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#30363D]">
                <span className={`font-bold flex items-center gap-1.5 uppercase ${testResult.success ? 'text-[#7EE787]' : 'text-[#F85149]'}`}>
                  {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {testResult.message}
                </span>
                <span className="text-[#8B949E]">LATENCY: {testResult.latencyMs}ms</span>
              </div>

              {testResult.sampleData && (
                <div>
                  <span className="text-[#8B949E] text-[10px] block mb-1 uppercase">RETURNED PAYLOAD:</span>
                  <pre className="text-[#4F9CF9] overflow-x-auto max-h-56 p-2 bg-[#161B22] border border-[#30363D] text-[10px]">
                    {typeof testResult.sampleData === 'string'
                      ? testResult.sampleData
                      : JSON.stringify(testResult.sampleData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RAW JSON & .ENV EXPORTER */}
      {/* ========================================================================= */}
      {activeSubtab === 'raw' && (
        <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <FileCode className="h-3.5 w-3.5 text-[#4F9CF9]" />
                RAW CONFIGURATION & EXPORTS
              </h3>
              <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Download formatted configuration files for offline environments</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadJsonConfig}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0D1117] hover:bg-[#161B22] text-[#E0E0E0] text-[10px] uppercase font-bold border border-[#30363D] transition-all"
              >
                <Download className="h-3 w-3" />
                <span>CONFIG.JSON</span>
              </button>
              <button
                onClick={downloadEnvConfig}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0D1117] hover:bg-[#161B22] text-[#E0E0E0] text-[10px] uppercase font-bold border border-[#30363D] transition-all"
              >
                <Download className="h-3 w-3" />
                <span>.ENV FILE</span>
              </button>
            </div>
          </div>

          <pre className="bg-[#0D1117] p-3 border border-[#30363D] text-[11px] text-[#4F9CF9] overflow-x-auto max-h-96">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SQLITE DATABASE INSPECTOR */}
      {/* ========================================================================= */}
      {activeSubtab === 'sqlite' && (
        <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-3">
          <div className="border-b border-[#30363D] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[#4F9CF9]" />
              SQLITE PERSISTENT TIME-SERIES STORAGE
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Inspect local SQLite database tables (`metrics_timeseries`, `alerts_log`, `collector_status`)</p>
          </div>

          {/* Quick preset queries */}
          <div className="flex flex-wrap gap-2 text-[10px]">
            <button
              onClick={() => {
                setSqlQuery('SELECT * FROM collector_status;');
                handleRunSqlQuery();
              }}
              className="px-2 py-0.5 bg-[#0D1117] text-[#8B949E] border border-[#30363D] hover:text-white uppercase font-bold"
            >
              COLLECTOR_STATUS
            </button>
            <button
              onClick={() => {
                setSqlQuery('SELECT * FROM alerts_log ORDER BY timestamp DESC LIMIT 20;');
                handleRunSqlQuery();
              }}
              className="px-2 py-0.5 bg-[#0D1117] text-[#8B949E] border border-[#30363D] hover:text-white uppercase font-bold"
            >
              ALERTS_LOG
            </button>
            <button
              onClick={() => {
                setSqlQuery('SELECT * FROM metrics_timeseries ORDER BY timestamp DESC LIMIT 25;');
                handleRunSqlQuery();
              }}
              className="px-2 py-0.5 bg-[#0D1117] text-[#8B949E] border border-[#30363D] hover:text-white uppercase font-bold"
            >
              METRICS_TIMESERIES
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="SELECT * FROM collector_status"
              className="flex-1 px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-white text-[11px] focus:outline-none focus:border-[#4F9CF9]"
            />
            <button
              onClick={handleRunSqlQuery}
              disabled={isExecutingSql}
              className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <Play className={`h-3 w-3 ${isExecutingSql ? 'animate-spin' : ''}`} />
              <span>RUN SQL</span>
            </button>
          </div>

          {sqlError && (
            <div className="p-2.5 bg-[#0D1117] border border-[#F85149] text-[#F85149] text-[11px]">
              {sqlError}
            </div>
          )}

          {queryResult && (
            <div className="overflow-x-auto bg-[#0D1117] border border-[#30363D] max-h-80">
              <table className="w-full text-left text-[11px] text-[#E0E0E0]">
                <thead className="bg-[#161B22] text-[#8B949E] uppercase text-[10px] border-b border-[#30363D] sticky top-0">
                  <tr>
                    {queryResult.columns.map((col) => (
                      <th key={col} className="px-3 py-2">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]/60 font-mono">
                  {queryResult.values.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#161B22]/60">
                      {row.map((cell, cidx) => (
                        <td key={cidx} className="px-3 py-1.5 text-[#E0E0E0] truncate max-w-xs">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. UBUNTU 24.04 & DOCKER DEPLOYMENT GUIDE */}
      {/* ========================================================================= */}
      {activeSubtab === 'deploy' && (
        <div className="bg-[#161B22] border border-[#30363D] p-4 space-y-4">
          <div className="border-b border-[#30363D] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <FolderDown className="h-3.5 w-3.5 text-[#7EE787]" />
              UBUNTU 24.04 LTS PLUG-AND-PLAY QUICKSTART GUIDE
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Deploy SentinelPulse in seconds on any bare-metal, Proxmox LXC, or VPS running Ubuntu 24.04</p>
          </div>

          {/* Option A: One-Liner Installer */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-[#4F9CF9] uppercase tracking-wider">
              OPTION A: AUTOMATED ONE-LINER DEPLOY SCRIPT
            </h4>
            <div className="bg-[#0D1117] p-3 border border-[#30363D] flex items-center justify-between gap-4 text-[11px] text-[#E0E0E0]">
              <code className="text-[#4F9CF9] truncate">
                sudo bash deploy-ubuntu24.sh
              </code>
              <button
                onClick={() => navigator.clipboard.writeText('sudo bash deploy-ubuntu24.sh')}
                className="p-1 bg-[#161B22] hover:bg-[#30363D] text-[#8B949E] hover:text-white border border-[#30363D]"
                title="Copy Command"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-[#8B949E] uppercase">
              Installs Docker, configures UFW firewall port 3000, initializes persistent SQLite storage, and boots container in background.
            </p>
          </div>

          {/* Option B: Standard Docker Compose */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-[#4F9CF9] uppercase tracking-wider">
              OPTION B: DOCKER COMPOSE
            </h4>
            <div className="bg-[#0D1117] p-3 border border-[#30363D] space-y-2 text-[11px] text-[#E0E0E0]">
              <pre className="text-[#4F9CF9]">
{`# 1. Copy config template
cp config.example.json config.json

# 2. Start container with live logs
docker compose up -d --build
docker compose logs -f`}
              </pre>
            </div>
          </div>

          {/* Option C: Native Systemd Service */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-[#D29922] uppercase tracking-wider">
              OPTION C: SYSTEMD UNIT ON UBUNTU 24.04 (WITHOUT DOCKER)
            </h4>
            <div className="bg-[#0D1117] p-3 border border-[#30363D] space-y-2 text-[11px] text-[#E0E0E0]">
              <pre className="text-[#D29922]">
{`sudo cp sentinelpulse.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sentinelpulse`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
