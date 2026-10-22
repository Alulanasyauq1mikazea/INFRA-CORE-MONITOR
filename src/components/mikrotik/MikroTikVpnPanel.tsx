import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Key,
  Globe,
  Radio,
  Server,
  Lock,
  Zap,
  CheckCircle2,
  Copy,
  Terminal,
  Activity,
  UserCheck,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowDownUp,
  Sliders,
  Check,
  Users,
  Info,
  AlertTriangle,
  XCircle,
  FileText,
  X,
  Laptop,
  HelpCircle,
  Download,
  WifiOff,
} from 'lucide-react';

interface VpnInterface {
  name: string;
  type: string;
  port: number;
  mtu: number;
  publicKey?: string;
  status: 'active' | 'standby' | 'ready_to_config' | 'disabled';
  ip: string;
  rx: string;
  tx: string;
  peersCount: number;
  comment: string;
}

interface VpnPeer {
  id: string;
  name: string;
  type: 'WireGuard' | 'L2TP/IPsec' | 'SSTP' | 'OpenVPN' | 'IPsec';
  interfaceName: string;
  remoteIp: string;
  assignedIp: string;
  listenPort: number;
  status: 'active' | 'standby' | 'ready_to_config' | 'disabled';
  connectionState?: 'connected' | 'idle' | 'never_connected' | 'phase1_down' | 'disabled';
  statusLabel?: string;
  disconnectReason?: string;
  disconnectDetail?: string;
  solutionHint?: string;
  lastHandshake?: string;
  trafficRx?: string;
  trafficTx?: string;
  uptime?: string;
  comment: string;
  disabled?: boolean;
  publicKey?: string;
}

export interface PeerDiagnosticResult {
  stateType: 'connected' | 'idle' | 'never_connected' | 'phase1_down' | 'disabled';
  statusBadge: {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    dotClass: string;
  };
  reasonSummary: string;
  reasonDetail: string;
  troubleshootingSteps: string[];
  clientConfigSnippet?: string;
  routerOsCheckCmd: string;
  actionTitle: string;
}

