import React from 'react';
import { 
  Activity, 
  ShieldAlert, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Server, 
  Radio, 
  ShieldCheck, 
  Clock, 
  Cpu
} from 'lucide-react';
import { CollectorStatus, AlertItem } from '../types';

interface HeaderProps {
  collectors: Record<string, CollectorStatus>;
  healthScore: number;
  alerts: AlertItem[];
  isSocketConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  collectors = {},
  healthScore = 100,
  alerts = [],
  isSocketConnected,
  isRefreshing,
  onRefresh,
  activeTab,
  setActiveTab,
}) => {
  const unackAlerts = (alerts || []).filter((a) => !a?.acknowledged);

  const navItems = [
    { id: 'overview', label: 'OVERVIEW NOC', icon: Activity },
    { id: 'prometheus', label: 'PROMETHEUS', icon: Cpu },
    { id: 'mikrotik', label: 'MIKROTIK API', icon: Radio },
    { id: 'crowdsec', label: 'CROWDSEC LAPI', icon: ShieldCheck },
    { id: 'uptimeKuma', label: 'UPTIME KUMA', icon: Clock },
    { id: 'proxmox', label: 'PROXMOX VE', icon: Server },
    { id: 'config', label: 'CONFIG & TOPOLOGY', icon: ShieldAlert },
  ];

  return (
    <header className="border-b border-[#2D333B] bg-[#0B0D11] sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3 flex flex-wrap items-end justify-between gap-4">
        {/* Brand & Subtitle */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tighter text-white uppercase font-mono">
              INFRA-CORE <span className="text-[#4F9CF9]">MONITOR</span>
            </h1>
            <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-[#161B22] text-[#8B949E] border border-[#30363D]">
              v2.4.0-stable
            </span>
          </div>
          <p className="text-[10px] text-[#8B949E] uppercase tracking-widest mt-1">
            Systems Architect Dashboard / High-Portability NOC
          </p>
        </div>

        {/* Real-Time Telemetry Counters (Clean Minimalist Design Specs) */}
        <div className="flex items-center gap-6 text-[11px] font-mono">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[#8B949E] text-[10px] uppercase tracking-wider">LOADED CONFIG</span>
            <span className="text-[#7EE787] font-bold">/etc/monitor/config.json</span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[#8B949E] text-[10px] uppercase tracking-wider">SYSTEM HEALTH</span>
            <span className={`font-bold ${healthScore >= 90 ? 'text-[#7EE787]' : healthScore >= 70 ? 'text-[#D29922]' : 'text-[#F85149]'}`}>
              {healthScore}% {healthScore >= 90 ? 'NOMINAL' : 'DEGRADED'}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[#8B949E] text-[10px] uppercase tracking-wider">SOCKET STREAM</span>
            <span className={`font-bold flex items-center gap-1 ${isSocketConnected ? 'text-[#7EE787]' : 'text-[#F85149]'}`}>
              {isSocketConnected ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7EE787] animate-pulse"></span>
                  LIVE WS
                </>
              ) : (
                'OFFLINE'
              )}
            </span>
          </div>

          {/* Sweep Trigger */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] text-[#E0E0E0] text-[11px] transition-all disabled:opacity-50"
            title="Trigger immediate collection sweep"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-[#4F9CF9]' : 'text-[#8B949E]'}`} />
            <span>SWEEP</span>
          </button>
        </div>
      </div>

      {/* Subsystem Live Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-[#30363D]/60 flex items-center justify-between overflow-x-auto no-scrollbar gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-widest hidden sm:inline">COLLECTORS:</span>
          {(Object.entries(collectors) as [string, CollectorStatus][]).map(([key, col]) => {
            const isLive = col.isLive;
            const isEnabled = col.enabled;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key === 'uptimeKuma' ? 'uptimeKuma' : key)}
                className={`flex items-center gap-1.5 px-2 py-0.5 border text-[10px] uppercase tracking-wider transition-all ${
                  !isEnabled
                    ? 'opacity-40 text-[#8B949E] border-[#30363D] bg-[#0D1117]'
                    : isLive
                    ? 'bg-[#161B22] text-[#7EE787] border-[#30363D] hover:border-[#7EE787]/50'
                    : 'bg-[#161B22] text-[#D29922] border-[#30363D] hover:border-[#D29922]/50'
                }`}
                title={`${col.displayName}: ${isLive ? `LIVE (${col.latencyMs}ms)` : 'FALLBACK/SIMULATED'}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[#7EE787]' : 'bg-[#D29922]'}`} />
                <span>{col.source}</span>
                <span className="text-[9px] text-[#8B949E]">
                  {isLive ? `${col.latencyMs}ms` : 'demo'}
                </span>
              </button>
            );
          })}
        </div>

        {unackAlerts.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#F85149] bg-[#161B22] border border-[#F85149]/40 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F85149] animate-ping" />
            <span className="font-bold">{unackAlerts.length} ACTIVE THREAT ALERTS</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar gap-1 border-t border-[#30363D]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-mono tracking-wider whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? 'border-[#4F9CF9] text-white bg-[#161B22]/80 font-bold'
                  : 'border-transparent text-[#8B949E] hover:text-[#E0E0E0] hover:bg-[#161B22]/30'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#4F9CF9]' : 'text-[#8B949E]'}`} />
              <span>{item.label}</span>
              {item.id === 'overview' && unackAlerts.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] bg-[#F85149] text-white font-bold">
                  {unackAlerts.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};

