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
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { COUNTRY_COORDINATES, resolveUnifiedIpGeo, seedHydratedIpGeo, useHydratedGeoIp, cleanIpAddress } from '../utils/geoip';
import { CountryFlag } from './CountryFlag';

export interface BlockedIpItem {
  ip: string;
  country?: string;
  flag?: string;
  countryName?: string;
  city?: string;
  region?: string;
  isp?: string;
  asName?: string;
  asn?: string;
  cidr?: string;
  rir?: string;
  netName?: string;
  source?: string;
  lat?: number;
  lon?: number;
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
  rawLogEvents?: any[];
  onRemoveIp?: (ip: string) => void;
  targetRouterName?: string;
  targetRouterIp?: string;
}

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

// Custom DivIcon creator for Country Threat Origins
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

// Custom DivIcon creator for High-Precision City Origins
const createCityIcon = (cityName: string, countryCode: string, flag: string, totalIps: number, isSelected: boolean) => {
  const size = Math.max(26, Math.min(40, 24 + Math.log2(totalIps + 1) * 2.8));
  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${isSelected ? 'rgba(56, 189, 248, 0.45)' : 'rgba(244, 63, 94, 0.25)'}; animation: ${isSelected ? 'ping 1s infinite' : 'pulse 2s infinite'};"></div>
          <div style="position: absolute; width: ${size - 4}px; height: ${size - 4}px; border-radius: 50%; background: ${isSelected ? '#0369a1' : '#881337'}; border: 2px solid ${isSelected ? '#38bdf8' : '#f43f5e'}; box-shadow: 0 0 10px ${isSelected ? '#38bdf8' : '#f43f5e'}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white; font-family: monospace;">
            ${totalIps}
          </div>
        </div>
        <div style="margin-top: 3px; padding: 1px 6px; border-radius: 4px; background: rgba(15, 23, 42, 0.92); border: 1px solid ${isSelected ? 'rgba(56, 189, 248, 0.6)' : 'rgba(244, 63, 94, 0.4)'}; font-size: 9px; font-family: monospace; font-weight: 700; color: ${isSelected ? '#38bdf8' : '#fecdd3'}; white-space: nowrap; pointer-events: none; text-shadow: 0 1px 2px black;">
          ${cityName}
        </div>
      </div>
    `,
    iconSize: [size, size + 18],
    iconAnchor: [size / 2, size / 2],
  });
};

// Check whether an address-list timestamp matches given filter
function isTimestampRecent(timeStr?: string, mode: 'today' | '24h' | 'all' = 'today'): boolean {
  if (mode === 'all') return true;
  if (!timeStr) return false;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const todaySlash = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const todayShort = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;

  if (mode === 'today') {
    return timeStr.includes(todayIso) || timeStr.includes(todaySlash) || timeStr.includes(todayShort);
  }

  if (mode === '24h') {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yestIso = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
    const yestSlash = `${pad(yesterday.getDate())}/${pad(yesterday.getMonth() + 1)}/${yesterday.getFullYear()}`;
    const yestShort = `${pad(yesterday.getDate())}/${pad(yesterday.getMonth() + 1)}`;

    return (
      timeStr.includes(todayIso) ||
      timeStr.includes(todaySlash) ||
      timeStr.includes(todayShort) ||
      timeStr.includes(yestIso) ||
      timeStr.includes(yestSlash) ||
      timeStr.includes(yestShort)
    );
  }

  return true;
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
  rawLogEvents = [],
  onRemoveIp,
  targetRouterName = 'MikroTik CCR1036-12G-4S',
  targetRouterIp = '192.168.77.1',
}) => {
  const [timeFilter, setTimeFilter] = useState<'today' | '24h' | 'all'>('today');
  const [viewGranularity, setViewGranularity] = useState<'city' | 'country'>('city');
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [threatTypeFilter, setThreatTypeFilter] = useState<string>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'leaderboard' | 'stream'>('map');
  const [activeTileLayer, setActiveTileLayer] = useState<keyof typeof MAP_LAYERS>('esri_dark');

  // Map of IPs from live raw logs for 100% synchronized detection
  const liveRawIpMap = useMemo(() => {
    const map = new Map<
      string,
      {
        country: string;
        countryName: string;
        flag: string;
        asName?: string;
        city?: string;
        region?: string;
        lat?: number;
        lon?: number;
        asn?: string;
        cidr?: string;
        rir?: string;
        netName?: string;
        source?: string;
      }
    >();
    if (Array.isArray(rawLogEvents)) {
      rawLogEvents.forEach((e: any) => {
        if (e.sourceIp && e.country) {
          map.set(e.sourceIp, {
            country: e.country,
            countryName: e.countryName || e.country,
            flag: e.flag,
            asName: e.asName,
            city: e.city,
            region: e.region,
            lat: typeof e.lat === 'number' ? e.lat : undefined,
            lon: typeof e.lon === 'number' ? e.lon : undefined,
            asn: e.asn || e.asNum,
            cidr: e.cidr,
            rir: e.rir,
            netName: e.netName,
            source: e.source,
          });
        }
      });
    }
    return map;
  }, [rawLogEvents]);

  // Merge blockedIps (from MikroTik firewall) and rawLogEvents (from CrowdSec Live Raw Logs)
  // Ensures 100% of IPs, flags, countries, and scenarios from Live Raw Logs appear in Geo IP Threat Map!
  const allThreatIps = useMemo(() => {
    const ipMap = new Map<string, BlockedIpItem>();

    // 1. Add all blockedIps from MikroTik Address-List
    if (Array.isArray(blockedIps)) {
      blockedIps.forEach((b) => {
        if (b && b.ip) {
          ipMap.set(b.ip, { ...b });
        }
      });
    }

    // 2. Add or update with real live attacks from rawLogEvents (authoritative source of truth)
    if (Array.isArray(rawLogEvents)) {
      rawLogEvents.forEach((ev: any) => {
        const ip = ev.sourceIp || ev.ip;
        if (!ip) return;

        const existing = ipMap.get(ip);
        if (existing) {
          const shouldOverwriteGeo =
            ev.source === 'apnic_rdap_v2' ||
            (Boolean(ev.country) && ev.country !== 'XX' && existing.source !== 'apnic_rdap_v2');

          ipMap.set(ip, {
            ...existing,
            ...(shouldOverwriteGeo
              ? {
                  country: ev.country || existing.country,
                  countryName: ev.countryName || existing.countryName,
                  flag: ev.flag || existing.flag,
                  city: ev.city || existing.city,
                  region: ev.region || existing.region,
                  lat: typeof ev.lat === 'number' ? ev.lat : existing.lat,
                  lon: typeof ev.lon === 'number' ? ev.lon : existing.lon,
                  isp: ev.asName || existing.isp,
                  asName: ev.asName || existing.asName,
                  asn: ev.asn || ev.asNum || existing.asn,
                  cidr: ev.cidr || existing.cidr,
                  rir: ev.rir || existing.rir,
                  netName: ev.netName || existing.netName,
                  source: ev.source || existing.source,
                }
              : {}),
            reason: ev.scenario || existing.reason,
            count: Math.max(existing.count || 1, ev.eventsCount || 1),
            creationTime: ev.fullDateTimeWIT || ev.timestamp || existing.creationTime,
          });
        } else {
          // If the IP is in Live Raw Logs but not in blockedIps, add it directly so it is visualized on the map!
          ipMap.set(ip, {
            ip,
            country: ev.country || 'XX',
            countryName: ev.countryName || 'Resolving...',
            flag: ev.flag || '🌐',
            city: ev.city,
            region: ev.region,
            lat: typeof ev.lat === 'number' ? ev.lat : undefined,
            lon: typeof ev.lon === 'number' ? ev.lon : undefined,
            reason: ev.scenario || 'crowdsecurity/http-probing',
            action: ev.decision === 'ban' ? 'drop' : 'alert',
            expiresIn: ev.banDuration || '4h 00m',
            creationTime: ev.fullDateTimeWIT || ev.timestamp || new Date().toISOString(),
            origin: 'via Live Raw Logs (CrowdSec)',
            listName: 'crowdsec',
            dynamic: true,
            flagText: 'D',
            count: ev.eventsCount || 1,
            isp: ev.asName || 'Resolving...',
            asName: ev.asName,
            asn: ev.asn || ev.asNum,
            cidr: ev.cidr,
            rir: ev.rir,
            netName: ev.netName,
            source: ev.source,
          });
        }
      });
    }

    return Array.from(ipMap.values());
  }, [blockedIps, rawLogEvents]);

  const allThreatIpStrings = useMemo(
    () => allThreatIps.map((x) => cleanIpAddress(x.ip)).filter(Boolean),
    [allThreatIps]
  );
  const threatGeoVersion = useHydratedGeoIp(allThreatIpStrings);

  useEffect(() => {
    const seedFromItem = (item: any) => {
      const ip = item?.sourceIp || item?.ip;
      if (ip && item?.source === 'apnic_rdap_v2' && item?.country && item.country !== 'XX') {
        seedHydratedIpGeo({
          ip,
          country: item.country,
          countryName: item.countryName || item.country,
          flag: item.flag || '🌐',
          city: item.city || 'Unknown',
          region: item.region || '',
          lat: typeof item.lat === 'number' ? item.lat : 0,
          lon: typeof item.lon === 'number' ? item.lon : 0,
          isp: item.isp || item.asName || '',
          asName: item.asName || item.isp || '',
          asn: item.asn || item.asNum || '',
          cidr: item.cidr || '',
          rir: item.rir || '',
          netName: item.netName || '',
          source: 'apnic_rdap_v2',
        });
      }
    };
    if (Array.isArray(blockedIps)) blockedIps.forEach(seedFromItem);
    if (Array.isArray(rawLogEvents)) rawLogEvents.forEach(seedFromItem);
  }, [blockedIps, rawLogEvents]);

  // Helper to resolve canonical country & city coordinates for an IP item
  // Uses authoritative APNIC RDAP + GeoIP hydrated profile so all panels remain 100% consistent
  const resolveItemGeo = (item: BlockedIpItem) => {
    const liveMatch = liveRawIpMap.get(item.ip);
    const liveIsApnic = liveMatch?.source === 'apnic_rdap_v2';
    const itemIsApnic = item.source === 'apnic_rdap_v2';

    const preferredHint = liveIsApnic
      ? { ...item, ...liveMatch, isp: item.isp || liveMatch?.asName }
      : itemIsApnic
      ? { ...liveMatch, ...item }
      : {
          ...item,
          ...liveMatch,
          country:
            item.country && item.country !== 'GLOBAL' && item.country !== 'XX'
              ? item.country
              : liveMatch?.country,
          countryName:
            item.countryName && item.countryName !== 'RouterOS Address-List'
              ? item.countryName
              : liveMatch?.countryName,
          flag: liveMatch?.flag || item.flag,
          city: item.city || liveMatch?.city,
          region: item.region || liveMatch?.region,
          lat:
            typeof item.lat === 'number' && (item.lat !== 0 || item.lon !== 0)
              ? item.lat
              : liveMatch?.lat,
          lon:
            typeof item.lon === 'number' && (item.lat !== 0 || item.lon !== 0)
              ? item.lon
              : liveMatch?.lon,
          isp: item.isp || liveMatch?.asName,
          asName: item.asName || liveMatch?.asName,
          asn: item.asn || liveMatch?.asn,
          cidr: item.cidr || liveMatch?.cidr,
          rir: item.rir || liveMatch?.rir,
          netName: item.netName || liveMatch?.netName,
          source: liveMatch?.source || item.source,
        };

    const u = resolveUnifiedIpGeo(item.ip, preferredHint);

    return {
      countryCode: u.country,
      countryName: u.countryName,
      flag: u.flag,
      cityName: u.city,
      region: u.region,
      lat: u.lat,
      lon: u.lon,
      isp: u.isp || u.asName || 'Resolving...',
      asName: u.asName,
      asn: u.asn,
      cidr: u.cidr,
      rir: u.rir,
      netName: u.netName,
      source: u.source,
    };
  };

  // Counts for each time filter
  const todayCount = useMemo(() => {
    return allThreatIps.filter((i) => isTimestampRecent(i.creationTime || i.timestamp, 'today')).length;
  }, [allThreatIps]);

  const recent24hCount = useMemo(() => {
    return allThreatIps.filter((i) => isTimestampRecent(i.creationTime || i.timestamp, '24h')).length;
  }, [allThreatIps]);

  // Filter IP data: search takes precedence so searched queries are never hidden by timeFilter
  const filteredIps = useMemo(() => {
    const hasSearch = Boolean(searchQuery.trim());
    const q = searchQuery.toLowerCase().trim();

    return allThreatIps.filter((item) => {
      const g = resolveItemGeo(item);

      // 1. Search query filter
      if (hasSearch) {
        const ipMatch = item.ip.toLowerCase().includes(q);
        const reasonMatch = (item.reason || '').toLowerCase().includes(q);
        const countryNameMatch = (g.countryName || '').toLowerCase().includes(q);
        const countryCodeMatch = (g.countryCode || '').toLowerCase().includes(q);
        const cityMatch = (g.cityName || '').toLowerCase().includes(q);
        const ispMatch = (g.isp || item.isp || '').toLowerCase().includes(q);
        const asNameMatch = (g.asName || '').toLowerCase().includes(q);
        const asnMatch = (g.asn || '').toLowerCase().includes(q);
        const cidrMatch = (g.cidr || '').toLowerCase().includes(q);
        const rirMatch = (g.rir || '').toLowerCase().includes(q);
        const originMatch = (item.origin || '').toLowerCase().includes(q);

        const matchesQuery =
          ipMatch ||
          reasonMatch ||
          countryNameMatch ||
          countryCodeMatch ||
          cityMatch ||
          ispMatch ||
          asNameMatch ||
          asnMatch ||
          cidrMatch ||
          rirMatch ||
          originMatch;
        if (!matchesQuery) return false;
        return true;
      }

      // 2. Time filter (applied when search box is empty)
      if (!isTimestampRecent(item.creationTime || item.timestamp, timeFilter)) {
        return false;
      }

      // 3. Threat type filter
      if (threatTypeFilter !== 'all') {
        const r = (item.reason || '').toLowerCase();
        if (threatTypeFilter === 'scan' && !r.includes('scan') && !r.includes('probing')) return false;
        if (threatTypeFilter === 'cve' && !r.includes('cve') && !r.includes('jira')) return false;
        if (threatTypeFilter === 'useragent' && !r.includes('user-agent')) return false;
        if (threatTypeFilter === 'bruteforce' && !r.includes('bruteforce') && !r.includes('bf')) return false;
      }

      return true;
    });
  }, [allThreatIps, timeFilter, threatTypeFilter, searchQuery, liveRawIpMap, threatGeoVersion]);

  // High-Precision City Aggregates
  const cityThreatAggregates = useMemo(() => {
    const map = new Map<string, {
      key: string;
      cityName: string;
      countryCode: string;
      countryName: string;
      flag: string;
      lat: number;
      lon: number;
      totalIps: number;
      totalAttacks: number;
      scenarios: Map<string, number>;
      ips: BlockedIpItem[];
      trajectory: [number, number][];
      isp?: string;
      asn?: string;
      cidr?: string;
      rir?: string;
    }>();

    filteredIps.forEach((item) => {
      const g = resolveItemGeo(item);
      const key = `${g.countryCode}_${g.cityName}`;

      if (!map.has(key)) {
        const traj = generateCurvedTrajectory([g.lat, g.lon], [TARGET_LOCATION.lat, TARGET_LOCATION.lon]);
        map.set(key, {
          key,
          cityName: g.cityName,
          countryCode: g.countryCode,
          countryName: g.countryName,
          flag: g.flag,
          lat: g.lat,
          lon: g.lon,
          totalIps: 0,
          totalAttacks: 0,
          scenarios: new Map(),
          ips: [],
          trajectory: traj,
          isp: g.isp,
          asn: g.asn,
          cidr: g.cidr,
          rir: g.rir,
        });
      }

      const entry = map.get(key)!;
      entry.totalIps += 1;
      entry.totalAttacks += item.count || 1;
      entry.ips.push(item);

      const scenario = item.reason || 'http:scan';
      entry.scenarios.set(scenario, (entry.scenarios.get(scenario) || 0) + (item.count || 1));
    });

    return Array.from(map.values()).sort((a, b) => b.totalAttacks - a.totalAttacks);
  }, [filteredIps, liveRawIpMap, threatGeoVersion]);

  // Aggregate attacks by Country with Exact Coordinates
  const countryThreatAggregates = useMemo(() => {
    const map = new Map<string, {
      key: string;
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
      const g = resolveItemGeo(item);
      const code = g.countryCode;
      const name = g.countryName;
      const flag = g.flag;

      const coords = COUNTRY_COORDINATES[code] || {
        lat: 0,
        lon: 0,
        capital: 'Unknown',
        name,
        continent: 'Global',
        flag,
      };

      if (!map.has(code)) {
        const traj = generateCurvedTrajectory([coords.lat, coords.lon], [TARGET_LOCATION.lat, TARGET_LOCATION.lon]);
        map.set(code, {
          key: code,
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
  }, [filteredIps, liveRawIpMap, threatGeoVersion]);

  // Active threat nodes for leaderboards / summaries (either city-level or country-level)
  const activeThreatNodes = useMemo(() => {
    if (viewGranularity === 'city') {
      return cityThreatAggregates.map((c) => ({
        key: c.key,
        code: c.key,
        title: `${c.cityName}, ${c.countryName}`,
        cityName: c.cityName,
        countryCode: c.countryCode,
        countryName: c.countryName,
        flag: c.flag,
        lat: c.lat,
        lon: c.lon,
        totalIps: c.totalIps,
        totalAttacks: c.totalAttacks,
        scenarios: c.scenarios,
        ips: c.ips,
        trajectory: c.trajectory,
        isp: c.isp,
        asn: c.asn,
        cidr: c.cidr,
        rir: c.rir,
        isCity: true,
      }));
    }
    return countryThreatAggregates.map((c) => ({
      key: c.code,
      code: c.code,
      title: c.name,
      cityName: undefined,
      countryCode: c.code,
      countryName: c.name,
      flag: c.flag,
      lat: c.lat,
      lon: c.lon,
      totalIps: c.totalIps,
      totalAttacks: c.totalAttacks,
      scenarios: c.scenarios,
      ips: c.ips,
      trajectory: c.trajectory,
      isp: undefined,
      asn: undefined,
      cidr: undefined,
      rir: undefined,
      isCity: false,
    }));
  }, [viewGranularity, cityThreatAggregates, countryThreatAggregates]);

  // Exclude invalid / unresolved / zero-coord entries (e.g. Manual Test Entry 1.0.2.4.5) from map pins & beams
  const mapThreatNodes = useMemo(() => {
    return activeThreatNodes.filter(
      (n) => n.countryCode !== 'XX' && n.countryCode !== 'GLOBAL' && (n.lat !== 0 || n.lon !== 0)
    );
  }, [activeThreatNodes]);

  // Overall summary metrics
  const totalAttacksToday = useMemo(() => {
    return filteredIps.reduce((acc, curr) => acc + (curr.count || 1), 0);
  }, [filteredIps]);

  const uniqueCountriesCount = countryThreatAggregates.length;
  const uniqueCitiesCount = cityThreatAggregates.length;

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
                    {timeFilter === 'today' ? 'Live Harian (Hari Ini)' : timeFilter === '24h' ? '24 Jam Terakhir' : 'Semua Data'}
                  </span>
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Peta Asli Dunia (Dark Cyber GIS) &bull; Visualisasi lintasan serangan real-time ke MikroTik Firewall RAW
              </p>
            </div>
          </div>

          {/* Quick Actions & View Granularity Switch */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Granularity: City vs Country */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 flex items-center gap-1 font-semibold">
                Resolusi:
              </span>
              <button
                type="button"
                onClick={() => setViewGranularity('city')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  viewGranularity === 'city' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan titik koordinat kota presisi asal penyerang (Sydney, Ashburn, Frankfurt, Tokyo, dll.)"
              >
                <span>🏙️ Titik Kota Presisi</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-200 font-mono">
                  {uniqueCitiesCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewGranularity('country')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  viewGranularity === 'country' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan titik per negara makro"
              >
                <span>🌍 Level Negara</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-200 font-mono">
                  {uniqueCountriesCount}
                </span>
              </button>
            </div>

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
                className={`px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                  timeFilter === 'today'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan hanya serangan yang tercatat pada hari ini"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Hari Ini ({todayCount})</span>
              </button>
              <button
                onClick={() => setTimeFilter('24h')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                  timeFilter === '24h'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan serangan dalam 24-48 jam terakhir"
              >
                <span>24 Jam ({recent24hCount})</span>
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                  timeFilter === 'all'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan semua data IP dalam MikroTik Address-List & Log"
              >
                <span>Semua ({allThreatIps.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Informative Alert Banner when Today is 0 but Threat list has items */}
        {timeFilter === 'today' && filteredIps.length === 0 && allThreatIps.length > 0 && !searchQuery.trim() && (
          <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Tidak ada entri serangan baru pada tanggal hari ini. Tersedia <strong>{allThreatIps.length} entri IP</strong> tersimpan dalam MikroTik Address-List &amp; Log.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setTimeFilter('24h')}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg font-bold transition"
              >
                Tampilkan 24 Jam Terakhir ({recent24hCount} IP)
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold transition"
              >
                Tampilkan Semua Data ({allThreatIps.length} IP)
              </button>
            </div>
          </div>
        )}

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">Total IP Terblokir ({timeFilter === 'today' ? 'Hari Ini' : timeFilter === '24h' ? '24 Jam' : 'Total'})</span>
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
              <span className="font-medium">
                {viewGranularity === 'city' ? 'Titik Kota Terdeteksi' : 'Negara Asal Terdeteksi'}
              </span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-300 font-mono mt-1 flex items-baseline gap-2">
              {viewGranularity === 'city' ? uniqueCitiesCount : uniqueCountriesCount}{' '}
              <span className="text-xs font-normal text-slate-500">
                {viewGranularity === 'city' ? 'Titik Kota' : 'Negara'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate font-mono">
              <span>Top:</span>
              {viewGranularity === 'city'
                ? cityThreatAggregates.slice(0, 3).map((c) => (
                    <span key={c.key} className="inline-flex items-center gap-0.5 text-slate-300">
                      <CountryFlag countryCode={c.countryCode} flagEmoji={c.flag} size="sm" />
                      {c.cityName}
                    </span>
                  ))
                : countryThreatAggregates.slice(0, 3).map((c) => (
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
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari IP, kota (Sydney, Frankfurt, Ashburn), negara (AU, DE, US), atau skenario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-28 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
            {searchQuery && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                  {filteredIps.length} hasil
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
                  title="Bersihkan pencarian"
                >
                  ✕
                </button>
              </div>
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
              <span>Top Origins ({viewGranularity === 'city' ? uniqueCitiesCount : uniqueCountriesCount})</span>
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
              <span>
                {viewGranularity === 'city' ? 'Titik Kota Penyerang' : 'Negara Penyerang'} &rarr; MikroTik CCR1036 Gateway (Merauke, Indonesia)
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>
                  Asal Serangan ({mapThreatNodes.length} {viewGranularity === 'city' ? 'Kota' : 'Negara'})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Target Firewall Drop</span>
              </div>
            </div>
          </div>

          {/* REAL LEAFLET MAP CANVAS */}
          <div className="relative w-full h-[540px] rounded-xl border border-slate-800 overflow-hidden shadow-inner z-0">
            <MapContainer
              center={[10, 80]}
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

              {/* Threat Trajectory Arcs (From City or Country to Merauke) */}
              {mapThreatNodes.map((node) => {
                const isSelected = selectedNodeKey === node.key;
                return (
                  <Polyline
                    key={`line-${node.key}`}
                    positions={node.trajectory}
                    pathOptions={{
                      color: isSelected ? '#38bdf8' : '#f43f5e',
                      weight: isSelected ? 3.5 : Math.max(1.2, Math.min(3, node.totalAttacks / 10)),
                      opacity: isSelected ? 0.95 : 0.65,
                      dashArray: '6, 6',
                    }}
                  />
                );
              })}

              {/* Animated Glowing Attack Missile Balls / Energy Beams traveling along trajectories */}
              <AnimatedAttackMissiles
                countries={mapThreatNodes.map((node) => ({
                  code: node.code,
                  trajectory: node.trajectory,
                  totalAttacks: node.totalAttacks,
                  isSelected: selectedNodeKey === node.key,
                }))}
              />

              {/* Target Router Marker (Merauke, Indonesia) */}
              <Marker
                position={[TARGET_LOCATION.lat, TARGET_LOCATION.lon]}
                icon={createTargetIcon()}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2.5 text-slate-900 text-xs font-mono">
                    <div className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                      <span>🎯 {TARGET_LOCATION.name}</span>
                    </div>
                    <div className="text-slate-600 mt-1">{TARGET_LOCATION.locationName}</div>
                    <div className="mt-1 font-bold text-slate-800">IP Gateway: {TARGET_LOCATION.ip}</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      100% RAW Hardware Drop (Active)
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Origin Threat Markers (City or Country granularity) */}
              {mapThreatNodes.map((node) => {
                const isSelected = selectedNodeKey === node.key;
                return (
                  <Marker
                    key={`marker-${node.key}`}
                    position={[node.lat, node.lon]}
                    icon={
                      node.isCity
                        ? createCityIcon(node.cityName!, node.countryCode, node.flag, node.totalIps, isSelected)
                        : createOriginIcon(node.countryCode, node.flag, node.totalIps, isSelected)
                    }
                    eventHandlers={{
                      click: () => {
                        setSelectedNodeKey(isSelected ? null : node.key);
                      },
                    }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-2.5 text-slate-900 text-xs min-w-[240px]">
                        <div className="flex items-center justify-between gap-2 border-b pb-2">
                          <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <CountryFlag countryCode={node.countryCode} flagEmoji={node.flag} size="sm" />
                            <span>{node.title}</span>
                          </span>
                          <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                            {node.countryCode}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1 font-mono text-[11px]">
                          {node.isCity && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">🏙️ Titik Kota:</span>
                              <span className="font-bold text-slate-800">{node.cityName}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">📍 Koordinat:</span>
                            <span className="font-bold text-slate-700">
                              {node.lat.toFixed(4)}, {node.lon.toFixed(4)}
                            </span>
                          </div>
                          {node.isp && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">🏢 Provider / Cloud:</span>
                              <span className="font-bold text-slate-800 text-right truncate max-w-[130px]" title={node.isp}>
                                {node.isp}
                              </span>
                            </div>
                          )}
                          {(node.asn || node.cidr || node.rir) && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">🌐 Registry / ASN:</span>
                              <span className="font-bold text-blue-700 text-right truncate max-w-[140px]" title={`${node.rir || ''} ${node.asn || ''} ${node.cidr || ''}`}>
                                {[node.rir, node.asn, node.cidr].filter(Boolean).join(' • ')}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">🛡️ Total IP Penyerang:</span>
                            <span className="font-bold text-rose-600">{node.totalIps} IP</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">⚡ Total Serangan:</span>
                            <span className="font-bold text-slate-800">{node.totalAttacks} Events</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Skenario Dominan:</span>
                            <span className="font-bold text-amber-700">
                              {String(Array.from(node.scenarios.keys())[0] || 'scan').replace(/^crowdsecurity\//, '')}
                            </span>
                          </div>
                        </div>

                        {/* List of sample IPs in this location */}
                        <div className="mt-2.5 pt-2 border-t text-[10px] space-y-1">
                          <span className="text-slate-500 font-semibold block">Daftar IP di Titik Ini:</span>
                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono">
                            {node.ips.slice(0, 5).map((ipItem) => (
                              <div key={ipItem.ip} className="flex items-center justify-between bg-slate-100 px-1.5 py-0.5 rounded">
                                <span className="font-bold text-slate-800">{ipItem.ip}</span>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`https://www.talosintelligence.com/reputation_center/lookup?search=${encodeURIComponent(ipItem.ip)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-[9px] flex items-center gap-0.5 transition"
                                    title="Cek Reputasi di Cisco Talos Intelligence"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    <span>Talos ↗</span>
                                  </a>
                                  <button
                                    onClick={() => handleCopy(ipItem.ip)}
                                    className="text-slate-400 hover:text-slate-700 p-0.5"
                                    title="Salin IP"
                                  >
                                    {copiedIp === ipItem.ip ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                  {onRemoveIp && (
                                    <button
                                      onClick={() => onRemoveIp(ipItem.ip)}
                                      className="text-rose-600 hover:text-rose-800 font-bold ml-1 text-[9px]"
                                      title="Unban IP"
                                    >
                                      Unban
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {node.ips.length > 5 && (
                              <div className="text-center text-slate-400 text-[9px]">
                                +{node.ips.length - 5} IP lainnya
                              </div>
                            )}
                          </div>
                          {node.ips[0] && (
                            <div className="pt-1 text-center">
                              <a
                                href={`https://www.talosintelligence.com/reputation_center/lookup?search=${encodeURIComponent(node.ips[0].ip)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] border border-blue-200 transition"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Verifikasi Reputasi IP Utama di Cisco Talos ↗</span>
                              </a>
                            </div>
                          )}
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
                <span>Navigasi Peta GIS Interaktif</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Mode saat ini: <strong className="text-rose-400">{viewGranularity === 'city' ? 'Titik Kota Presisi' : 'Per Negara'}</strong>.
                Gunakan scroll untuk Zoom In/Out ke detail jalan/kota. Klik titik marker untuk detail IP dan koordinat lengkap.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Attack Origins Leaderboard (City or Country) */}
      {(activeTab === 'leaderboard' || activeTab === 'map') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-bold text-white">
                Top Asal Serangan ({viewGranularity === 'city' ? 'Kota' : 'Negara'}) &bull;{' '}
                {timeFilter === 'today' ? 'Hari Ini' : timeFilter === '24h' ? '24 Jam Terakhir' : 'Semua Data'}
              </h4>
              <span className="text-xs text-slate-400">
                ({viewGranularity === 'city' ? `${uniqueCitiesCount} Kota` : `${uniqueCountriesCount} Negara`})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setViewGranularity('city')}
                  className={`px-2 py-0.5 rounded ${viewGranularity === 'city' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Per Kota
                </button>
                <button
                  onClick={() => setViewGranularity('country')}
                  className={`px-2 py-0.5 rounded ${viewGranularity === 'country' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Per Negara
                </button>
              </div>
              <span className="text-xs font-mono text-slate-400">Diurutkan intensitas tertinggi</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeThreatNodes.slice(0, 9).map((node, idx) => {
              const pct = totalAttacksToday > 0 ? Math.round((node.totalAttacks / totalAttacksToday) * 100) : 0;
              const isSelected = selectedNodeKey === node.key;

              return (
                <div
                  key={node.key}
                  onClick={() => setSelectedNodeKey(isSelected ? null : node.key)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/40'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <CountryFlag countryCode={node.countryCode} flagEmoji={node.flag} size="md" />
                      <div>
                        <span className="font-bold text-slate-200 text-xs block truncate max-w-[150px]">
                          {node.isCity ? `${node.cityName}, ${node.countryCode}` : node.countryName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {node.isCity
                            ? (node.lat === 0 && node.lon === 0) || node.countryCode === 'XX'
                              ? 'N/A (Manual)'
                              : `${node.lat.toFixed(2)}, ${node.lon.toFixed(2)}`
                            : node.countryCode}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono">
                      {node.totalIps} IP
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>{node.totalAttacks} Serangan</span>
                      <span>{pct}% Total</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-rose-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Dominant scenario tag & City label */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[170px]" title={Array.from(node.scenarios.keys())[0] || ''}>
                      {String(Array.from(node.scenarios.keys())[0] || 'http:scan').replace(/^crowdsecurity\//, '')}
                    </span>
                    <span className="text-emerald-400 font-semibold">RAW DROP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Threat Ticker Stream */}
      {(activeTab === 'stream' || activeTab === 'map') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <h4 className="text-sm font-bold text-white">
                Live Attack Stream Ticker ({timeFilter === 'today' ? 'Hari Ini' : timeFilter === '24h' ? '24 Jam Terakhir' : 'Semua Data'})
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Menampilkan {Math.min(20, filteredIps.length)} dari {filteredIps.length} entri IP
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold bg-slate-950/60">
                  <th className="py-2.5 px-3">Kota & Negara Asal</th>
                  <th className="py-2.5 px-3">IP Penyerang & ISP</th>
                  <th className="py-2.5 px-3">Koordinat Presisi</th>
                  <th className="py-2.5 px-3">Alasan / Skenario</th>
                  <th className="py-2.5 px-3">Waktu Masuk Address-List</th>
                  <th className="py-2.5 px-3">Mitigasi MikroTik</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredIps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Tidak ada data IP penyerang yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredIps.slice(0, 20).map((item, idx) => {
                    const g = resolveItemGeo(item);

                    return (
                      <tr key={item.ip || idx} className="hover:bg-slate-950/80 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CountryFlag countryCode={g.countryCode} flagEmoji={g.flag} size="md" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-200">{g.cityName}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                  {g.countryCode}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {g.countryName}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          <div>
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
                            <span className="text-[10px] text-slate-400 truncate max-w-[170px] block" title={g.isp}>
                              {g.isp}
                            </span>
                            {(g.asn || g.rir || g.cidr) && (
                              <span className="text-[9px] text-slate-500 truncate max-w-[170px] block">
                                {[g.rir, g.asn, g.cidr].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                          {(g.lat === 0 && g.lon === 0) || g.source === 'invalid_ip' ? (
                            <span className="text-slate-500">N/A (Manual)</span>
                          ) : (
                            <>
                              <span className="text-cyan-400 font-bold">{g.lat.toFixed(4)}</span>,{' '}
                              <span className="text-cyan-400 font-bold">{g.lon.toFixed(4)}</span>
                            </>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono">
                            {item.reason}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                          {item.creationTime || item.timestamp || 'Hari Ini'}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold font-mono">
                            RAW DROP ({item.listName || 'crowdsec'})
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`https://www.talosintelligence.com/reputation_center/lookup?search=${encodeURIComponent(item.ip)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold inline-flex items-center gap-1 transition"
                              title="Verifikasi Reputasi IP di Cisco Talos Intelligence"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Talos ↗</span>
                            </a>
                            {onRemoveIp && (
                              <button
                                onClick={() => onRemoveIp(item.ip)}
                                className="text-slate-500 hover:text-rose-400 text-xs px-2 py-0.5 rounded hover:bg-rose-950/30 transition font-mono"
                                title="Hapus IP dari Address List"
                              >
                                Unban
                              </button>
                            )}
                          </div>
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

