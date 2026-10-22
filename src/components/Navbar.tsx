import React, { useState, useEffect, useRef } from 'react';
import { AntLogo } from './AntLogo';
import {
  Activity,
  Router,
  Server,
  ShieldCheck,
  Globe,
  Sparkles,
  FileText,
  Database,
  Bell,
  Sliders,
  Lock,
  Menu,
  X,
  RefreshCw,
  Clock,
  LogOut,
  User,
  ChevronDown,
  Shield,
  Key,
  Network,
} from 'lucide-react';
import { SystemStatus, UserSecurityState } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus: SystemStatus;
  unreadAlertCount: number;
  userSecurity: UserSecurityState;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpen2FAModal: () => void;
  onLogout?: () => void;
  currentUser?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  unreadAlertCount,
  userSecurity,
  onRefresh,
  isRefreshing,
  onOpen2FAModal,
  onLogout,
  currentUser = 'daswafx',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'mikrotik', label: 'MikroTik Router', icon: Router },
    { id: 'ruijie', label: 'Ruijie Gateway', icon: Network },
    { id: 'servers', label: 'Servers & VMs', icon: Server },
    { id: 'waf', label: 'WAF Firewall', icon: ShieldCheck },
    { id: 'websites', label: 'Web & SSL', icon: Globe },
    { id: 'predictive', label: 'AI Predictive', icon: Sparkles, badge: 'Gemini AI' },
    { id: 'logs', label: 'InfluxDB Audit', icon: FileText },
    { id: 'backups', label: 'Daily Backups', icon: Database },
    { id: 'alerts', label: 'Alerts & Telegram', icon: Bell, alertCount: unreadAlertCount },
    { id: 'datasources', label: 'Data Sources & Targets', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 text-slate-300 font-mono">
      {/* Top Banner Bar */}
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-4">
          
          {/* Logo & Platform Info (High Density Brand) */}
          <div className="flex items-center gap-4 min-w-0 shrink-0">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-3 h-3 bg-cyan-400 rounded-xs shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-black text-lg tracking-tighter leading-none">
                    NETWACH
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 tracking-[0.2em] uppercase leading-tight mt-0.5">
                  Network Sentinel v2.4.0
                </span>
              </div>
            </div>

            {/* Session & Telemetry Status (Desktop High Density) */}
            <div className="hidden lg:flex items-center gap-4 pl-4 border-l border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Session:</span>
                <span className="text-slate-200 text-xs font-mono font-medium">ALPHA_PROD_99</span>
              </div>
              <div className="w-px h-3.5 bg-slate-800"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Clock:</span>
                <span className="text-slate-200 text-xs font-mono font-medium">{currentTime.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {/* GitHub Sync Status Badge */}
            <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>SYNCED WITH GITHUB</span>
            </div>

            {/* 2FA Status Pill */}
            <button
              onClick={onOpen2FAModal}
              className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded border text-[11px] font-mono whitespace-nowrap transition ${
                userSecurity.is2FAEnabled
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
              }`}
              title="2-Factor Authentication Status"
            >
              <Lock className="w-3 h-3 shrink-0" />
              <span>{userSecurity.is2FAEnabled ? '2FA: ON' : '2FA: OFF'}</span>
            </button>

            {/* Logged in User Profile Dropdown Capsule */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="h-8 inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 rounded border border-slate-700 hover:border-cyan-500/50 text-xs font-mono whitespace-nowrap transition cursor-pointer"
                title="Akun Pengguna & Opsi Keluar"
              >
                <div className="w-4 h-4 rounded-xs bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold">
                  {currentUser.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-slate-200 font-medium">{currentUser}</span>
                <span
                  className={`px-1 py-0.2 rounded text-[9px] font-bold border ${
                    userSecurity.userRole === 'Viewer'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {userSecurity.userRole === 'Viewer' ? 'VIEW' : 'ADMIN'}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-[#0f172a] border border-slate-700 rounded p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-mono">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">Logged in as</div>
                    <div className="text-xs font-bold text-slate-100 truncate">{currentUser}</div>
                    <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-cyan-400">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span>{userSecurity.userRole === 'Viewer' ? 'Viewer Mode' : 'Super Admin'}</span>
                    </div>
                  </div>

                  {/* 2FA Option */}
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpen2FAModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800 rounded transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Key className="w-3 h-3 text-slate-400" />
                      <span>Two-Factor Auth</span>
                    </div>
                    <span className={`text-[9px] font-bold ${userSecurity.is2FAEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {userSecurity.is2FAEnabled ? 'ACTIVE' : 'OFF'}
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-800"></div>

                  {/* Logout Button */}
                  {onLogout && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition text-left group"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                      <span>Keluar (Logout)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 inline-flex items-center justify-center rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50 shrink-0"
              title="Refresh Telemetry Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded bg-slate-800 text-slate-300 border border-slate-700 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0f172a] border-b border-slate-800 px-4 pt-2 pb-4 space-y-2 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">{currentUser}</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded font-bold">
                {userSecurity.userRole}
              </span>
            </div>
            {onLogout && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="px-2.5 py-1 rounded border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs font-semibold flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 px-2.5 py-2 rounded text-xs font-medium text-left transition ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                      : 'text-slate-300 bg-slate-900/60 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="truncate text-[11px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
