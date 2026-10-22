import React, { useState, useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import {
  Globe,
  ShieldAlert,
  Radio,
  Server,
  Flame,
  Search,
  Filter,
  Clock,
  Activity,
  BarChart3,
  Copy,
  Check,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { lookupIpLocation } from '../utils/geoip';
import { CountryFlag, getCanonicalCountryInfo } from './CountryFlag';

export interface BlockedIpItem {
  ip: string;
  country?: string;
  flag?: string;
  countryName?: string;
  reason?: string;
  action?: string;
  expiresIn?: string;
  creationTime?: string;
  timestamp?: string;
  origin?: string;
  listName?: string;
  dynamic?: boolean;
  flagText?: string;
  count?: number;
  alertId?: number;
}

interface GeoIpThreatMapProps {
  blockedIps: BlockedIpItem[];
  onRemoveIp?: (ip: string) => void;
  targetRouterName?: string;
  targetRouterIp?: string;
}

// Real-world Lat/Lon Coordinates for Countries
const COUNTRY_COORDINATES: Record<string, { lat: number; lon: number; name: string; continent: string }> = {
  US: { lat: 37.0902, lon: -95.7129, name: 'United States', continent: 'North America' },
  DE: { lat: 51.1657, lon: 10.4515, name: 'Germany', continent: 'Europe' },
  NL: { lat: 52.1326, lon: 5.2913, name: 'Netherlands', continent: 'Europe' },
  FR: { lat: 46.2276, lon: 2.2137, name: 'France', continent: 'Europe' },
  RU: { lat: 61.5240, lon: 105.3188, name: 'Russia', continent: 'Asia' },
  CN: { lat: 35.8617, lon: 104.1954, name: 'China', continent: 'Asia' },
  JP: { lat: 36.2048, lon: 138.2529, name: 'Japan', continent: 'Asia' },
  KR: { lat: 35.9078, lon: 127.7669, name: 'South Korea', continent: 'Asia' },
  SG: { lat: 1.3521, lon: 103.8198, name: 'Singapore', continent: 'Asia' },
  MY: { lat: 4.2105, lon: 101.9758, name: 'Malaysia', continent: 'Asia' },
  VN: { lat: 14.0583, lon: 108.2772, name: 'Vietnam', continent: 'Asia' },
  IN: { lat: 20.5937, lon: 78.9629, name: 'India', continent: 'Asia' },
  GB: { lat: 55.3781, lon: -3.4360, name: 'United Kingdom', continent: 'Europe' },
  BR: { lat: -14.2350, lon: -51.9253, name: 'Brazil', continent: 'South America' },
  ZA: { lat: -30.5595, lon: 22.9375, name: 'South Africa', continent: 'Africa' },
  ID: { lat: -0.7893, lon: 113.9213, name: 'Indonesia', continent: 'Asia' },
  AU: { lat: -25.2744, lon: 133.7751, name: 'Australia', continent: 'Oceania' },
  CA: { lat: 56.1304, lon: -106.3468, name: 'Canada', continent: 'North America' },
  LT: { lat: 55.1694, lon: 23.8813, name: 'Lithuania', continent: 'Europe' },
  BE: { lat: 50.5039, lon: 4.4699, name: 'Belgium', continent: 'Europe' },
  HK: { lat: 22.3193, lon: 114.1694, name: 'Hong Kong', continent: 'Asia' },
  TW: { lat: 23.6978, lon: 120.9605, name: 'Taiwan', continent: 'Asia' },
  TH: { lat: 15.8700, lon: 100.9925, name: 'Thailand', continent: 'Asia' },
  PH: { lat: 12.8797, lon: 121.7740, name: 'Philippines', continent: 'Asia' },
  IT: { lat: 41.8719, lon: 12.5674, name: 'Italy', continent: 'Europe' },
  ES: { lat: 40.4637, lon: -3.7492, name: 'Spain', continent: 'Europe' },
  TR: { lat: 38.9637, lon: 35.2433, name: 'Turkey', continent: 'Europe/Asia' },
  UA: { lat: 48.3794, lon: 31.1656, name: 'Ukraine', continent: 'Europe' },
  PL: { lat: 51.9194, lon: 19.1451, name: 'Poland', continent: 'Europe' },
  SE: { lat: 60.1282, lon: 18.6435, name: 'Sweden', continent: 'Europe' },
  NO: { lat: 60.4720, lon: 8.4689, name: 'Norway', continent: 'Europe' },
  FI: { lat: 61.9241, lon: 25.7482, name: 'Finland', continent: 'Europe' },
  RO: { lat: 45.9432, lon: 24.9668, name: 'Romania', continent: 'Europe' },
  BG: { lat: 42.7339, lon: 25.4858, name: 'Bulgaria', continent: 'Europe' },
  CZ: { lat: 49.8175, lon: 15.4730, name: 'Czech Republic', continent: 'Europe' },
  AT: { lat: 47.5162, lon: 14.5501, name: 'Austria', continent: 'Europe' },
  CH: { lat: 46.8182, lon: 8.2275, name: 'Switzerland', continent: 'Europe' },
  IR: { lat: 32.4279, lon: 53.6880, name: 'Iran', continent: 'Asia' },
  PK: { lat: 30.3753, lon: 69.3451, name: 'Pakistan', continent: 'Asia' },
  EG: { lat: 26.8206, lon: 30.8025, name: 'Egypt', continent: 'Africa' },
  AR: { lat: -38.4161, lon: -63.6167, name: 'Argentina', continent: 'South America' },
  CL: { lat: -35.6751, lon: -71.5430, name: 'Chile', continent: 'South America' },
  MX: { lat: 23.6345, lon: -102.5528, name: 'Mexico', continent: 'North America' },
  CO: { lat: 4.5709, lon: -74.2973, name: 'Colombia', continent: 'South America' },
};

// Target Router Location: Merauke, Papua Selatan, Indonesia
const TARGET_LOCATION = {
  name: 'MikroTik CCR1036-12G-4S (Firewall RAW Drop)',
  ip: '192.168.77.1',
  locationName: 'Merauke - Indonesia (WAF Target Node)',
  lat: -8.499,
  lon: 140.401,
};

// Custom DivIcon creator for Target Node
const createTargetIcon = () => {
  return L.divIcon({
    className: 'custom-target-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(16, 185, 129, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #064e3b; border: 2px solid #10b981; box-shadow: 0 0 10px #10b981;"></div>
        <div style="position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Custom DivIcon creator for Threat Origins
const createOriginIcon = (countryCode: string, flag: string, totalIps: number, isSelected: boolean) => {
  const size = Math.max(26, Math.min(42, 24 + Math.log2(totalIps + 1) * 3));
  return L.divIcon({
    className: 'custom-origin-marker',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${isSelected ? 'rgba(244, 63, 94, 0.4)' : 'rgba(244, 63, 94, 0.2)'}; animation: ${isSelected ? 'ping 1s infinite' : 'pulse 2s infinite'};"></div>
        <div style="position: absolute; width: ${size - 4}px; height: ${size - 4}px; border-radius: 50%; background: #881337; border: 2px solid ${isSelected ? '#ffffff' : '#f43f5e'}; box-shadow: 0 0 8px #f43f5e; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white; font-family: monospace;">
          ${totalIps}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Check whether an address-list timestamp is from today
function isTimestampToday(timeStr?: string): boolean {
  if (!timeStr) return false;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const slashDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const shortSlash = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
  return timeStr.includes(isoDate) || timeStr.includes(slashDate) || timeStr.includes(shortSlash);
}

// Helper to generate a curved trajectory arc in Lat/Lon between two points
function generateCurvedTrajectory(from: [number, number], to: [number, number], numPoints = 25): [number, number][] {
  const points: [number, number][] = [];
  const lat1 = from[0];
  const lon1 = from[1];
  const lat2 = to[0];
  const lon2 = to[1];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Linear interpolation
    const lat = lat1 + (lat2 - lat1) * t;
    const lon = lon1 + (lon2 - lon1) * t;

    // Add quadratic arc height perpendicular to vector
    const arcHeight = Math.sin(t * Math.PI) * Math.min(25, Math.abs(lon2 - lon1) * 0.15 + 5);
    points.push([lat + arcHeight, lon]);
  }

  return points;
}

// Map Tile Layers (Realistic Dark Options, 100% Free & No Watermark)
const MAP_LAYERS: Record<string, {
  name: string;
  url: string;
  referenceUrl?: string;
  attribution: string;
  className?: string;
}> = {
  esri_dark: {
    name: 'ESRI Dark Gray (SOC Clean)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    className: '',
  },
  cyber_dark: {
    name: 'Cyber Dark (OSM Inverted)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: 'cyber-dark-tiles',
  },
  esri_satellite: {
    name: 'ESRI Dark Imagery (Satellite)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    className: '',
  },
  osm_standard: {
    name: 'OpenStreetMap Precision',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    className: '',
  }
};

// Animated Attack Missiles / Energy Balls Component traveling from Attacker to Target Node
interface AttackMissileProps {
  countries: Array<{
    code: string;
    trajectory: [number, number][];
    totalAttacks: number;
    isSelected: boolean;
  }>;
}

const AnimatedAttackMissiles: React.FC<AttackMissileProps> = ({ countries }) => {
  const map = useMap();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setTick((prev) => prev + 1);
    };
    map.on('move', handleUpdate);
    map.on('zoom', handleUpdate);
    map.on('viewreset', handleUpdate);
    map.on('resize', handleUpdate);
    return () => {
      map.off('move', handleUpdate);
      map.off('zoom', handleUpdate);
      map.off('viewreset', handleUpdate);
      map.off('resize', handleUpdate);
    };
  }, [map]);

  const projectedBeams = useMemo(() => {
    return countries.map((country, idx) => {
      const points = country.trajectory.map((latLng) => {
        const pt = map.latLngToContainerPoint(L.latLng(latLng[0], latLng[1]));
        return `${pt.x},${pt.y}`;
      });
      const d = `M ${points.join(' L ')}`;
      const speed = Math.max(1.8, Math.min(3.6, 3.6 - Math.log10(country.totalAttacks + 1) * 0.7));
      const delay = (idx * 0.35) % 2.5;
      const secondDelay = (delay + speed / 2) % speed;

      return {
        code: country.code,
        d,
        speed,
        delay,
        secondDelay,
        isSelected: country.isSelected,
        hasMultiple: country.totalAttacks > 3,
      };
    });
  }, [countries, map]);

  return (
    <svg
      className="pointer-events-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 450,
        overflow: 'hidden',
      }}
    >
      <defs>
        <radialGradient id="energy-ball-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="35%" stopColor="#f43f5e" stopOpacity="1" />
          <stop offset="70%" stopColor="#e11d48" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#881337" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="energy-ball-cyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="35%" stopColor="#38bdf8" stopOpacity="1" />
          <stop offset="70%" stopColor="#0284c7" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="target-impact-burst" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
        </radialGradient>
        <filter id="missile-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {projectedBeams.map((beam) => (
        <g key={`missile-${beam.code}`}>
          {/* Primary Attack Missile Ball (White Core + Glowing Outer Shell) */}
          <circle
            r={beam.isSelected ? 5.5 : 4}
            fill="#ffffff"
            filter="url(#missile-glow)"
          >
            <animateMotion
              path={beam.d}
              dur={`${beam.speed}s`}
              begin={`${beam.delay}s`}
              repeatCount="indefinite"
              rotate="auto"
            />
          </circle>
          <circle
            r={beam.isSelected ? 14 : 9}
            fill={beam.isSelected ? "url(#energy-ball-cyan)" : "url(#energy-ball-core)"}
          >
            <animateMotion
              path={beam.d}
              dur={`${beam.speed}s`}
              begin={`${beam.delay}s`}
              repeatCount="indefinite"
              rotate="auto"
            />
          </circle>

          {/* Secondary Following Missile Ball for Active Threats */}
          {beam.hasMultiple && (
            <>
              <circle
                r="3"
                fill="#ffffff"
                filter="url(#missile-glow)"
              >
                <animateMotion
                  path={beam.d}
                  dur={`${beam.speed}s`}
                  begin={`${beam.secondDelay}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
              <circle
                r="7"
                fill="url(#energy-ball-core)"
              >
                <animateMotion
                  path={beam.d}
                  dur={`${beam.speed}s`}
                  begin={`${beam.secondDelay}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                />
              </circle>
            </>
          )}
        </g>
      ))}
    </svg>
  );
};

