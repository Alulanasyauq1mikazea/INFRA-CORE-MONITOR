import React from 'react';
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
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  FileBarChart,
  BookOpen,
  Network,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadAlertCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertCount,
  isCollapsed,
  setIsCollapsed,
}) => {
  const navSections = [
    {
      title: 'Infrastructure',
      items: [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'mikrotik', label: 'MikroTik Router', icon: Router },
        { id: 'ruijie', label: 'Ruijie Gateway', icon: Network },
        { id: 'servers', label: 'Servers & VMs', icon: Server },
        { id: 'websites', label: 'Web & SSL', icon: Globe },
      ],
    },
    {
      title: 'Security & AI',
      items: [
        { id: 'waf', label: 'WAF Firewall', icon: ShieldCheck },
        { id: 'predictive', label: 'AI Predictive', icon: Sparkles, badge: 'Gemini AI' },
        { id: 'alerts', label: 'Alerts & Telegram', icon: Bell, alertCount: unreadAlertCount },
      ],
    },
    {
      title: 'Operations & Audit',
      items: [
        { id: 'reports', label: 'Monthly Reports', icon: FileBarChart },
        { id: 'logs', label: 'Prometheus Incidents', icon: FileText, badge: 'TSDB' },
        { id: 'backups', label: 'Daily Backups', icon: Database },
      ],
    },
    {
      title: 'Configuration & SQLite',
      items: [
        { id: 'datasources', label: 'Data Sources & Scrape Targets', icon: Database, badge: 'Unified' },
        { id: 'docs', label: 'Tech Docs & Git Guide', icon: BookOpen },
      ],
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-[#0f172a] border-r border-slate-800 text-slate-300 font-mono transition-all duration-300 ease-in-out sticky top-14 h-[calc(100vh-3.5rem)] z-30 flex-shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header / Collapse Toggle Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#020617]/50">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded-xs shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold tracking-tight text-cyan-400 uppercase">
                OPERATIONAL VIEWS
              </span>
              <span className="text-[9px] text-slate-500 tracking-widest uppercase">
                Sentinel v2.4.0
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 border border-slate-700 transition flex items-center justify-center ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Buka Menu Sidebar' : 'Tutup Menu Sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Navigation Items grouped by sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 pt-1 pb-1">
                {section.title}
              </h3>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded text-xs transition-all duration-150 group relative ${
                    isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate text-left font-mono text-[11px]">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 ml-1">
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                      )}
                      {item.badge && (
                        <span className="px-1.5 py-0.2 text-[9px] rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono">
                          {item.badge}
                        </span>
                      )}
                      {item.alertCount ? (
                        item.alertCount > 0 && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono font-bold animate-pulse">
                            {item.alertCount}
                          </span>
                        )
                      ) : null}
                    </div>
                  )}

                  {isCollapsed && item.alertCount ? (
                    item.alertCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    )
                  ) : null}

                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl font-mono">
                      {item.label}
                      {item.badge && <span className="ml-1.5 text-cyan-400">[{item.badge}]</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Environment Info Box (High Density) */}
        {!isCollapsed && (
          <div className="pt-3 border-t border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 px-2">Environment</div>
            <div className="space-y-1.5 px-2 bg-[#020617]/40 p-2.5 rounded border border-slate-800/80 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="text-emerald-400 truncate max-w-[110px]">GitHub/NetWach</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Branch</span>
                <span className="text-slate-300">main</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Runtime</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / System Load Widget */}
      <div className="p-3 border-t border-slate-800 bg-[#020617]/40 text-[10px] font-mono">
        {!isCollapsed ? (
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-slate-500">SYSTEM_LOAD</span>
              <span className="text-cyan-400 font-bold">78%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-1.5">
              <div className="w-[78%] h-full bg-cyan-400"></div>
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">
              SYSTEM_LOAD_STABLE
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></div>
          </div>
        )}
      </div>
    </aside>
  );
};
