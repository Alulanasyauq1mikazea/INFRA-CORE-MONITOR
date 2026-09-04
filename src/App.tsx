import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { FullTelemetrySnapshot, ServerConfig } from './types';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { PrometheusTab } from './components/PrometheusTab';
import { MikroTikTab } from './components/MikroTikTab';
import { CrowdSecTab } from './components/CrowdSecTab';
import { UptimeKumaTab } from './components/UptimeKumaTab';
import { ProxmoxTab } from './components/ProxmoxTab';
import { ConfigManagerTab } from './components/ConfigManagerTab';
import { Activity, RefreshCw, AlertTriangle, ShieldCheck, Wifi } from 'lucide-react';

export default function App() {
  const [snapshot, setSnapshot] = useState<FullTelemetrySnapshot | null>(null);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial telemetry snapshot
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setSnapshot({
            ...data,
            activeAlerts: Array.isArray(data.activeAlerts) ? data.activeAlerts : [],
          });
          setError(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching telemetry snapshot:', err);
    }
  }, []);

  // Fetch server config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err: any) {
      console.error('Error fetching config:', err);
    }
  }, []);

  // Manual refresh trigger
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/telemetry/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
      }
    } catch (err: any) {
      console.error('Manual refresh failed:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Acknowledge single alert
  const handleAckAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}/ack`, { method: 'POST' });
      if (res.ok) {
        setSnapshot((prev) => {
          if (!prev) return prev;
          const currentAlerts = Array.isArray(prev.activeAlerts) ? prev.activeAlerts : [];
          return {
            ...prev,
            activeAlerts: currentAlerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
          };
        });
      }
    } catch (err) {
      console.error('Failed to ack alert:', err);
    }
  };

  // Clear all alerts
  const handleClearAlerts = async () => {
    try {
      const res = await fetch('/api/alerts/clear', { method: 'POST' });
      if (res.ok) {
        setSnapshot((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeAlerts: [],
          };
        });
      }
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  };

  // Set up Socket.io connection & fallback polling
  useEffect(() => {
    fetchSnapshot();
    fetchConfig();

    let socket: Socket | null = null;
    try {
      socket = io({
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setIsSocketConnected(true);
      });

      socket.on('disconnect', () => {
        setIsSocketConnected(false);
      });

      socket.on('telemetry:update', (data: FullTelemetrySnapshot) => {
        if (data && typeof data === 'object') {
          setSnapshot({
            ...data,
            activeAlerts: Array.isArray(data.activeAlerts) ? data.activeAlerts : [],
          });
        }
      });

      socket.on('alert:new', (alertData: any) => {
        setSnapshot((prev) => {
          if (!prev) return prev;
          const currentAlerts = Array.isArray(prev.activeAlerts) ? prev.activeAlerts : [];
          return {
            ...prev,
            activeAlerts: [alertData, ...currentAlerts.filter((a) => a.id !== alertData.id)],
          };
        });
      });
    } catch (err) {
      console.warn('Socket.io connection initialization error:', err);
    }

    // Safety fallback polling in case of websocket throttling
    const pollInterval = setInterval(() => {
      fetchSnapshot();
    }, 5000);

    return () => {
      if (socket) socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [fetchSnapshot, fetchConfig]);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#0B0D11] text-[#E0E0E0] font-mono flex flex-col items-center justify-center p-6">
        <div className="bg-[#161B22] border border-[#30363D] p-8 max-w-md w-full flex flex-col items-center text-center">
          <div className="h-12 w-12 bg-[#0D1117] border border-[#30363D] flex items-center justify-center mb-4">
            <Activity className="h-6 w-6 text-[#4F9CF9] animate-pulse" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white uppercase">INFRA-CORE <span className="text-[#4F9CF9]">MONITOR</span></h1>
          <p className="text-[10px] text-[#8B949E] uppercase tracking-widest mt-1 mb-4">
            Systems Architect Dashboard / Initializing Telemetry Stream
          </p>
          <div className="w-full flex items-center justify-center gap-2 text-[11px] text-[#7EE787] bg-[#0D1117] px-3 py-2 border border-[#30363D]">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#4F9CF9]" />
            <span>Connecting: Prometheus • MikroTik • CrowdSec • Uptime Kuma • Proxmox</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#E0E0E0] font-mono flex flex-col antialiased selection:bg-[#4F9CF9] selection:text-[#0B0D11]">
      {/* Real-time Header */}
      <Header
        collectors={snapshot.collectors}
        healthScore={snapshot.healthScore}
        alerts={snapshot.activeAlerts}
        isSocketConnected={isSocketConnected}
        isRefreshing={isRefreshing}
        onRefresh={handleManualRefresh}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {activeTab === 'overview' && (
          <OverviewTab
            snapshot={snapshot}
            onAckAlert={handleAckAlert}
            onClearAlerts={handleClearAlerts}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === 'prometheus' && (
          <PrometheusTab
            telemetry={snapshot.prometheus}
            endpoint={config?.prometheus.endpoint || snapshot.collectors.prometheus?.endpointUrl || 'http://localhost:9090'}
          />
        )}

        {activeTab === 'mikrotik' && (
          <MikroTikTab
            telemetry={snapshot.mikrotik}
            host={config?.mikrotik.host || snapshot.collectors.mikrotik?.endpointUrl || 'https://192.168.1.1'}
          />
        )}

        {activeTab === 'crowdsec' && (
          <CrowdSecTab
            telemetry={snapshot.crowdsec}
            lapiEndpoint={config?.crowdsec.lapiEndpoint || snapshot.collectors.crowdsec?.endpointUrl || 'http://localhost:8080'}
          />
        )}

        {activeTab === 'uptimeKuma' && (
          <UptimeKumaTab
            telemetry={snapshot.uptimeKuma}
            endpoint={config?.uptimeKuma.endpoint || snapshot.collectors.uptimeKuma?.endpointUrl || 'http://localhost:3001'}
          />
        )}

        {activeTab === 'proxmox' && (
          <ProxmoxTab
            telemetry={snapshot.proxmox}
            endpoint={config?.proxmox.exporterEndpoint || snapshot.collectors.proxmox?.endpointUrl || 'http://localhost:9221/pve'}
            onRefresh={fetchSnapshot}
            onNavigateTab={(tab: string) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'config' && (
          <ConfigManagerTab
            initialConfig={config || undefined}
            onConfigSaved={() => {
              fetchConfig();
              handleManualRefresh();
            }}
            onNavigateTab={(tab: string) => setActiveTab(tab as any)}
          />
        )}
      </main>

      {/* Clean Minimalist Engineering Footer */}
      <footer className="border-t border-[#2D333B] bg-[#0B0D11] py-3 text-[10px] text-[#8B949E] font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7EE787]"></span>
              <span>SOCKET: <strong className="text-[#7EE787] font-semibold">{isSocketConnected ? 'CONNECTED' : 'DISCONNECTED'}</strong></span>
            </span>
            <span>ENGINE: <strong className="text-[#7EE787] font-semibold">RUNNING</strong></span>
            <span>POLL INTERVAL: <strong className="text-white font-semibold">5000ms</strong></span>
            <span>STORAGE: <strong className="text-[#7EE787] font-semibold">SQLITE HEALTHY</strong></span>
          </div>
          <div className="text-[#8B949E] tracking-wider uppercase">
            UBUNTU 24.04 LTS | DOCKER-COMPOSE RUNNING | CONFIG-DRIVEN ARCHITECTURE
          </div>
        </div>
      </footer>
    </div>
  );
}