export function getPeerDiagnostic(peer: VpnPeer, routerIp: string, routerName: string): PeerDiagnosticResult {
  const isWireguard = peer.type === 'WireGuard';
  const isIpsec = peer.type === 'IPsec';

  if (peer.disabled) {
    return {
      stateType: 'disabled',
      statusBadge: {
        label: 'Disabled',
        bgClass: 'bg-purple-950/60',
        textClass: 'text-purple-300',
        borderClass: 'border-purple-500/40',
        dotClass: 'bg-purple-400',
      },
      reasonSummary: 'Peer Dinonaktifkan di RouterOS',
      reasonDetail: `Akun/peer "${peer.name}" dinonaktifkan (disabled) pada menu /interface wireguard peers sehingga ditolak saat handshake.`,
      troubleshootingSteps: [
        'Buka WinBox atau WebFig pada router MikroTik.',
        `Buka menu WireGuard > Peers, cari baris komentar "${peer.name}".`,
        'Klik kanan lalu pilih "Enable" (atau centang aktifkan).',
        `Atau eksekusi perintah terminal: /interface wireguard peers enable [find comment="${peer.name}"]`,
      ],
      clientConfigSnippet: undefined,
      routerOsCheckCmd: `/interface wireguard peers print detail where comment="${peer.name}"`,
      actionTitle: 'Aktifkan Peer di RouterOS',
    };
  }

  if (isWireguard) {
    const rawHandshake = (peer.lastHandshake || '').trim();
    const isNever =
      !rawHandshake ||
      rawHandshake.toLowerCase().includes('belum') ||
      rawHandshake === '-' ||
      rawHandshake.toLowerCase().includes('never');

    let durationSec = Infinity;
    if (!isNever) {
      if (/^\d+$/.test(rawHandshake)) {
        durationSec = parseInt(rawHandshake, 10);
      } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(rawHandshake)) {
        const [h, m, s] = rawHandshake.split(':').map(Number);
        durationSec = h * 3600 + m * 60 + s;
      } else if (/^\d{1,2}:\d{2}$/.test(rawHandshake)) {
        const [m, s] = rawHandshake.split(':').map(Number);
        durationSec = m * 60 + s;
      } else {
        let sec = 0;
        const d = rawHandshake.match(/(\d+)d/);
        const h = rawHandshake.match(/(\d+)h/);
        const m = rawHandshake.match(/(\d+)m(?!s)/);
        const s = rawHandshake.match(/(\d+)s/);
        if (d) sec += parseInt(d[1], 10) * 86400;
        if (h) sec += parseInt(h[1], 10) * 3600;
        if (m) sec += parseInt(m[1], 10) * 60;
        if (s) sec += parseInt(s[1], 10);
        durationSec = sec > 0 ? sec : Infinity;
      }
    }

    const hasActiveEndpoint =
      peer.remoteIp &&
      !peer.remoteIp.includes('0.0.0.0') &&
      !peer.remoteIp.toLowerCase().includes('dynamic');

    const rxNum = parseFloat(peer.trafficRx || '0');
    const txNum = parseFloat(peer.trafficTx || '0');
    const hasTraffic = rxNum > 0 || txNum > 0;

    const isStandbyConnected =
      (hasActiveEndpoint || (hasTraffic && durationSec <= 86400) || peer.status === 'active') &&
      !isNever;

    const wgClientConfig = `[Interface]
# Profil WireGuard Client untuk: ${peer.name}
# Masukkan PrivateKey perangkat client (${peer.name}) di bawah ini:
PrivateKey = <MASUKKAN_PRIVATE_KEY_CLIENT_DISINI>
Address = ${peer.assignedIp.includes('/') ? peer.assignedIp : `${peer.assignedIp}/24`}
DNS = 192.168.77.1, 1.1.1.1, 8.8.8.8

[Peer]
# Server Gateway: ${routerName}
PublicKey = <ROUTER_WIREGUARD_PUBLIC_KEY>
Endpoint = ${routerIp}:${peer.listenPort || 51820}
# Catatan: Jika client terhubung dari internet luar, gunakan IP Publik / DDNS Router
AllowedIPs = 0.0.0.0/0
# OPSI OTOMATIS: Tambahkan baris di bawah agar handshake terus diperbarui otomatis tiap 25 detik
PersistentKeepalive = 25`;

    if (isNever && !hasActiveEndpoint && !hasTraffic) {
      return {
        stateType: 'never_connected',
        statusBadge: {
          label: 'Belum Konek (Standby)',
          bgClass: 'bg-amber-950/60',
          textClass: 'text-amber-300',
          borderClass: 'border-amber-500/40',
          dotClass: 'bg-amber-400',
        },
        reasonSummary: 'Belum Pernah Handshake • Menunggu Client Aktifkan Tunnel',
        reasonDetail: `Router MikroTik siap di port UDP ${peer.listenPort || 51820}, namun router belum pernah menerima paket handshake awal dari client "${peer.name}". Aplikasi WireGuard di HP/Laptop kemungkinan belum dinyalakan atau endpoint belum sesuai.`,
        troubleshootingSteps: [
          `Buka aplikasi WireGuard di HP / Laptop client (${peer.name}) dan pastikan tombol saklar tunnel dalam posisi "ON" / Active.`,
          `Periksa alamat Endpoint di client. Jika client berada di internet luar kantor, pastikan menggunakan IP Publik / domain DDNS router, bukan IP lokal ${routerIp}.`,
          `Pastikan port UDP ${peer.listenPort || 51820} dibuka / di-forwarding ke MikroTik jika berada di belakang modem ISP.`,
          `Pastikan Public Key client cocok dengan AllowedIPs (${peer.assignedIp}).`,
        ],
        clientConfigSnippet: wgClientConfig,
        routerOsCheckCmd: `/interface wireguard peers print detail where comment="${peer.name}"`,
        actionTitle: 'Panduan Setup Client WireGuard',
      };
    }

    if (durationSec <= 180) {
      return {
        stateType: 'connected',
        statusBadge: {
          label: 'Connected (Aktif)',
          bgClass: 'bg-emerald-950/60',
          textClass: 'text-emerald-300',
          borderClass: 'border-emerald-500/40',
          dotClass: 'bg-emerald-400 animate-pulse',
        },
        reasonSummary: `Terhubung Aktif (Handshake normal ${rawHandshake})`,
        reasonDetail: `Koneksi WireGuard aktif, stabil, dan rutin bertukar handshake (< 3 menit). Traffic data terenkripsi mengalir lancar antara client "${peer.name}" dan router.`,
        troubleshootingSteps: [
          'Sesi tunnel aktif dan normal.',
          `Alokasi IP Tunnel: ${peer.assignedIp}`,
          `Akumulasi Transfer Data: Rx ${peer.trafficRx || '0 B'} / Tx ${peer.trafficTx || '0 B'}`,
          `Endpoint Remote: ${peer.remoteIp}`,
        ],
        clientConfigSnippet: wgClientConfig,
        routerOsCheckCmd: `/interface wireguard peers print stats where comment="${peer.name}"`,
        actionTitle: 'Informasi Status Koneksi',
      };
    }

    // Jika client memiliki endpoint aktif atau ada data traffic, WireGuard tetap TERHUBUNG dalam mode Standby hemat daya
    if (isStandbyConnected) {
      const cleanHandshake = rawHandshake.replace(' yang lalu', '');
      return {
        stateType: 'connected', // Terhubung normal, sehingga masuk di filter 'Terhubung'
        statusBadge: {
          label: 'Connected (Standby)',
          bgClass: 'bg-teal-950/70',
          textClass: 'text-teal-300',
          borderClass: 'border-teal-500/50',
          dotClass: 'bg-teal-400',
        },
        reasonSummary: `Terhubung Normal • Mode Standby (${cleanHandshake} lalu)`,
        reasonDetail: `Tunnel WireGuard terhubung dan endpoint client aktif (${peer.remoteIp}). Handshake terakhir diterima ${cleanHandshake} yang lalu karena client sedang dalam mode standby/hemat daya (idle). Begitu ada transmisi data atau ping, handshake akan ter-refresh otomatis.`,
        troubleshootingSteps: [
          `Status: Tunnel WireGuard AKTIF & TERHUBUNG dari endpoint ${peer.remoteIp}.`,
          'Mekanisme WireGuard: Karena WireGuard bersifat connectionless (UDP), jika tidak ada transmisi data aktif ke IP internal kantor, router tidak meminta handshake baru untuk menghemat baterai HP/Laptop.',
          'Cara Jadikan Selalu Otomatis (24/7): Tambahkan baris "PersistentKeepalive = 25" di bawah [Peer] pada aplikasi WireGuard client agar handshake terus diperbarui otomatis tiap 25 detik.',
          `Atau aktifkan auto-keepalive di RouterOS: /interface wireguard peers set [find comment="${peer.name}"] persistent-keepalive=25s`,
          `Bangunkan Instan: Klik tombol "⚡ Ping Wakeup" pada tabel untuk mengirim paket ICMP ke ${peer.assignedIp}, handshake akan ter-refresh otomatis dalam 1 detik.`,
        ],
        clientConfigSnippet: wgClientConfig,
        routerOsCheckCmd: `/tool ping ${peer.assignedIp.replace('/32', '')} count=3`,
        actionTitle: 'Detail Sesi Standby WireGuard',
      };
    }

    // Jika handshake > 180s dan tidak ada endpoint aktif sama sekali
    const cleanHandshake = rawHandshake.replace(' yang lalu', '');
    return {
      stateType: 'idle',
      statusBadge: {
        label: 'Sesi Terputus / Idle',
        bgClass: 'bg-amber-950/70',
        textClass: 'text-amber-300',
        borderClass: 'border-amber-500/50',
        dotClass: 'bg-amber-400',
      },
      reasonSummary: `Sesi Terputus / Idle (${cleanHandshake} lalu)`,
      reasonDetail: `Handshake terakhir diterima ${cleanHandshake} yang lalu (melebihi batas toleransi 3 menit WireGuard). Sesi saat ini idle karena perangkat client kemungkinan sleep, layar terkunci, berpindah WiFi, atau aplikasi WireGuard dimatikan.`,
      troubleshootingSteps: [
        `Buka kembali aplikasi WireGuard di perangkat ${peer.name} untuk memicu rekoneksi handshake.`,
        'Jika status di aplikasi client stuck di "Connecting", matikan saklar VPN lalu nyalakan kembali.',
        'Pastikan perangkat client memiliki koneksi internet aktif.',
        `Tes ping dari router ke client: /tool ping ${peer.assignedIp.replace('/32', '')} count=3`,
        'Pastikan opsi "PersistentKeepalive = 25" aktif pada konfigurasi client agar tunnel tidak sleep.',
      ],
      clientConfigSnippet: wgClientConfig,
      routerOsCheckCmd: `/tool ping ${peer.assignedIp.replace('/32', '')} count=3`,
      actionTitle: 'Cara Mengatasi Sesi Terputus',
    };
  }

  if (isIpsec) {
    const isDown =
      peer.uptime?.toLowerCase().includes('down') ||
      peer.lastHandshake?.toLowerCase().includes('down') ||
      peer.status === 'standby';

    if (isDown) {
      return {
        stateType: 'phase1_down',
        statusBadge: {
          label: 'Phase 1 Down',
          bgClass: 'bg-rose-950/60',
          textClass: 'text-rose-300',
          borderClass: 'border-rose-500/40',
          dotClass: 'bg-rose-500',
        },
        reasonSummary: 'IKE Phase 1 Down • Remote Gateway Tidak Merespons Port 500/4500',
        reasonDetail: `Router MikroTik belum berhasil melakukan negosiasi kunci Phase 1 dengan remote gateway (${peer.remoteIp}). Gateway lawan tidak merespons, port UDP 500/4500 diblokir ISP, atau Pre-Shared Key (PSK) / Proposal tidak seragam.`,
        troubleshootingSteps: [
          `Pastikan remote gateway (${peer.remoteIp}) dalam kondisi aktif dan IP publiknya dapat di-ping.`,
          'Pastikan port UDP 500 (IKE), UDP 4500 (NAT-Traversal), dan protokol IP 50 (ESP) tidak diblokir oleh firewall ISP.',
          'Pastikan Pre-Shared Key (Secret) pada router MikroTik dan remote gateway persis sama tanpa spasi ekstra.',
          'Periksa apakah Proposal IPsec (AES Enkripsi, SHA Auth, dan DH Group) di kedua sisi sudah cocok.',
          'Pastikan aturan NAT Bypass (accept rule) telah dibuat agar paket IPsec tidak ter-masquerade.',
        ],
        clientConfigSnippet: undefined,
        routerOsCheckCmd: `/log print where topics~"ipsec"`,
        actionTitle: 'Checklist Troubleshooting IPsec',
      };
    }

    return {
      stateType: 'connected',
      statusBadge: {
        label: 'Connected (Phase 1 & 2 UP)',
        bgClass: 'bg-emerald-950/60',
        textClass: 'text-emerald-300',
        borderClass: 'border-emerald-500/40',
        dotClass: 'bg-emerald-400 animate-pulse',
      },
      reasonSummary: 'Tunnel Site-to-Site Established',
      reasonDetail: `Enkripsi IPsec Phase 1 dan Phase 2 SA telah terbentuk dengan remote gateway ${peer.remoteIp}. Komunikasi antar kantor cabang berjalan aman terenkripsi.`,
      troubleshootingSteps: [
        'Tunnel IPsec SA established.',
        `Uptime SA: ${peer.uptime}`,
        `Enkripsi hardware ESP aktif: Rx ${peer.trafficRx} / Tx ${peer.trafficTx}`,
      ],
      clientConfigSnippet: undefined,
      routerOsCheckCmd: `/ip ipsec installed-sa print`,
      actionTitle: 'Detail Status IPsec',
    };
  }

  // PPP / L2TP / SSTP
  if (peer.status === 'active') {
    return {
      stateType: 'connected',
      statusBadge: {
        label: 'Connected',
        bgClass: 'bg-emerald-950/60',
        textClass: 'text-emerald-300',
        borderClass: 'border-emerald-500/40',
        dotClass: 'bg-emerald-400 animate-pulse',
      },
      reasonSummary: `User PPP Terautentikasi (${peer.type})`,
      reasonDetail: `User ${peer.name} aktif login pada server ${peer.type} dengan IP alokasi tunnel ${peer.assignedIp}.`,
      troubleshootingSteps: ['Sesi dial VPN aktif normal.'],
      clientConfigSnippet: undefined,
      routerOsCheckCmd: `/ppp active print where name="${peer.name}"`,
      actionTitle: 'Informasi User Login',
    };
  }

  return {
    stateType: 'never_connected',
    statusBadge: {
      label: 'Offline (Tidak Login)',
      bgClass: 'bg-slate-900',
      textClass: 'text-slate-400',
      borderClass: 'border-slate-800',
      dotClass: 'bg-slate-500',
    },
    reasonSummary: 'Client Tidak Sedang Login',
    reasonDetail: `User ${peer.name} belum melakukan dial / koneksi VPN dari perangkatnya ke server ${peer.type}.`,
    troubleshootingSteps: [
      `User ${peer.name} belum melakukan dial koneksi VPN.`,
      'Pastikan username dan password di sisi client cocok dengan secret MikroTik.',
      `Pastikan server ${peer.type} di MikroTik berstatus enabled.`,
    ],
    clientConfigSnippet: undefined,
    routerOsCheckCmd: `/ppp secret print where name="${peer.name}"`,
    actionTitle: 'Status Akun PPP',
  };
}