export const GeoIpThreatMap: React.FC<GeoIpThreatMapProps> = ({
  blockedIps = [],
  onRemoveIp,
  targetRouterName = 'MikroTik CCR1036-12G-4S',
  targetRouterIp = '192.168.77.1',
}) => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'all'>('today');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [threatTypeFilter, setThreatTypeFilter] = useState<string>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'leaderboard' | 'stream'>('map');
  const [activeTileLayer, setActiveTileLayer] = useState<keyof typeof MAP_LAYERS>('esri_dark');

  // Filter IP data: default strictly to TODAY's entries from MikroTik Address-List
  const filteredIps = useMemo(() => {
    return blockedIps.filter((item) => {
      // 1. Time filter
      if (timeFilter === 'today') {
        const isToday = isTimestampToday(item.creationTime || item.timestamp);
        if (!isToday) return false;
      }

      // 2. Threat type filter
      if (threatTypeFilter !== 'all') {
        const r = (item.reason || '').toLowerCase();
        if (threatTypeFilter === 'scan' && !r.includes('scan') && !r.includes('probing')) return false;
        if (threatTypeFilter === 'cve' && !r.includes('cve') && !r.includes('jira')) return false;
        if (threatTypeFilter === 'useragent' && !r.includes('user-agent')) return false;
        if (threatTypeFilter === 'bruteforce' && !r.includes('bruteforce') && !r.includes('bf')) return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ipMatch = item.ip.toLowerCase().includes(q);
        const reasonMatch = (item.reason || '').toLowerCase().includes(q);
        const countryMatch = (item.countryName || item.country || '').toLowerCase().includes(q);
        if (!ipMatch && !reasonMatch && !countryMatch) return false;
      }

      return true;
    });
  }, [blockedIps, timeFilter, threatTypeFilter, searchQuery]);

  // Aggregate attacks by Country with Exact Coordinates
  const countryThreatAggregates = useMemo(() => {
    const map = new Map<string, {
      code: string;
      name: string;
      flag: string;
      continent: string;
      lat: number;
      lon: number;
      totalIps: number;
      totalAttacks: number;
      scenarios: Map<string, number>;
      ips: BlockedIpItem[];
      trajectory: [number, number][];
    }>();

    filteredIps.forEach((item) => {
      const geo = lookupIpLocation(item.ip);
      const rawCountry = item.country && item.country !== 'GLOBAL' && item.country !== 'XX' ? item.country : geo.country;
      const rawName = item.countryName && item.countryName !== 'RouterOS Address-List' && item.countryName !== 'Global Community Blocklist'
        ? item.countryName
        : geo.countryName;
      const rawFlag = item.flag && item.flag !== '🌐' ? item.flag : geo.flag;

      const canonical = getCanonicalCountryInfo(rawCountry, rawFlag, rawName);
      const code = canonical.code;
      const name = canonical.name;
      const flag = canonical.flag;

      const coords = COUNTRY_COORDINATES[code] || {
        lat: 20 + ((code.charCodeAt(0) * 3) % 40) - 20,
        lon: ((code.charCodeAt(0) * 11) % 360) - 180,
        name,
        continent: 'Global'
      };

      if (!map.has(code)) {
        const traj = generateCurvedTrajectory([coords.lat, coords.lon], [TARGET_LOCATION.lat, TARGET_LOCATION.lon]);
        map.set(code, {
          code,
          name,
          flag,
          continent: coords.continent,
          lat: coords.lat,
          lon: coords.lon,
          totalIps: 0,
          totalAttacks: 0,
          scenarios: new Map(),
          ips: [],
          trajectory: traj,
        });
      }

      const entry = map.get(code)!;
      entry.totalIps += 1;
      entry.totalAttacks += item.count || 1;
      entry.ips.push(item);

      const scenario = item.reason || 'http:scan';
      entry.scenarios.set(scenario, (entry.scenarios.get(scenario) || 0) + (item.count || 1));
    });

    return Array.from(map.values()).sort((a, b) => b.totalAttacks - a.totalAttacks);
  }, [filteredIps]);

  // Overall summary metrics for today
  const totalAttacksToday = useMemo(() => {
    return filteredIps.reduce((acc, curr) => acc + (curr.count || 1), 0);
  }, [filteredIps]);

  const uniqueCountriesCount = countryThreatAggregates.length;

  const topScenarioToday = useMemo(() => {
    const scMap: Record<string, number> = {};
    filteredIps.forEach((item) => {
      const s = item.reason || 'http:scan';
      scMap[s] = (scMap[s] || 0) + (item.count || 1);
    });
    const sorted = Object.entries(scMap).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : { name: 'None', count: 0 };
  }, [filteredIps]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  return (
    <div className="space-y-6" id="geoip-threat-map-container">
      {/* Top Banner & Filter Controls */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
              <Globe className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  GeoIP Threat Map & Attack Origins
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono uppercase tracking-wider">
                    {timeFilter === 'today' ? 'Live Harian (Hari Ini)' : 'Semua Data'}
                  </span>
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Peta Asli Dunia (Dark Cyber GIS) &bull; Visualisasi lintasan serangan real-time ke MikroTik Firewall RAW
              </p>
            </div>
          </div>

          {/* Quick Actions & Time Range Switch */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tile Layer Style Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 flex items-center gap-1 font-semibold">
                <Layers className="w-3.5 h-3.5" />
                Layer:
              </span>
              <button
                type="button"
                onClick={() => setActiveTileLayer('esri_dark')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeTileLayer === 'esri_dark' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Peta Asli ESRI Dark Canvas (Tanpa Watermark & Bebas API Key)"
              >
                Dark Canvas
              </button>
              <button
                type="button"
                onClick={() => setActiveTileLayer('cyber_dark')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeTileLayer === 'cyber_dark' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="OpenStreetMap Cyberpunk Inverted Dark"
              >
                Cyber Dark
              </button>
              <button
                type="button"
                onClick={() => setActiveTileLayer('esri_satellite')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeTileLayer === 'esri_satellite' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Citra Satelit Asli ESRI"
              >
                Satelit
              </button>
              <button
                type="button"
                onClick={() => setActiveTileLayer('osm_standard')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activeTileLayer === 'osm_standard' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="OpenStreetMap Presisi Standar"
              >
                OSM
              </button>
            </div>

            {/* Time Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setTimeFilter('today')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  timeFilter === 'today'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan hanya serangan yang tercatat pada hari ini"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Hari Ini ({blockedIps.filter(i => isTimestampToday(i.creationTime || i.timestamp)).length} IP)</span>
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  timeFilter === 'all'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan semua data IP dalam MikroTik Address-List"
              >
                <span>Semua ({blockedIps.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards Focus: Hari Ini */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">Total IP Terblokir ({timeFilter === 'today' ? 'Hari Ini' : 'Total'})</span>
              <ShieldAlert className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-300 font-mono mt-1 flex items-baseline gap-2">
              {filteredIps.length} <span className="text-xs font-normal text-slate-500">IP Aktif</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <Activity className="w-3 h-3 text-purple-400" />
              <span>{totalAttacksToday} Total Serangan Dicegah</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">Negara Asal Terdeteksi</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-300 font-mono mt-1 flex items-baseline gap-2">
              {uniqueCountriesCount} <span className="text-xs font-normal text-slate-500">Negara</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate font-mono">
              <span>Top:</span>
              {countryThreatAggregates.slice(0, 3).map((c) => (
                <span key={c.code} className="inline-flex items-center gap-0.5 text-slate-300">
                  <CountryFlag countryCode={c.code} flagEmoji={c.flag} size="sm" />
                  {c.code}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">Skenario Utama {timeFilter === 'today' ? 'Hari Ini' : ''}</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-base font-bold text-amber-300 truncate mt-1" title={topScenarioToday.name}>
              {topScenarioToday.name.replace(/^crowdsecurity\//, '')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <span className="text-amber-400 font-bold">{topScenarioToday.count}</span> kejadian tercatat
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">Target Node Pertahanan</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-300 font-mono mt-1 truncate">
              {targetRouterName}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-400 font-bold">100% RAW Hardware Drop</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan IP, negara (US, DE, CN), atau tipe ancaman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Scenario Type Filters */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-500 font-semibold px-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filter:
            </span>
            {[
              { id: 'all', label: 'Semua Tipe' },
              { id: 'scan', label: 'Web Probing / Scan' },
              { id: 'cve', label: 'CVE Exploits' },
              { id: 'useragent', label: 'Bad Bot / User-Agent' },
              { id: 'bruteforce', label: 'Bruteforce' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setThreatTypeFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  threatTypeFilter === f.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === 'map' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Real Map</span>
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === 'leaderboard' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Top Origins ({countryThreatAggregates.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === 'stream' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-rose-400" />
              <span>Live Ticker</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main SOC Real Map Leaflet Container */}
      {activeTab === 'map' && (
        <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
          {/* Map Top Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-slate-200 font-bold">Live Threat Trajectory:</span>
              <span>Negara Penyerang &rarr; MikroTik CCR1036 Gateway (Merauke, Indonesia)</span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Asal Serangan ({uniqueCountriesCount} Negara)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Target Firewall Drop</span>
              </div>
            </div>
          </div>

          {/* REAL LEAFLET MAP CANVAS */}
          <div className="relative w-full h-[520px] rounded-xl border border-slate-800 overflow-hidden shadow-inner z-0">
            <MapContainer
              center={[15, 60]}
              zoom={2.5}
              minZoom={2}
              maxZoom={12}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', background: '#090d16' }}
              className="z-0"
            >
              <TileLayer
                key={`base-${activeTileLayer}`}
                url={MAP_LAYERS[activeTileLayer].url}
                attribution={MAP_LAYERS[activeTileLayer].attribution}
                className={MAP_LAYERS[activeTileLayer].className}
              />
              {MAP_LAYERS[activeTileLayer].referenceUrl && (
                <TileLayer
                  key={`ref-${activeTileLayer}`}
                  url={MAP_LAYERS[activeTileLayer].referenceUrl}
                  attribution=""
                  zIndex={200}
                />
              )}

              {/* Threat Trajectory Arcs */}
              {countryThreatAggregates.map((country) => {
                const isSelected = selectedCountry === country.code;
                return (
                  <Polyline
                    key={`line-${country.code}`}
                    positions={country.trajectory}
                    pathOptions={{
                      color: isSelected ? '#fb7185' : '#f43f5e',
                      weight: isSelected ? 3.5 : Math.max(1.2, Math.min(2.8, country.totalAttacks / 15)),
                      opacity: isSelected ? 0.95 : 0.65,
                      dashArray: '6, 6',
                    }}
                  />
                );
              })}

              {/* Animated Glowing Attack Missile Balls / Particles flying along trajectories */}
              <AnimatedAttackMissiles
                countries={countryThreatAggregates.map((c) => ({
                  code: c.code,
                  trajectory: c.trajectory,
                  totalAttacks: c.totalAttacks,
                  isSelected: selectedCountry === c.code,
                }))}
              />

              {/* Target Router Marker (Merauke, Indonesia) */}
              <Marker
                position={[TARGET_LOCATION.lat, TARGET_LOCATION.lon]}
                icon={createTargetIcon()}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 text-slate-900 text-xs font-mono">
                    <div className="font-bold text-emerald-700 text-sm flex items-center gap-1">
                      <span>🎯 {TARGET_LOCATION.name}</span>
                    </div>
                    <div className="text-slate-600 mt-1">{TARGET_LOCATION.locationName}</div>
                    <div className="mt-1 font-bold text-slate-800">IP: {TARGET_LOCATION.ip}</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-bold">100% RAW Firewall Drop (Active)</div>
                  </div>
                </Popup>
              </Marker>

              {/* Origin Country Threat Markers */}
              {countryThreatAggregates.map((country) => {
                const isSelected = selectedCountry === country.code;
                return (
                  <Marker
                    key={`marker-${country.code}`}
                    position={[country.lat, country.lon]}
                    icon={createOriginIcon(country.code, country.flag, country.totalIps, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelectedCountry(isSelected ? null : country.code);
                      },
                    }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-2 text-slate-900 text-xs min-w-[200px]">
                        <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                          <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <CountryFlag countryCode={country.code} flagEmoji={country.flag} size="sm" />
                            <span>{country.name}</span>
                          </span>
                          <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                            {country.code}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 font-mono text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total IP:</span>
                            <span className="font-bold text-rose-600">{country.totalIps} IP</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Serangan:</span>
                            <span className="font-bold text-slate-800">{country.totalAttacks} Events</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Skenario Dominan:</span>
                            <span className="font-bold text-amber-700">{String(Array.from(country.scenarios.keys())[0] || 'scan').replace(/^crowdsecurity\//, '')}</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Float overlay summary box on bottom-left of map */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono z-[1000] max-w-xs pointer-events-auto">
              <div className="text-slate-300 font-bold text-[11px] mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span>Navigasi Peta Asli Dunia</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Gunakan scroll mouse atau sentuhan untuk Zoom In / Out ke detail kota/negara. Klik ikon lingkaran merah untuk melihat detail ancaman.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top 10 Attack Origin Countries Leaderboard */}
      {(activeTab === 'leaderboard' || activeTab === 'map') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-bold text-white">
                Top Negara Asal Serangan ({timeFilter === 'today' ? 'Hari Ini' : 'Semua'})
              </h4>
              <span className="text-xs text-slate-400">
                ({countryThreatAggregates.length} Negara Terdeteksi)
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Diurutkan berdasarkan intensitas serangan tertinggi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {countryThreatAggregates.slice(0, 9).map((country, idx) => {
              const pct = totalAttacksToday > 0 ? Math.round((country.totalAttacks / totalAttacksToday) * 100) : 0;
              const isSelected = selectedCountry === country.code;

              return (
                <div
                  key={country.code}
                  onClick={() => setSelectedCountry(isSelected ? null : country.code)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/40'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <CountryFlag countryCode={country.code} flagEmoji={country.flag} size="md" />
                      <div>
                        <span className="font-bold text-slate-200 text-xs block">{country.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{country.code} &bull; {country.continent}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono">
                      {country.totalIps} IP
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>{country.totalAttacks} Serangan</span>
                      <span>{pct}% Total</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-rose-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Dominant scenario tag */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[170px]" title={Array.from(country.scenarios.keys())[0] || ''}>
                      {String(Array.from(country.scenarios.keys())[0] || 'http:scan').replace(/^crowdsecurity\//, '')}
                    </span>
                    <span className="text-emerald-400 font-semibold">RAW DROP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Threat Ticker Stream (Today Focus) */}
      {(activeTab === 'stream' || activeTab === 'map') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <h4 className="text-sm font-bold text-white">
                Live Attack Stream Ticker ({timeFilter === 'today' ? 'Hari Ini' : 'Terbaru'})
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Menampilkan {Math.min(15, filteredIps.length)} dari {filteredIps.length} entri IP
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold bg-slate-950/60">
                  <th className="py-2.5 px-3">Negara Asal</th>
                  <th className="py-2.5 px-3">IP Penyerang</th>
                  <th className="py-2.5 px-3">Alasan / Skenario</th>
                  <th className="py-2.5 px-3">Waktu Masuk Address-List</th>
                  <th className="py-2.5 px-3">Mitigasi MikroTik</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredIps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Tidak ada data IP penyerang yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredIps.slice(0, 15).map((item, idx) => {
                    const geo = lookupIpLocation(item.ip);
                    const code = item.country && item.country !== 'GLOBAL' && item.country !== 'XX' ? item.country : geo.country;
                    const name = item.countryName && item.countryName !== 'RouterOS Address-List' ? item.countryName : geo.countryName;
                    const flag = item.flag && item.flag !== '🌐' ? item.flag : geo.flag;

                    return (
                      <tr key={item.ip || idx} className="hover:bg-slate-950/80 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CountryFlag countryCode={code} flagEmoji={flag} size="md" />
                            <span className="font-medium text-slate-200">{name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {code}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-rose-300 font-bold">{item.ip}</span>
                            <button
                              onClick={() => handleCopy(item.ip)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="Salin IP"
                            >
                              {copiedIp === item.ip ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono">
                            {item.reason}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                          {item.creationTime || item.timestamp || 'Hari Ini'}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold font-mono">
                            RAW DROP ({item.listName || 'crowdsec'})
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          {onRemoveIp && (
                            <button
                              onClick={() => onRemoveIp(item.ip)}
                              className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded hover:bg-rose-950/30 transition"
                              title="Hapus IP dari Address List"
                            >
                              Unban
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
