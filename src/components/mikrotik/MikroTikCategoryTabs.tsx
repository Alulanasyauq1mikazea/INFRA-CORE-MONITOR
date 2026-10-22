import React from 'react';
import {
  Activity,
  Globe,
  Shield,
  Lock,
  Terminal,
  LayoutGrid,
  Radio,
  Compass,
} from 'lucide-react';

export type MikroTikCategory =
  | 'all'
  | 'overview'
  | 'hardware_capsman'
  | 'ip_dhcp'
  | 'security_qos'
  | 'vpn_tunnels'
  | 'tools_logs';

interface CategoryTabItem {
  id: MikroTikCategory;
  title: string;
  subtitle: string;
  icon: any;
  badge?: string | number;
  badgeColor?: string;
  colorScheme: {
    activeBg: string;
    activeBorder: string;
    activeText: string;
    activeGlow: string;
    iconColor: string;
    idleBorder: string;
    idleHoverBorder: string;
    idleHoverBg: string;
  };
}

interface MikroTikCategoryTabsProps {
  activeCategory: MikroTikCategory;
  onSelectCategory: (cat: MikroTikCategory) => void;
  counters: {
    interfacesCount: number;
    dhcpCount: number;
    firewallCount: number;
    vpnCount: number;
    activePanelsCount: number;
    capsCount?: number;
  };
}