interface IpsecPolicy {
  id: string;
  srcAddress: string;
  dstAddress: string;
  protocol: string;
  action: string;
  tunnel: boolean;
  ph2State: 'established' | 'negotiating' | 'standby' | 'expired';
  encAlgorithm: string;
  authAlgorithm: string;
  pfsGroup: string;
  activeSaCount: number;
  comment: string;
}

interface IpsecActivePeer {
  id: string;
  remoteAddress: string;
  localAddress: string;
  state: string;
  side: 'initiator' | 'responder';
  uptime: string;
  authMethod: string;
  rxBytes: string;
  txBytes: string;
  comment: string;
}

export const MikroTikVpnPanel: React.FC<{
  routerIp: string;
  routerName: string;
  onSendToTerminal?: (cmd: string) => void;
}> = ({ routerIp, routerName, onSendToTerminal }) => {
  const [activeSubTab, setActiveSubTab] = useState<'interfaces' | 'peers' | 'ipsec' | 'setup_wizard'>('interfaces');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<'wireguard' | 'ipsec_site2site' | 'l2tp' | 'sstp'>('ipsec_site2site');
  
  // Real-Time Polling & Live Data States
  const [isLoading, setIsLoading] = useState(false);
  const [isSilentSyncing, setIsSilentSyncing] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('Baru saja');
  const [syncMode, setSyncMode] = useState<'live_routeros_rest' | 'simulated_live_config' | 'cached_live' | 'offline'>('live_routeros_rest');
  const [autoPollInterval, setAutoPollInterval] = useState<number>(5); // 5s default
  const [isAutoPollActive, setIsAutoPollActive] = useState<boolean>(true);
  const [nextRefreshCountdown, setNextRefreshCountdown] = useState<number>(5);

  // Peer Ping & Keepalive Actions State
  const [pingLoadingMap, setPingLoadingMap] = useState<Record<string, boolean>>({});
  const [pingResultMap, setPingResultMap] = useState<Record<string, string>>({});
  const [keepaliveLoadingMap, setKeepaliveLoadingMap] = useState<Record<string, boolean>>({});

  // IPsec dedicated states
  const [ipsecPolicies, setIpsecPolicies] = useState<IpsecPolicy[]>([]);
  const [ipsecActivePeers, setIpsecActivePeers] = useState<IpsecActivePeer[]>([]);

  // Dynamic VPN State
  const [vpnInterfaces, setVpnInterfaces] = useState<VpnInterface[]>([]);
  const [vpnPeers, setVpnPeers] = useState<VpnPeer[]>([]);

  // Fetch Live VPN metrics from backend
  const fetchLiveVpnData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsLoading(true);
    } else {
      setIsSilentSyncing(true);
    }
    const t0 = performance.now();
    try {
      const url = `/api/mikrotik/vpn?host=${encodeURIComponent(routerIp)}${isManual ? '&force=true' : ''}`;
      const res = await fetch(url);
      const elapsed = Math.round(performance.now() - t0);
      setApiLatency(elapsed);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVpnInterfaces(Array.isArray(data.interfaces) ? data.interfaces : []);
          setVpnPeers(Array.isArray(data.peers) ? data.peers : []);
          setIpsecPolicies(Array.isArray(data.ipsecPolicies) ? data.ipsecPolicies : []);
          setIpsecActivePeers(Array.isArray(data.ipsecActivePeers) ? data.ipsecActivePeers : []);
          setSyncMode(data.mode || 'live_routeros_rest');
          setLastUpdated(new Date().toLocaleTimeString());
          setApiError(null);
        } else {
          // Unreachable or offline - Display real state with NO dummy data
          setVpnInterfaces(Array.isArray(data.interfaces) ? data.interfaces : []);
          setVpnPeers(Array.isArray(data.peers) ? data.peers : []);
          setIpsecPolicies(Array.isArray(data.ipsecPolicies) ? data.ipsecPolicies : []);
          setIpsecActivePeers(Array.isArray(data.ipsecActivePeers) ? data.ipsecActivePeers : []);
          setSyncMode('offline');
          setApiError(data.error || 'Router tidak dapat dijangkau dari server');
        }
      } else {
        setSyncMode('offline');
        setApiError(`HTTP error: ${res.status}`);
      }
    } catch (err: any) {
      setApiError(err?.message || 'Gagal terhubung ke router');
    } finally {
      setIsLoading(false);
      setIsSilentSyncing(false);
    }
  }, [routerIp]);

  // Ping Wakeup Handler (Sends ICMP ping through router to trigger handshake)
  const handlePingWakeup = useCallback(async (peer: VpnPeer) => {
    if (!peer.assignedIp || peer.assignedIp === '-') return;
    const peerKey = peer.id;
    setPingLoadingMap((prev) => ({ ...prev, [peerKey]: true }));
    try {
      const res = await fetch('/api/mikrotik/vpn/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: routerIp,
          target: peer.assignedIp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPingResultMap((prev) => ({
          ...prev,
          [peerKey]: `ICMP Ping terkirim ke ${peer.assignedIp.replace('/32', '')}. Handshake otomatis diperbarui!`,
        }));
        setTimeout(() => {
          fetchLiveVpnData();
        }, 1000);
        setTimeout(() => {
          setPingResultMap((prev) => {
            const next = { ...prev };
            delete next[peerKey];
            return next;
          });
        }, 5000);
      }
    } catch (e) {
      console.error('Ping failed:', e);
    } finally {
      setPingLoadingMap((prev) => ({ ...prev, [peerKey]: false }));
    }
  }, [routerIp, fetchLiveVpnData]);

  // Enable Auto-Keepalive on RouterOS Handler
  const handleEnableKeepalive = useCallback(async (peer: VpnPeer) => {
    const peerKey = peer.id;
    setKeepaliveLoadingMap((prev) => ({ ...prev, [peerKey]: true }));
    try {
      const res = await fetch('/api/mikrotik/vpn/set-keepalive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: routerIp,
          peerId: peer.id,
          peerComment: peer.name,
          keepalive: 25,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPingResultMap((prev) => ({
          ...prev,
          [peerKey]: `Auto-Keepalive 25s diterapkan pada MikroTik! Peer "${peer.name}" akan otomatis aktif 24/7.`,
        }));
        setTimeout(() => {
          fetchLiveVpnData(true);
        }, 1200);
        setTimeout(() => {
          setPingResultMap((prev) => {
            const next = { ...prev };
            delete next[peerKey];
            return next;
          });
        }, 6000);
      }
    } catch (e) {
      console.error('Keepalive error:', e);
    } finally {
      setKeepaliveLoadingMap((prev) => ({ ...prev, [peerKey]: false }));
    }
  }, [routerIp, fetchLiveVpnData]);

  // Initial and Periodic Polling
  useEffect(() => {
    fetchLiveVpnData(false);
  }, [fetchLiveVpnData]);

  useEffect(() => {
    if (!isAutoPollActive || autoPollInterval <= 0) return;
    const interval = setInterval(() => {
      fetchLiveVpnData(false);
    }, autoPollInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveVpnData, isAutoPollActive, autoPollInterval]);

  // Polling Countdown Ticker
  useEffect(() => {
    if (!isAutoPollActive || autoPollInterval <= 0) return;
    setNextRefreshCountdown(autoPollInterval);
    const ticker = setInterval(() => {
      setNextRefreshCountdown((prev) => (prev <= 1 ? autoPollInterval : prev - 1));
    }, 1000);
    return () => clearInterval(ticker);
  }, [isAutoPollActive, autoPollInterval]);

  // Quick Setup Scripts for MikroTik RouterOS
  const setupScripts = {
    ipsec_site2site: `# =========================================================================
# SCRIPT KONFIGURASI IPSEC SITE-TO-SITE: MIKROTIK (HQ) <--> REMOTE GATEWAY (BRANCH)
# Template Standar Enkripsi VPN Site-to-Site IKEv2 / IKEv1
# =========================================================================

# -------------------------------------------------------------------------
# PARAMETER CONTOH (SILAKAN SESUAIKAN DENGAN JARINGAN ANDA):
# - Router Lokal (HQ)       : MikroTik RouterOS (IP Public: 203.0.113.10)
# - Router Remote (Branch)  : Remote VPN Gateway (IP Public: 198.51.100.25)
# - Subnet Lokal (Src)      : 192.168.10.0/24 (LAN Kantor Pusat)
# - Subnet Remote (Dst)     : 192.168.20.0/24 (LAN Kantor Cabang)
# - Pre-Shared Key (PSK)    : SecretPreSharedKey2026!
# - Phase 1 (IKEv2/IKEv1)   : DH Group 14/2, AES-256, SHA-256, Lifetime 86400s
# - Phase 2 (ESP Proposal)  : AES-256, SHA-256, PFS Group 14, Lifetime 3600s
# -------------------------------------------------------------------------

# 1. HAPUS / BERSIHKAN KONFIGURASI LAMA JIKA ADA DUPLIKAT (Opsional)
/ip ipsec profile remove [find name=prof-site2site-ikev2]
/ip ipsec proposal remove [find name=prop-site2site-esp]
/ip ipsec peer remove [find name=peer-site2site-branch]

# 2. BUAT IPSEC PROFILE (PHASE 1: IKE, DH GROUP, AES-256, SHA-256)
/ip ipsec profile add name=prof-site2site-ikev2 hash-algorithm=sha256 enc-algorithm=aes-256 dh-group=modp2048 exchange-mode=ike2 lifetime=1d nat-traversal=yes comment="Site-to-Site Phase 1 Profile"

# 3. BUAT IPSEC PROPOSAL (PHASE 2: ESP AES-256, AUTH SHA-256, PFS MODP2048, LIFETIME 3600s)
/ip ipsec proposal add name=prop-site2site-esp auth-algorithms=sha256 enc-algorithms=aes-256-cbc,aes-256-gcm pfs-group=modp2048 lifetime=1h comment="Site-to-Site Phase 2 Proposal"

# 4. BUAT IPSEC PEER KE GATEWAY REMOTE (Contoh: 198.51.100.25)
/ip ipsec peer add name=peer-site2site-branch address=198.51.100.25/32 local-address=203.0.113.10 profile=prof-site2site-ikev2 exchange-mode=ike2 send-initial-contact=yes comment="Peer Remote Branch Gateway"

# 5. BUAT IPSEC IDENTITY (MASUKKAN PRE-SHARED KEY PSK ANDA)
/ip ipsec identity add peer=peer-site2site-branch secret="SecretPreSharedKey2026!" auth-method=pre-shared-key generate-policy=no comment="PSK Branch Tunnel"

# 6. BUAT IPSEC POLICY (192.168.10.0/24 <---> 192.168.20.0/24 ENCRYPT TUNNEL)
/ip ipsec policy add src-address=192.168.10.0/24 dst-address=192.168.20.0/24 tunnel=yes proposal=prop-site2site-esp peer=peer-site2site-branch action=encrypt level=require comment="Traffic Selector LAN HQ <-> Branch"

# 7. SANGAT PENTING: BYPASS NAT DI FIREWALL PALING ATAS
# Paket antar Subnet LAN TIDAK BOLEH terkena NAT Masquerade internet!
/ip firewall nat add chain=srcnat action=accept src-address=192.168.10.0/24 dst-address=192.168.20.0/24 comment="[BYPASS NAT] IPsec LAN Subnet" place-before=1

# 8. SANGAT PENTING: BYPASS FASTTRACK FIREWALL DI FILTER RULES
/ip firewall filter add chain=forward action=accept ipsec-policy=in,ipsec comment="[ACCEPT] Inbound IPsec Tunnel" place-before=1
/ip firewall filter add chain=forward action=accept ipsec-policy=out,ipsec comment="[ACCEPT] Outbound IPsec Tunnel" place-before=2

# 9. BUKA PORT IKE UDP 500, UDP 4500 (NAT-T) & IPSEC-ESP DI FIREWALL INPUT
/ip firewall filter add chain=input action=accept protocol=udp src-address=198.51.100.25 dst-port=500,4500 comment="Allow IKE/NAT-T from Remote Gateway" place-before=1
/ip firewall filter add chain=input action=accept protocol=ipsec-esp src-address=198.51.100.25 comment="Allow ESP from Remote Gateway" place-before=2`,

    wireguard: `# 1. BUAT INTERFACE WIREGUARD
/interface wireguard add name=wg-unmus-noc listen-port=51820 comment="WireGuard VPN Server UNMUS"

# 2. PASANG IP ADDRESS UNTUK TUNNEL
/ip address add address=10.200.1.1/24 interface=wg-unmus-noc network=10.200.1.0

# 3. TAMBAHKAN PEER CLIENT (Contoh Admin Laptop)
/interface wireguard peers add interface=wg-unmus-noc allowed-address=10.200.1.2/32 public-key="PASTE_PUBLIC_KEY_CLIENT_DISINI" comment="Admin NOC Laptop"

# 4. BUKA PORT FIREWALL DI INPUT
/ip firewall filter add chain=input action=accept protocol=udp dst-port=51820 comment="Allow WireGuard VPN Server" place-before=1`,

    l2tp: `# 1. BUAT IP POOL UNTUK CLIENT VPN
/ip pool add name=pool-vpn-l2tp ranges=10.200.2.10-10.200.2.50

# 2. BUAT PPP PROFILE
/ppp profile add name=profile-l2tp local-address=10.200.2.1 remote-address=pool-vpn-l2tp dns-server=192.168.77.1,8.8.8.8 use-encryption=yes

# 3. AKTIFKAN L2TP SERVER DENGAN IPSEC
/interface l2tp-server server set enabled=yes use-ipsec=yes ipsec-secret="GantiDenganPasswordRahasia123!" default-profile=profile-l2tp

# 4. BUAT USER PPP SECRET
/ppp secret add name=admin_noc password="PasswordUserVPN123!" service=l2tp profile=profile-l2tp comment="Akun Remote Admin"`,

    sstp: `# 1. AKTIFKAN SSTP SERVER (Port 443 TLS)
/interface sstp-server server set enabled=yes port=443 default-profile=default-encryption force-aes=yes authentication=mschap2

# 2. BUAT USER PPP SECRET SSTP
/ppp secret add name=admin_sstp password="SstpPasswordSecure2026!" service=sstp profile=default-encryption comment="Akun SSTP Windows Remote"`,
  };

  const handleCopyScript = (scriptText: string, index: number) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const [peerStatusFilter, setPeerStatusFilter] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [selectedPeerForDiag, setSelectedPeerForDiag] = useState<VpnPeer | null>(null);
  const [copiedPeerConfig, setCopiedPeerConfig] = useState(false);
  const [copiedPeerCmd, setCopiedPeerCmd] = useState(false);

  const filteredPeers = vpnPeers.filter((p) => {
    const diag = getPeerDiagnostic(p, routerIp, routerName);
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.assignedIp.includes(searchQuery) ||
      (p.comment && p.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
      diag.reasonSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diag.statusBadge.label.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const isConnected = diag.stateType === 'connected';
    if (peerStatusFilter === 'connected') return isConnected;
    if (peerStatusFilter === 'disconnected') return !isConnected;
    return true;
  });

  const activeTunnelsCount = vpnInterfaces.filter((i) => i.status === 'active').length;
  const connectedPeersCount = vpnPeers.filter((p) => getPeerDiagnostic(p, routerIp, routerName).stateType === 'connected').length;
  const disconnectedPeersCount = vpnPeers.length - connectedPeersCount;

  return (
    <div className="space-y-4">
      {/* Top Banner Status Info */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-slate-100">VPN & Remote Access Gateway</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                WireGuard • L2TP/IPsec • SSTP
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                  syncMode === 'live_routeros_rest'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : syncMode === 'cached_live'
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : syncMode === 'offline'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${syncMode === 'offline' ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                <span>
                  {syncMode === 'live_routeros_rest'
                    ? 'Live RouterOS REST'
                    : syncMode === 'cached_live'
                    ? 'Cached (Real)'
                    : syncMode === 'offline'
                    ? 'Router Offline'
                    : 'Live Sync'}
                </span>
              </span>
              {apiLatency !== null && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900 border border-slate-800 text-cyan-400 flex items-center gap-1"
                  title="Waktu respons REST API dari router ke backend"
                >
                  <Zap className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{apiLatency}ms</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Router: <strong className="text-slate-200">{routerName}</strong> ({routerIp}) •{' '}
              <strong className="text-emerald-400">{activeTunnelsCount} Active Tunnel</strong> •{' '}
              <strong className="text-emerald-400">{connectedPeersCount} Terhubung</strong>
              {disconnectedPeersCount > 0 && (
                <>
                  {' '}• <strong className="text-amber-400">{disconnectedPeersCount} Tidak Konek/Offline</strong>
                </>
              )}{' '}• Update: {lastUpdated}
            </p>
          </div>
        </div>

        {/* Polling & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Poll Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-[11px] font-mono">
            {isAutoPollActive ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <select
              value={isAutoPollActive ? autoPollInterval : 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val === 0) {
                  setIsAutoPollActive(false);
                } else {
                  setIsAutoPollActive(true);
                  setAutoPollInterval(val);
                }
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={3} className="bg-slate-900">Auto 3s {isAutoPollActive && autoPollInterval === 3 ? `(${nextRefreshCountdown}s)` : ''}</option>
              <option value={5} className="bg-slate-900">Auto 5s {isAutoPollActive && autoPollInterval === 5 ? `(${nextRefreshCountdown}s)` : ''}</option>
              <option value={10} className="bg-slate-900">Auto 10s {isAutoPollActive && autoPollInterval === 10 ? `(${nextRefreshCountdown}s)` : ''}</option>
              <option value={30} className="bg-slate-900">Auto 30s {isAutoPollActive && autoPollInterval === 30 ? `(${nextRefreshCountdown}s)` : ''}</option>
              <option value={0} className="bg-slate-900">Manual</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchLiveVpnData(true)}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
            title="Refresh Data Segar dari Router (Bypass Cache)"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Sub-tab Pills */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveSubTab('interfaces')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'interfaces'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Interface Tunnel ({vpnInterfaces.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('ipsec')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                activeSubTab === 'ipsec'
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'text-emerald-400 hover:text-emerald-200 hover:bg-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>IPsec Tunnel & SA ({ipsecPolicies.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('peers')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'peers'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Peers / User VPN ({vpnPeers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('setup_wizard')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'setup_wizard'
                  ? 'bg-purple-600 text-white font-bold shadow flex items-center space-x-1'
                  : 'text-purple-300 hover:text-purple-100 hover:bg-slate-900 flex items-center space-x-1'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Script Setup 1-Klik</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: INTERFACES */}
      {activeSubTab === 'interfaces' && (
        <div className="space-y-3">
          {vpnInterfaces.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <div className="inline-flex p-3 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-slate-200">Belum Ada Interface VPN / Tunnel Aktif</h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Router {routerName} ({routerIp}) belum memiliki interface WireGuard, IPsec, atau PPP VPN aktif. Gunakan tab "Script Setup 1-Klik" untuk men-generate konfigurasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('setup_wizard')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                Buka Script Generator
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vpnInterfaces.map((iface, idx) => (
                <div
                  key={idx}
                  className={`bg-slate-950/70 border rounded-xl p-4 space-y-2.5 transition relative overflow-hidden ${
                    iface.status === 'active'
                      ? 'border-indigo-500/40 hover:border-indigo-400'
                      : 'border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-lg border ${
                        iface.status === 'active'
                          ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-100 font-mono flex items-center gap-1.5">
                          <span>{iface.name}</span>
                          {iface.peersCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-sans">
                              {iface.peersCount} Peer
                            </span>
                          )}
                        </h5>
                        <span className="text-[10px] text-slate-400 font-mono">{iface.type} (Port {iface.port})</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border flex items-center gap-1 ${
                        iface.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : iface.status === 'standby'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {iface.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                      {iface.status === 'active' ? 'AKTIF / UP' : iface.status === 'standby' ? 'STANDBY' : 'SIAP DIKONFIGURASI'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-slate-800/70">
                    <div className="text-slate-400">
                      Subnet IP: <strong className="text-cyan-300">{iface.ip}</strong>
                    </div>
                    <div className="text-slate-400">
                      MTU: <strong className="text-slate-200">{iface.mtu}</strong>
                    </div>
                    <div className="text-slate-400">
                      Rx Rate: <strong className="text-emerald-400">{iface.rx}</strong>
                    </div>
                    <div className="text-slate-400">
                      Tx Rate: <strong className="text-blue-400">{iface.tx}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    {iface.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: IPSEC DEDICATED MONITOR & INSPECTOR */}
      {activeSubTab === 'ipsec' && (
        <div className="space-y-4">
          {/* Phase 1 Status: Active Peers & Gateways */}
          <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-100 font-mono">
                    IPsec Phase 1: Active Peers & Key Exchange
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    Otentikasi gateway router lokal ke remote gateway router lawan
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{ipsecActivePeers.length} Peer Terdaftar</span>
              </span>
            </div>

            {ipsecActivePeers.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/50 rounded-lg border border-slate-800/80 space-y-2">
                <p className="text-xs text-amber-300 font-semibold">
                  Belum Ada Active Peer / IPsec Session Terhubung (Phase 1 Down)
                </p>
                <p className="text-[11px] text-slate-400 max-w-lg mx-auto">
                  Router MikroTik belum mendeteksi negosiasi IKE aktif dari remote gateway peer. Pastikan port UDP 500/4500 tidak terblokir ISP/Firewall dan kedua router telah bertukar PSK serta proposal yang cocok.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ipsecActivePeers.map((peer) => (
                  <div key={peer.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Remote Gateway: {peer.remoteAddress}</span>
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border uppercase font-bold ${
                        peer.state === 'established'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {peer.state} ({peer.side})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                      <div>Lokal IP: <strong className="text-slate-200">{peer.localAddress}</strong></div>
                      <div>Auth Method: <strong className="text-purple-300">{peer.authMethod}</strong></div>
                      <div>Uptime: <strong className="text-slate-200">{peer.uptime}</strong></div>
                      <div>ESP Rx/Tx: <strong className="text-emerald-400">{peer.rxBytes}</strong> / <strong className="text-blue-400">{peer.txBytes}</strong></div>
                    </div>
                    <div className="text-[10px] text-slate-400 italic bg-slate-950/60 px-2 py-1 rounded border border-slate-800/50">
                      {peer.comment}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phase 2 Status: IPsec Policies & Traffic Selectors */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-100 font-mono">
                    IPsec Phase 2: Security Policies & Traffic Selectors (/ip ipsec policy)
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    Daftar subnet lokal & remote yang dienkripsi via ESP (Encapsulating Security Payload)
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Total: <strong>{ipsecPolicies.length}</strong> Policy Aktif
              </span>
            </div>

            {ipsecPolicies.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/50 rounded-lg border border-slate-800/80 space-y-2">
                <p className="text-xs text-slate-300 font-semibold">
                  Belum Ada IPsec Policy di Router MikroTik
                </p>
                <p className="text-[11px] text-slate-400 max-w-lg mx-auto">
                  Buat policy dengan src-address (subnet lokal) dan dst-address (subnet tujuan) menggunakan menu IP &gt; IPsec &gt; Policies atau jalankan script konfigurasi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/80">
                      <th className="p-3">Src Subnet (Lokal) ➔ Dst Subnet (Remote)</th>
                      <th className="p-3">Action & Tunnel</th>
                      <th className="p-3">Enkripsi & Hash (ESP Proposal)</th>
                      <th className="p-3">PFS / DH Group</th>
                      <th className="p-3">Status SA (Phase 2)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {ipsecPolicies.map((pol) => (
                      <tr key={pol.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5 text-cyan-300 font-bold">
                            <span>{pol.srcAddress}</span>
                            <span className="text-slate-500 font-normal">➔</span>
                            <span className="text-emerald-300">{pol.dstAddress}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-sans">{pol.comment}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-bold">
                            {pol.action} (Tunnel: {pol.tunnel ? 'YES' : 'NO'})
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-200 font-bold">{pol.encAlgorithm}</div>
                          <div className="text-[10px] text-slate-400">Auth: {pol.authAlgorithm}</div>
                        </td>
                        <td className="p-3 text-slate-300">{pol.pfsGroup}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span className={`w-2 h-2 rounded-full ${pol.ph2State === 'established' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                            <span className={`font-bold uppercase ${pol.ph2State === 'established' ? 'text-emerald-300' : 'text-amber-300'}`}>
                              {pol.ph2State} ({pol.activeSaCount} SA)
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* IPsec Checklist & Troubleshooting Card */}
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <h6 className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Panduan Cepat & Troubleshooting Jika IPsec Belum Terkoneksi (Phase 1 / Phase 2 Down)</span>
            </h6>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-slate-200 font-mono flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">1</span>
                  <span>Bypass NAT (Accept Rule)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Traffic antar subnet LAN IPsec tidak boleh terkena <code className="text-cyan-300">action=masquerade</code>. Tambahkan rule <code className="text-amber-300">chain=srcnat action=accept</code> di paling atas NAT table.
                </p>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-slate-200 font-mono flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">2</span>
                  <span>Bypass FastTrack Firewall</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Fitur FastTrack dapat memotong enkripsi hardware IPsec. Pastikan membuat rule <code className="text-cyan-300">chain=forward action=accept ipsec-policy=in,ipsec</code> di atas rule fasttrack.
                </p>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-slate-200 font-mono flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">3</span>
                  <span>Port UDP 500, 4500 & ESP</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pastikan router mengizinkan paket IKE (UDP 500), NAT-Traversal (UDP 4500), dan IP protocol 50 (IPsec-ESP) di firewall input.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PEERS & USERS */}
      {activeSubTab === 'peers' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari user / IP tunnel / keterangan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono shrink-0">
                <button
                  type="button"
                  onClick={() => setPeerStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    peerStatusFilter === 'all'
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semua ({vpnPeers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPeerStatusFilter('connected')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                    peerStatusFilter === 'connected'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Terhubung ({connectedPeersCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPeerStatusFilter('disconnected')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                    peerStatusFilter === 'disconnected'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Tidak Konek ({disconnectedPeersCount})</span>
                </button>
              </div>
            </div>

            <span className="text-xs text-slate-400 font-mono self-end sm:self-center">
              Menampilkan: <strong>{filteredPeers.length}</strong> Profil VPN
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800/80 rounded-xl shadow-inner">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/80">
                  <th className="p-3">Client / Peer Name</th>
                  <th className="p-3">Protokol & Interface</th>
                  <th className="p-3">Assigned IP (Tunnel)</th>
                  <th className="p-3">Status & Handshake</th>
                  <th className="p-3 min-w-[280px]">Keterangan & Kondisi Koneksi</th>
                  <th className="p-3">Traffic Transfer</th>
                  <th className="p-3">Uptime</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {filteredPeers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-6 h-6 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-200">
                          {peerStatusFilter === 'disconnected'
                            ? 'Tidak ada peer yang terdeteksi sedang offline atau terputus'
                            : 'Tidak Ada Peer / Sesi VPN Terdaftar'}
                        </span>
                        <span className="text-[11px] text-slate-400 max-w-lg text-center leading-relaxed">
                          {apiError ? (
                            <span className="text-rose-400 font-mono">{apiError}</span>
                          ) : (
                            'Semua data dummy telah dihapus. Tabel ini hanya menampilkan data peer aktif dan terdaftar secara langsung (real-time) dari Router MikroTik CCR1036.'
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => fetchLiveVpnData(true)}
                          disabled={isLoading}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-mono inline-flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                          <span>Ambil Ulang dari Router (Bypass Cache)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPeers.map((peer) => {
                    const diag = getPeerDiagnostic(peer, routerIp, routerName);
                    const isConnected = diag.stateType === 'connected';

                    return (
                      <tr
                        key={peer.id}
                        className={`transition ${
                          !isConnected
                            ? 'bg-amber-950/10 hover:bg-amber-950/20'
                            : 'hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="p-3 font-bold text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{peer.name}</span>
                            {peer.disabled && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                Disabled
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal font-sans block truncate max-w-[160px]">
                            {peer.comment}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {peer.remoteIp}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {peer.type}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{peer.interfaceName}</div>
                        </td>
                        <td className="p-3 text-cyan-300 font-semibold">{peer.assignedIp}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span className={`w-2 h-2 rounded-full ${diag.statusBadge.dotClass}`}></span>
                            <span className={`font-semibold ${diag.statusBadge.textClass}`}>
                              {diag.statusBadge.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            <span>{peer.lastHandshake}</span>
                          </div>
                        </td>

                        {/* Keterangan & Kondisi Koneksi */}
                        <td className="p-3">
                          <div className={`p-2 rounded-lg border text-[11px] font-sans ${diag.statusBadge.bgClass} ${diag.statusBadge.borderClass}`}>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`font-bold flex items-center gap-1 ${diag.statusBadge.textClass}`}>
                                {diag.stateType === 'connected' ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : diag.stateType === 'idle' ? (
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                ) : diag.stateType === 'phase1_down' ? (
                                  <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                ) : diag.stateType === 'disabled' ? (
                                  <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                                <span>{diag.reasonSummary}</span>
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-300 leading-snug">
                              {diag.reasonDetail}
                            </p>

                            {/* Alert notifikasi hasil ping / keepalive */}
                            {pingResultMap[peer.id] && (
                              <div className="mt-1.5 p-1.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-[10.5px] text-emerald-300 font-sans flex items-center gap-1.5 animate-in fade-in">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{pingResultMap[peer.id]}</span>
                              </div>
                            )}

                            {/* Tombol aksi cepat berdasarkan status */}
                            {diag.statusBadge.label === 'Connected (Standby)' && (
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handlePingWakeup(peer)}
                                  disabled={pingLoadingMap[peer.id]}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold font-mono text-cyan-300 hover:text-cyan-100 bg-cyan-500/20 hover:bg-cyan-500/30 px-2 py-0.5 rounded border border-cyan-500/40 transition disabled:opacity-50 shadow-sm"
                                  title="Kirim paket ICMP dari router untuk menyegarkan handshake sekarang"
                                >
                                  <Zap className={`w-2.5 h-2.5 text-cyan-400 ${pingLoadingMap[peer.id] ? 'animate-bounce' : ''}`} />
                                  <span>{pingLoadingMap[peer.id] ? 'Membangunkan...' : '⚡ Ping Wakeup'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEnableKeepalive(peer)}
                                  disabled={keepaliveLoadingMap[peer.id]}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold font-mono text-teal-300 hover:text-teal-100 bg-teal-500/20 hover:bg-teal-500/30 px-2 py-0.5 rounded border border-teal-500/40 transition disabled:opacity-50 shadow-sm"
                                  title="Kirim perintah keepalive 25s ke router agar status selalu aktif 24/7"
                                >
                                  <Sliders className="w-2.5 h-2.5 text-teal-400" />
                                  <span>{keepaliveLoadingMap[peer.id] ? 'Menerapkan...' : 'Auto-Keepalive 25s'}</span>
                                </button>
                              </div>
                            )}

                            {!isConnected && (
                              <button
                                type="button"
                                onClick={() => setSelectedPeerForDiag(peer)}
                                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold font-mono text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded border border-amber-500/40 transition"
                              >
                                <HelpCircle className="w-2.5 h-2.5" />
                                <span>{peer.type === 'WireGuard' ? 'Lihat Solusi & Config Client' : 'Lihat Rekomendasi Solusi'}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <ArrowDownUp className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span>{peer.trafficRx} / {peer.trafficTx}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-400">{peer.uptime}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {peer.type === 'WireGuard' && peer.assignedIp && peer.assignedIp !== '-' && (
                              <button
                                type="button"
                                onClick={() => handlePingWakeup(peer)}
                                disabled={pingLoadingMap[peer.id]}
                                className="px-2 py-1 bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 hover:text-cyan-100 rounded-lg text-[10.5px] border border-cyan-500/40 font-mono inline-flex items-center gap-1 transition shadow-sm disabled:opacity-50"
                                title="Kirim paket ICMP ping dari router untuk memicu handshake WireGuard seketika"
                              >
                                <Zap className={`w-3 h-3 text-cyan-400 ${pingLoadingMap[peer.id] ? 'animate-bounce' : ''}`} />
                                <span>{pingLoadingMap[peer.id] ? 'Ping...' : 'Ping'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedPeerForDiag(peer)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 rounded-lg text-[10.5px] border border-slate-700 font-mono inline-flex items-center gap-1 transition shadow-sm"
                              title="Buka detail diagnosa dan keterangan peer"
                            >
                              <Search className="w-3 h-3" />
                              <span>Diagnosa</span>
                            </button>
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

      {/* SUB-TAB 4: SETUP WIZARD & SCRIPT GENERATOR */}
      {activeSubTab === 'setup_wizard' && (
        <div className="space-y-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h5 className="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Script Konfigurasi Cepat RouterOS VPN (Tinggal Copy-Paste ke Terminal)</span>
              </h5>
              <p className="text-[11px] text-slate-400">
                Pilih jenis VPN yang ingin diaktifkan, copy script di bawah dan jalankan di Terminal RouterOS:
              </p>
            </div>

            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setSelectedProtocol('ipsec_site2site')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedProtocol === 'ipsec_site2site' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IPsec Site-to-Site
              </button>
              <button
                type="button"
                onClick={() => setSelectedProtocol('wireguard')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedProtocol === 'wireguard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                WireGuard
              </button>
              <button
                type="button"
                onClick={() => setSelectedProtocol('l2tp')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedProtocol === 'l2tp' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                L2TP/IPsec
              </button>
              <button
                type="button"
                onClick={() => setSelectedProtocol('sstp')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedProtocol === 'sstp' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SSTP (SSL 443)
              </button>
            </div>
          </div>

          {/* Code Viewer & Action */}
          <div className="relative">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre max-h-60 leading-relaxed">
              {setupScripts[selectedProtocol]}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Port firewall otomatis dibuka dan profile dibuat secara aman.</span>
              </span>

              <div className="flex items-center space-x-2">
                {onSendToTerminal && (
                  <button
                    type="button"
                    onClick={() => onSendToTerminal(setupScripts[selectedProtocol].split('\n')[1] || '/ip ipsec print')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-mono flex items-center space-x-1 border border-slate-700 transition"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Kirim ke CLI</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCopyScript(setupScripts[selectedProtocol], 1)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-1 transition shadow"
                >
                  {copiedIndex === 1 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Script CLI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIAGNOSA & KETERANGAN PEER */}
      {selectedPeerForDiag && (() => {
        const diag = getPeerDiagnostic(selectedPeerForDiag, routerIp, routerName);
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in">
              {/* Modal Header */}
              <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl border ${diag.statusBadge.bgClass} ${diag.statusBadge.borderClass}`}>
                    {diag.stateType === 'connected' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : diag.stateType === 'idle' ? (
                      <Clock className="w-5 h-5 text-amber-400" />
                    ) : diag.stateType === 'phase1_down' ? (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    ) : diag.stateType === 'disabled' ? (
                      <Lock className="w-5 h-5 text-purple-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>Keterangan & Diagnosa Koneksi Peer</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${diag.statusBadge.bgClass} ${diag.statusBadge.textClass} ${diag.statusBadge.borderClass}`}>
                        {diag.statusBadge.label}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Client: <strong className="text-slate-200">{selectedPeerForDiag.name}</strong> • Protokol: {selectedPeerForDiag.type} • IP: {selectedPeerForDiag.assignedIp}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeerForDiag(null);
                    setCopiedPeerConfig(false);
                    setCopiedPeerCmd(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs font-mono">
                {/* 1. Status & Alasan */}
                <div className={`p-4 rounded-xl border ${diag.statusBadge.bgClass} ${diag.statusBadge.borderClass}`}>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {diag.stateType === 'connected' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : diag.stateType === 'phase1_down' ? (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      ) : diag.stateType === 'disabled' ? (
                        <Lock className="w-4 h-4 text-purple-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className={`text-xs font-bold ${diag.statusBadge.textClass}`}>
                        {diag.reasonSummary}
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        {diag.reasonDetail}
                      </p>
                    </div>
                  </div>

                  {/* Parameter Grid */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="text-slate-500 text-[10px]">Alokasi IP</div>
                      <div className="text-cyan-300 font-semibold truncate">{selectedPeerForDiag.assignedIp}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="text-slate-500 text-[10px]">Remote Endpoint</div>
                      <div className="text-slate-300 truncate">{selectedPeerForDiag.remoteIp}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="text-slate-500 text-[10px]">Handshake Terakhir</div>
                      <div className="text-slate-300 truncate">{selectedPeerForDiag.lastHandshake || '-'}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="text-slate-500 text-[10px]">Total Traffic</div>
                      <div className="text-slate-300 truncate">{selectedPeerForDiag.trafficRx} / {selectedPeerForDiag.trafficTx}</div>
                    </div>
                  </div>
                </div>

                {/* 1.5. Otomatisasi Handshake & Sesi WireGuard */}
                {selectedPeerForDiag.type === 'WireGuard' && (
                  <div className="bg-gradient-to-br from-teal-950/70 via-slate-900 to-cyan-950/70 p-4 rounded-xl border border-teal-500/40 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2 text-teal-300 font-bold font-sans text-xs">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <span>Otomatisasi Koneksi WireGuard (Aktif 24/7 Tanpa Idle)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Zero-Downtime
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      Secara default, WireGuard bersifat <em>silent UDP</em> (hemat daya). Jika perangkat client sedang tidak mengakses server/IP internal kantor, counter handshake akan bertambah (misalnya 44 menit lalu) padahal tunnel sebenarnya tetap terhubung. Agar router selalu mencatat handshake segar setiap saat:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Opsi 1: Bangunkan Seketika via Ping */}
                      <div className="bg-slate-950/80 p-3 rounded-lg border border-cyan-500/30 space-y-2">
                        <div className="text-cyan-300 font-bold text-[11px] flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>1. Bangunkan Seketika (ICMP Ping)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Kirim paket ICMP dari MikroTik langsung ke tunnel client ({selectedPeerForDiag.assignedIp}). Handshake WireGuard akan ter-refresh seketika.
                        </p>
                        <button
                          type="button"
                          onClick={() => handlePingWakeup(selectedPeerForDiag)}
                          disabled={pingLoadingMap[selectedPeerForDiag.id]}
                          className="w-full mt-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow"
                        >
                          <Zap className={`w-3.5 h-3.5 ${pingLoadingMap[selectedPeerForDiag.id] ? 'animate-bounce' : ''}`} />
                          <span>{pingLoadingMap[selectedPeerForDiag.id] ? 'Mengirim Ping...' : '⚡ Kirim Ping Wakeup Sekarang'}</span>
                        </button>
                      </div>

                      {/* Opsi 2: Terapkan Auto-Keepalive di RouterOS */}
                      <div className="bg-slate-950/80 p-3 rounded-lg border border-teal-500/30 space-y-2">
                        <div className="text-teal-300 font-bold text-[11px] flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-teal-400" />
                          <span>2. Jadikan Otomatis di RouterOS (25s)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Router MikroTik akan otomatis mengirim paket keepalive 25s ke endpoint client ({selectedPeerForDiag.remoteIp}) tanpa henti.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleEnableKeepalive(selectedPeerForDiag)}
                          disabled={keepaliveLoadingMap[selectedPeerForDiag.id]}
                          className="w-full mt-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{keepaliveLoadingMap[selectedPeerForDiag.id] ? 'Menerapkan di Router...' : '🔄 Terapkan Keepalive 25s di Router'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Notifikasi feedback */}
                    {pingResultMap[selectedPeerForDiag.id] && (
                      <div className="p-2 rounded bg-emerald-950/90 border border-emerald-500/60 text-[11px] text-emerald-300 flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{pingResultMap[selectedPeerForDiag.id]}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Langkah Solusi (Troubleshooting Checklist) */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center space-x-2 text-slate-200 font-bold font-sans text-xs">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Langkah Solusi & Rekomendasi Tindakan:</span>
                  </div>
                  <ul className="space-y-2 text-[11px] font-sans text-slate-300">
                    {diag.troubleshootingSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] shrink-0 font-mono mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Template Client Config (WireGuard) */}
                {diag.clientConfigSnippet && (
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-200 font-sans flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span>File Konfigurasi Client ({selectedPeerForDiag.name}.conf)</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([diag.clientConfigSnippet || ''], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedPeerForDiag.name.replace(/\s+/g, '_')}_wireguard.conf`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 transition"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download .conf</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(diag.clientConfigSnippet || '');
                            setCopiedPeerConfig(true);
                            setTimeout(() => setCopiedPeerConfig(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          {copiedPeerConfig ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin Config</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 bg-slate-900 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto border border-slate-800/80 leading-relaxed max-h-44">
                      {diag.clientConfigSnippet}
                    </pre>
                  </div>
                )}

                {/* 4. Perintah Diagnosa CLI RouterOS */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-200 font-sans flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      <span>Perintah Diagnosa di Terminal RouterOS</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {onSendToTerminal && (
                        <button
                          type="button"
                          onClick={() => {
                            onSendToTerminal(diag.routerOsCheckCmd);
                            setSelectedPeerForDiag(null);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] flex items-center gap-1 transition border border-slate-700"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>Kirim ke CLI</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(diag.routerOsCheckCmd);
                          setCopiedPeerCmd(true);
                          setTimeout(() => setCopiedPeerCmd(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        {copiedPeerCmd ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-300" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin Command</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-purple-300 border border-slate-800 select-all">
                    {diag.routerOsCheckCmd}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeerForDiag(null);
                    setCopiedPeerConfig(false);
                    setCopiedPeerCmd(false);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