export const MikroTikCategoryTabs: React.FC<MikroTikCategoryTabsProps> = ({
  activeCategory,
  onSelectCategory,
  counters,
}) => {
  const tabs: CategoryTabItem[] = [
    {
      id: 'overview',
      title: 'Overview & Traffic',
      subtitle: 'Resource & Port Rate',
      icon: Activity,
      badge: `${counters.interfacesCount} Port`,
      colorScheme: {
        activeBg: 'from-cyan-600 to-blue-600',
        activeBorder: 'border-cyan-300 ring-2 ring-cyan-400/40',
        activeText: 'text-white',
        activeGlow: 'shadow-cyan-950/60',
        iconColor: 'text-cyan-400',
        idleBorder: 'border-cyan-500/40',
        idleHoverBorder: 'hover:border-cyan-400',
        idleHoverBg: 'hover:bg-cyan-950/30',
      },
    },
    {
      id: 'hardware_capsman',
      title: 'CAPsMAN & SNMP',
      subtitle: '8 AP & Thermal Sensors',
      icon: Radio,
      badge: `${counters.capsCount || 8} AP Live`,
      colorScheme: {
        activeBg: 'from-emerald-600 to-teal-600',
        activeBorder: 'border-emerald-300 ring-2 ring-emerald-400/40',
        activeText: 'text-white',
        activeGlow: 'shadow-emerald-950/60',
        iconColor: 'text-emerald-400',
        idleBorder: 'border-emerald-500/40',
        idleHoverBorder: 'hover:border-emerald-400',
        idleHoverBg: 'hover:bg-emerald-950/30',
      },
    },
    {
      id: 'ip_dhcp',
      title: 'IP & DHCP Leases',
      subtitle: 'Subnet & Klien Active',
      icon: Globe,
      badge: `${counters.dhcpCount} Leases`,
      colorScheme: {
        activeBg: 'from-teal-600 to-emerald-600',
        activeBorder: 'border-teal-300 ring-2 ring-teal-400/40',
        activeText: 'text-white',
        activeGlow: 'shadow-teal-950/60',
        iconColor: 'text-teal-400',
        idleBorder: 'border-teal-500/40',
        idleHoverBorder: 'hover:border-teal-400',
        idleHoverBg: 'hover:bg-teal-950/30',
      },
    },
    {
      id: 'security_qos',
      title: 'Firewall & QoS',
      subtitle: 'Raw Filter, NAT & Limit',
      icon: Shield,
      badge: `${counters.firewallCount} Rules`,
      colorScheme: {
        activeBg: 'from-amber-600 to-orange-600',
        activeBorder: 'border-amber-300 ring-2 ring-amber-400/40',
        activeText: 'text-white',
        activeGlow: 'shadow-amber-950/60',
        iconColor: 'text-amber-400',
        idleBorder: 'border-amber-500/40',
        idleHoverBorder: 'hover:border-amber-400',
        idleHoverBg: 'hover:bg-amber-950/30',
      },
    },
    {
      id: 'vpn_tunnels',
      title: 'VPN & Tunnels',
      subtitle: 'WireGuard & L2TP/IPsec',
      icon: Lock,
      badge: 'WireGuard',
      colorScheme: {
        activeBg: 'from-indigo-600 to-blue-600',
        activeBorder: 'border-indigo-300 ring-2 ring-indigo-400/40',
        activeText: 'text-white',
        activeGlow: 'shadow-indigo-950/60',
        iconColor: 'text-indigo-400',
        idleBorder: 'border-indigo-500/40',
        idleHoverBorder: 'hover:border-indigo-400',
        idleHoverBg: 'hover:bg-indigo-950/30',
      },
    },
    {
      id: 'tools_logs',
      title: 'CLI & Event Logs',
      subtitle: 'Terminal & Live Events',
      icon: Terminal,
      badge: 'Terminal',
      colorScheme: {
        activeBg: 'from-purple-600 to-indigo-600',
        activeBorder: 'border-purple-300 ring-2 ring-purple-400/40',
        activeText: 'text-white',
        activeGlow: 'shadow-purple-950/60',
        iconColor: 'text-purple-400',
        idleBorder: 'border-purple-500/40',
        idleHoverBorder: 'hover:border-purple-400',
        idleHoverBg: 'hover:bg-purple-950/30',
      },
    },
    {
      id: 'all',
      title: 'Semua Widget',
      subtitle: 'Full Grid & Drag Order',
      icon: LayoutGrid,
      badge: `${counters.activePanelsCount} View`,
      colorScheme: {
        activeBg: 'from-slate-700 to-slate-800',
        activeBorder: 'border-slate-300 ring-2 ring-slate-400/40',
        activeText: 'text-white',
        activeGlow: 'shadow-slate-950/60',
        iconColor: 'text-slate-300',
        idleBorder: 'border-slate-600/50',
        idleHoverBorder: 'hover:border-slate-400',
        idleHoverBg: 'hover:bg-slate-800/60',
      },
    },
  ];

  return (
    <div className="relative bg-slate-900/95 border-2 border-cyan-500/50 ring-1 ring-cyan-400/30 rounded-2xl p-3 shadow-xl shadow-cyan-950/30">
      {/* Navigation Header Bar with Colored Accent */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/20">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-cyan-300 font-mono">
              Navigasi Kategori Modul
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] text-slate-400 font-sans">
              (Klik tombol untuk langsung membuka sub-dashboard)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-500/40">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>7 Modul Siap</span>
        </div>
      </div>

      {/* Non-scrolling Responsive Grid: 2 columns on mobile, 4 on tablet, 7 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeCategory === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectCategory(tab.id)}
              className={`relative flex flex-col items-start justify-between p-2.5 rounded-xl transition-all duration-200 text-left border-2 ${
                isActive
                  ? `bg-gradient-to-br ${tab.colorScheme.activeBg} ${tab.colorScheme.activeBorder} ${tab.colorScheme.activeText} shadow-lg ${tab.colorScheme.activeGlow} scale-[1.02]`
                  : `bg-slate-950/70 ${tab.colorScheme.idleBorder} ${tab.colorScheme.idleHoverBorder} ${tab.colorScheme.idleHoverBg} text-slate-400 hover:text-slate-100`
              }`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="w-full flex items-center justify-between mb-1.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : `bg-slate-900 ${tab.colorScheme.iconColor} border border-slate-800`
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                </div>

                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight border ${
                      isActive
                        ? 'bg-white/25 text-white border-white/40'
                        : `bg-slate-900 ${tab.colorScheme.iconColor} ${tab.colorScheme.idleBorder}`
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Bottom Row: Title + Subtitle */}
              <div className="w-full truncate">
                <div
                  className={`text-xs font-bold truncate leading-tight ${
                    isActive ? 'text-white' : 'text-slate-200'
                  }`}
                >
                  {tab.title}
                </div>
                <div
                  className={`text-[10px] truncate leading-tight mt-0.5 ${
                    isActive ? 'text-white/90' : 'text-slate-400'
                  }`}
                >
                  {tab.subtitle}
                </div>
              </div>

              {/* Active Highlight Indicator Bar */}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-1 bg-white rounded-full shadow-sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
