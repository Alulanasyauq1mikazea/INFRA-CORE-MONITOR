import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Radio,
  Server,
  Signal,
  Cpu,
  Activity,
  AlertTriangle,
  Search,
  Sliders,
  CheckCircle2,
  HardDrive,
  Clock,
  RefreshCw,
  Gauge,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Cable,
  LayoutGrid,
  List,
  Info,
  X,
  ShieldCheck,
  Zap,
  Users,
  Laptop,
  Smartphone,
  Tablet,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

export interface CapsInterfaceItem {
  id: number;
  name: string;
  type: string;
  actualMtu?: number;
  l2mtu: number;
  ssid: string;
  channel: string;
  frequency: number;
  band: string;
  flags: string;
  status: 'ON' | 'OFF';
  stateText: string;
  mac?: string;
  ipPort?: string;
  activeClients?: number;
  comment?: string;
  loadBalancing?: string;
}

export interface WirelessClient {
  id?: number;
  mac: string;
  interfaceName: string;
  ssid: string;
  hostname?: string;
  ipAddress?: string;
  deviceType?: 'laptop' | 'smartphone' | 'tablet';
  rxSignal: number;
  txSignal?: number;
  rxRate: string;
  txRate: string;
  rxBytes?: string;
  txBytes?: string;
  txRxPackets?: string;
  txRxBytes?: string;
  uptime: string;
  status: 'excellent' | 'good' | 'fair';
}

export const MikroTikCapsmanPanel: React.FC<{
  routerIp?: string;
  snmpExporterUrl?: string;
}> = ({ routerIp = '192.168.77.1', snmpExporterUrl = 'http://192.168.77.30:9117' }) => {
  const [activeTab, setActiveTab] = useState<'capsman' | 'hardware' | 'sources'>('capsman');
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on' | 'off' | 'fo_cut'>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Baru saja');
  const [syncMode, setSyncMode] = useState<string>('live_rest_api');
  const [autoPollInterval, setAutoPollInterval] = useState<number>(5);

  // Modal State for AP detail popup
  const [selectedAp, setSelectedAp] = useState<CapsInterfaceItem | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  // Dynamic Telemetry State with baseline CCR1036 data
  const [telemetry, setTelemetry] = useState({
    boardName: 'CCR1036-12G-4S',
    serialNumber: '719006E888D1',
    firmwareVersion: '7.12.1',
    uptime: '113d 18h 42m',
    totalMemory: '4096 MB',
    freeMemory: '3712 MB',
    cpuLoad: 3,
    cpuCores: 36,
    buildTime: '2026-05-07 09:19:52',
    cpuTemp: 49,
    boardTemp: 29,
    fan1Speed: 4125,
    fan2Speed: 3990,
    cpuFreq: 1200,
    psu1State: 'OK (Active)',
    psu2State: 'OK (Redundant Backup)',
    dhcpCount: 28,
    activeCapsCount: 8,
    connectedWirelessClients: 4,
    scrapeDuration: '2.76s',
    pdusReturned: 5021,
  });

  // Default initial 38 CAP Interfaces merged with MAC, Channel & Remote AP Info
  const [capInterfaces, setCapInterfaces] = useState<CapsInterfaceItem[]>([
    { id: 1, name: 'Arsitek_LT.1', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:10:01', activeClients: 0, comment: '' },
    { id: 2, name: 'Arsitek_LT.2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:10:02', activeClients: 0, comment: '' },
    { id: 3, name: 'BAKK NEW', type: 'CAP Interface', l2mtu: 1600, ssid: 'BAKK_UNMUS', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:10:03', activeClients: 0, comment: '' },
    { id: 4, name: 'cap1', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:10:04', activeClients: 0, comment: '' },
    { id: 5, name: 'Dekanat_Ekonomi', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'Hotspot Unmus', channel: '2412/20-Ce/gn (20dBm)', frequency: 2412, band: '2ghz-b/g/n', flags: 'RSMB', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:21:E7', ipPort: '192.168.5.18/45755', activeClients: 0, comment: '' },
    { id: 6, name: 'Dekanat_Fisip', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'Engineering', channel: '2412/20-Ce/gn (20dBm)', frequency: 2412, band: '2ghz-b/g/n', flags: 'RSMB', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:17:69', ipPort: '192.168.5.18/44584', activeClients: 0, comment: '' },
    { id: 7, name: 'Dekanat_Hukum', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'Hotspot Unmus', channel: '2412/20-Ce/gn (20dBm)', frequency: 2412, band: '2ghz-b/g/n', flags: 'RSMB', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:17:65', ipPort: '192.168.5.18/56254', activeClients: 0, comment: '' },
    { id: 8, name: 'Dekanat_LT.1', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'Hotspot Unmus', channel: '2412/20-Ce/gn (20dBm)', frequency: 2412, band: '2ghz-b/g/n', flags: 'RSMB', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:19:40', ipPort: '192.168.5.18/47674', activeClients: 0, comment: '' },
    { id: 9, name: 'Dekanat_LT.2', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'Engineering', channel: '2412/20-Ce/gn (20dBm)', frequency: 2412, band: '2ghz-b/g/n', flags: 'RSMB', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:16:52', ipPort: '192.168.5.18/39339', activeClients: 0, comment: '' },
    { id: 10, name: 'Dekanat_Pertanian', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'Engineering', channel: '2412/20-Ce/gn (20dBm)', frequency: 2412, band: '2ghz-b/g/n', flags: 'RSMB', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:20:E1', ipPort: '192.168.5.18/24373', activeClients: 2, comment: '' },
    { id: 11, name: 'G. Ekonomi Lt.2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:01', activeClients: 0, comment: '' },
    { id: 12, name: 'G.Ekonomi_Jurusan_LT.1', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:02', activeClients: 0, comment: '' },
    { id: 13, name: 'G.HUKUM ADMIN FKIP LT.1', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:03', activeClients: 0, comment: '' },
    { id: 14, name: 'G.HUKUM dan ADMIN Lt.2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:04', activeClients: 0, comment: '' },
    { id: 15, name: 'G.HUKUM,FISIP dan FKIP Lt.3', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:05', activeClients: 0, comment: '' },
    { id: 16, name: 'G.Kelas Teknik', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:06', activeClients: 0, comment: '' },
    { id: 17, name: 'G.Kelas Teknik 2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:07', activeClients: 0, comment: '' },
    { id: 18, name: 'G.SPI', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:08', activeClients: 0, comment: '' },
    { id: 19, name: 'IOT & Lab', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'IOT', channel: '2412/20-Ce/gn (20dBm)', frequency: 2412, band: '2ghz-b/g/n', flags: 'RSMB', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:21:91', ipPort: '192.168.5.18/56541', activeClients: 0, comment: '' },
    { id: 20, name: 'Kemungkinan 5ghz', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 5Ghz', frequency: 5290, band: '5ghz-a/n/ac', flags: 'MBI', status: 'OFF', stateText: 'Channel Error', mac: '2C:C8:1B:14:11:09', activeClients: 0, comment: 'no supported channel' },
    { id: 21, name: 'Keuangan', type: 'CAP Interface', l2mtu: 1600, ssid: 'Keuangan', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:10', activeClients: 0, comment: '' },
    { id: 22, name: 'LAB. BAKIMFIS 1', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Kabel Putus', mac: '2C:C8:1B:14:11:11', activeClients: 0, comment: 'FO Putus' },
    { id: 23, name: 'LAB.BAKIMFIS 2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Kabel Putus', mac: '2C:C8:1B:14:11:12', activeClients: 0, comment: 'FO Putus' },
    { id: 24, name: 'Penjas LT.1', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', loadBalancing: 'LB_Penjas LT.1', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:13', activeClients: 0, comment: '' },
    { id: 25, name: 'Penjas LT.2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', loadBalancing: 'LB_Penjas LT.2', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:14', activeClients: 0, comment: '' },
    { id: 26, name: 'Perpustakaan Lt.2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:15', activeClients: 0, comment: '' },
    { id: 27, name: 'Perpustakaan Lt.3 UPT.SIM dan Bahasa', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', loadBalancing: 'LB_Perpustakaan Lt.3 UPT.SIM dan Bahasa', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:16', activeClients: 0, comment: '' },
    { id: 28, name: 'Perpustakaan Lt.1 LP2M', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:17', activeClients: 0, comment: '' },
    { id: 29, name: 'Perpustakaan Lt.1 LP3M & PPG', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'Perpus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'SMI', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:11:18', activeClients: 0, comment: '' },
    { id: 30, name: 'Pertanian Kelas', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Kabel Putus', mac: '2C:C8:1B:14:11:19', activeClients: 0, comment: 'FO Putus' },
    { id: 31, name: 'Pertanian LAB', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Kabel Putus', mac: '2C:C8:1B:14:11:20', activeClients: 0, comment: 'FO Putus' },
    { id: 32, name: 'Rektorat_BUPK', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:21', activeClients: 0, comment: '' },
    { id: 33, name: 'T.Mesin LT.1', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:22', activeClients: 0, comment: '' },
    { id: 34, name: 'T.Mesin LT.2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:23', activeClients: 0, comment: '' },
    { id: 35, name: 'T.SIPIL LT.2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:24', activeClients: 0, comment: '' },
    { id: 36, name: 'TE.LT.1', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:25', activeClients: 0, comment: '' },
    { id: 37, name: 'TE.LT.2', type: 'CAP Interface', l2mtu: 1600, ssid: 'Hotspot Unmus', channel: 'channel 2Ghz', frequency: 2412, band: '2ghz-b/g/n', flags: 'MI', status: 'OFF', stateText: 'Inactive', mac: '2C:C8:1B:14:11:26', activeClients: 0, comment: '' },
    { id: 38, name: 'TEKNIK', type: 'CAP Interface', actualMtu: 1500, l2mtu: 1600, ssid: 'Engineering', channel: '2412/20-Ce/gn (20dBm)', frequency: 2412, band: '2ghz-b/g/n', flags: 'RSMB', status: 'ON', stateText: 'Running', mac: '2C:C8:1B:14:22:68', ipPort: '192.168.5.18/38395', activeClients: 4, comment: '' },
  ]);

  // Default initial wireless registration clients from CCR1036 WinBox
  const [wirelessClients, setWirelessClients] = useState<WirelessClient[]>([
    {
      id: 0,
      interfaceName: 'TEKNIK',
      ssid: 'Engineering',
      hostname: 'Laptop-Dekan-Teknik',
      ipAddress: '192.168.5.105',
      deviceType: 'laptop',
      mac: 'B8:86:87:F6:00:A3',
      txRate: '72.2Mbps-20MHz/1S/SGI',
      rxRate: '72.2Mbps-20MHz/1S/SGI',
      rxSignal: -36,
      uptime: '7d 03:22:26',
      txRxPackets: '1 624 234 / 1 280 411',
      txRxBytes: '2131.7 MiB / 1024 MiB',
      status: 'excellent',
    },
    {
      id: 1,
      interfaceName: 'TEKNIK',
      ssid: 'Engineering',
      hostname: 'Galaxy-S23-Dosen',
      ipAddress: '192.168.5.112',
      deviceType: 'smartphone',
      mac: '8A:86:AC:63:1A:02',
      txRate: '120Mbps-40MHz/1S/SGI',
      rxRate: '135Mbps-40MHz/1S',
      rxSignal: -53,
      uptime: '02:14:44',
      txRxPackets: '550 961 / 92 396',
      txRxBytes: '645.4 MiB / 17.4 MiB',
      status: 'excellent',
    },
    {
      id: 2,
      interfaceName: 'TEKNIK',
      ssid: 'Engineering',
      hostname: 'ThinkPad-Lab-Komputer',
      ipAddress: '192.168.5.119',
      deviceType: 'laptop',
      mac: '40:23:43:A9:4B:81',
      txRate: '90Mbps-40MHz/2S/SGI',
      rxRate: '162Mbps-40MHz/2S',
      rxSignal: -60,
      uptime: '01:05:04',
      txRxPackets: '273 337 / 148 811',
      txRxBytes: '372.0 MiB / 11.8 MiB',
      status: 'good',
    },
    {
      id: 3,
      interfaceName: 'TEKNIK',
      ssid: 'Engineering',
      hostname: 'iPhone-14-Mahasiswa',
      ipAddress: '192.168.5.134',
      deviceType: 'smartphone',
      mac: '82:9E:09:F1:8B:26',
      txRate: '121.5Mbps-40MHz/1S',
      rxRate: '5.5Mbps',
      rxSignal: -40,
      uptime: '00:46:29',
      txRxPackets: '128 013 / 18 875',
      txRxBytes: '152.9 MiB / 277 KiB',
      status: 'excellent',
    },
    {
      id: 4,
      interfaceName: 'Dekanat_Pertanian',
      ssid: 'Engineering',
      hostname: 'MacBook-Dekan-Pertanian',
      ipAddress: '192.168.5.140',
      deviceType: 'laptop',
      mac: '48:2C:6A:19:D4:55',
      txRate: '144.4Mbps-20MHz/2S/SGI',
      rxRate: '144.4Mbps-20MHz/2S/SGI',
      rxSignal: -42,
      uptime: '04:18:12',
      txRxPackets: '412 890 / 239 104',
      txRxBytes: '512.4 MiB / 68.2 MiB',
      status: 'excellent',
    },
    {
      id: 5,
      interfaceName: 'Dekanat_Pertanian',
      ssid: 'Engineering',
      hostname: 'Xiaomi-13T-Staff',
      ipAddress: '192.168.5.145',
      deviceType: 'smartphone',
      mac: '60:AB:D2:EE:90:3A',
      txRate: '72.2Mbps-20MHz/1S',
      rxRate: '65.0Mbps-20MHz/1S',
      rxSignal: -58,
      uptime: '01:30:05',
      txRxPackets: '98 420 / 45 110',
      txRxBytes: '84.6 MiB / 12.1 MiB',
      status: 'excellent',
    },
  ]);

  const fetchLiveTelemetry = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch live CAPsMAN data (Interfaces & Registration Table)
      const capsRes = await fetch('/api/mikrotik/capsman');
      if (capsRes.ok) {
        const capsData = await capsRes.json();
        if (capsData.success) {
          if (capsData.interfaces && Array.isArray(capsData.interfaces)) {
            setCapInterfaces(capsData.interfaces);
          }
          if (capsData.clients && Array.isArray(capsData.clients)) {
            setWirelessClients(capsData.clients);
          }
        }
      }

      // 2. Fetch SNMP Telemetry for Hardware Sensors
      const snmpRes = await fetch('/api/mikrotik/snmp-telemetry');
      if (snmpRes.ok) {
        const data = await snmpRes.json();
        if (data.success && data.telemetry) {
          setTelemetry((prev) => ({
            ...prev,
            ...data.telemetry,
          }));
          setSyncMode(data.mode || 'live_rest_api');
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error('Error fetching live MikroTik telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, autoPollInterval * 1000);
    return () => clearInterval(interval);
  }, [autoPollInterval]);

  const hardwareMetrics = telemetry;

  // Filtered CAP Interfaces
  const filteredInterfaces = capInterfaces.filter((iface) => {
    const matchesSearch =
      iface.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      iface.ssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      iface.band.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (iface.mac && iface.mac.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (iface.comment && iface.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (iface.loadBalancing && iface.loadBalancing.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'on') return iface.status === 'ON';
    if (statusFilter === 'off') return iface.status === 'OFF';
    if (statusFilter === 'fo_cut') return iface.comment?.toLowerCase().includes('fo putus');
    return true;
  });

  // Dynamic helper to count connected wireless clients for any AP
  const getApClientCount = (ap: CapsInterfaceItem): number => {
    if (ap.status !== 'ON') return 0;
    const directCount = wirelessClients.filter(
      (c) =>
        c.interfaceName?.toLowerCase() === ap.name?.toLowerCase() ||
        (ap.name?.toLowerCase().includes('teknik') && c.interfaceName?.toLowerCase().includes('teknik')) ||
        (ap.name?.toLowerCase().includes('pertanian') && c.interfaceName?.toLowerCase().includes('pertanian')) ||
        (ap.name?.toLowerCase().includes('dekanat') && c.interfaceName?.toLowerCase().includes(ap.name?.toLowerCase()))
    ).length;
    return Math.max(directCount, ap.activeClients || 0);
  };

  // Pagination calculations
  const totalItems = filteredInterfaces.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const validPage = Math.min(page, totalPages);
  const startIndex = (validPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const paginatedInterfaces = filteredInterfaces.slice(startIndex, endIndex);

  const onlineCount = capInterfaces.filter((i) => i.status === 'ON').length;
  const offlineCount = capInterfaces.filter((i) => i.status === 'OFF').length;
  const foCutCount = capInterfaces.filter((i) => i.comment?.toLowerCase().includes('fo putus')).length;

  const filteredClients = wirelessClients.filter(
    (c) =>
      c.mac.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.interfaceName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.ssid.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-slate-100">Wireless CAPsMAN Central Controller</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>RouterOS v7 Unified</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Router: <strong className="text-slate-200">{hardwareMetrics.boardName}</strong> (SN: {hardwareMetrics.serialNumber}) • Total {capInterfaces.length} AP ({onlineCount} ON / {offlineCount} OFF)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 text-[10px]">Sync:</span>
            <span className="text-cyan-400 font-bold text-[10px]">{lastSyncTime}</span>
            <button
              type="button"
              onClick={fetchLiveTelemetry}
              disabled={isRefreshing}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 transition"
              title="Refresh Data CAPsMAN & Sensors Sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('capsman')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                activeTab === 'capsman'
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>CAPsMAN ({onlineCount} ON / {capInterfaces.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hardware')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                activeTab === 'hardware'
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hardware Sensors ({hardwareMetrics.cpuTemp}°C)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: UNIFIED CAPSMAN WIRELESS CONTROLLER */}
      {activeTab === 'capsman' && (
        <div className="space-y-4">
          {/* Quick Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Access Points Aktif (ON)</span>
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300">
                {onlineCount} <span className="text-xs text-slate-500">/ {capInterfaces.length} AP</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Running-AP (RSMB)</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Access Points Offline (OFF)</span>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-bold font-mono text-rose-300">
                {offlineCount} <span className="text-xs text-slate-500">AP</span>
              </div>
              <div className="text-[10px] text-rose-400/90 font-mono">Flag MI (Inactive / Unbound)</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Gangguan Fisik Kabel FO</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold font-mono text-amber-300">
                {foCutCount} <span className="text-xs text-slate-500">Lokasi</span>
              </div>
              <div className="text-[10px] text-amber-400 font-mono">Perlu Perbaikan Fiber Optic</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Active Wi-Fi Clients</span>
                <Signal className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {wirelessClients.length} <span className="text-xs text-slate-500">Perangkat</span>
              </div>
              <div className="text-[10px] text-cyan-400 font-mono">Connected to Active APs</div>
            </div>
          </div>

          {/* MAIN UNIFIED SECTION: CAP INTERFACE STATUS (DAFTAR AP GEDUNG & KAMPUS) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-md">
            {/* Header & Filter Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center space-x-2">
                    <span>CAP Interface Status (Daftar AP Gedung & Kampus)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {filteredInterfaces.length} AP
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Klik kartu AP mana saja untuk membuka popup informasi detail teknis & radio MikroTik
                  </p>
                </div>
              </div>

              {/* Controls: Filter Status + View Switcher + Search */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Status Filter Chips */}
                <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('all'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      statusFilter === 'all'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Semua ({capInterfaces.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('on'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1.5 ${
                      statusFilter === 'on'
                        ? 'bg-emerald-600 text-white font-bold shadow'
                        : 'text-emerald-400 hover:bg-emerald-950/30'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>ON ({onlineCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('off'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1.5 ${
                      statusFilter === 'off'
                        ? 'bg-rose-700 text-white font-bold shadow'
                        : 'text-rose-400 hover:bg-rose-950/30'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>OFF ({offlineCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('fo_cut'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1.5 ${
                      statusFilter === 'fo_cut'
                        ? 'bg-amber-600 text-white font-bold shadow'
                        : 'text-amber-400 hover:bg-amber-950/30'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>FO Putus ({foCutCount})</span>
                  </button>
                </div>

                {/* View Layout Switcher (Cards vs Table) */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-slate-400">
                  <button
                    type="button"
                    onClick={() => setViewLayout('cards')}
                    title="Tampilan Kartu Grid"
                    className={`p-1.5 rounded-lg transition ${
                      viewLayout === 'cards' ? 'bg-cyan-600 text-white' : 'hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewLayout('table')}
                    title="Tampilan Tabel Lengkap"
                    className={`p-1.5 rounded-lg transition ${
                      viewLayout === 'table' ? 'bg-cyan-600 text-white' : 'hover:text-slate-200'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari nama gedung / SSID / MAC..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* VIEW MODE 1: INTERACTIVE CARDS GRID (DENGAN POPUP ON-CLICK) */}
            {viewLayout === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {paginatedInterfaces.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-slate-500 font-mono text-xs">
                    Tidak ada Access Point yang cocok dengan pencarian "{searchQuery}"
                  </div>
                ) : (
                  paginatedInterfaces.map((ap) => {
                    const isOn = ap.status === 'ON';
                    const isFoPutus = ap.comment?.toLowerCase().includes('fo putus');
                    const isChannelError = ap.comment?.toLowerCase().includes('no supported channel');

                    return (
                      <div
                        key={ap.id}
                        onClick={() => setSelectedAp(ap)}
                        className={`group relative rounded-xl p-3.5 space-y-2.5 transition border cursor-pointer ${
                          isOn
                            ? 'bg-slate-900/80 border-emerald-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/30'
                            : isFoPutus
                            ? 'bg-slate-900/60 border-amber-500/30 hover:border-amber-400'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Header: AP Name & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-1.5 overflow-hidden">
                            <span className="font-bold text-xs text-slate-100 font-mono tracking-tight truncate group-hover:text-cyan-300 transition">
                              {ap.name}
                            </span>
                          </div>
                          {isOn ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>running-ap</span>
                            </span>
                          ) : isFoPutus ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>fo putus</span>
                            </span>
                          ) : isChannelError ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                              channel-err
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                              disabled/mi
                            </span>
                          )}
                        </div>

                        {/* Metadata Rows */}
                        <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
                          <div className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/80">
                            <span className="text-slate-500 text-[10px] uppercase font-semibold">MAC Address:</span>
                            <span className="text-cyan-300 font-bold font-mono tracking-wider">{ap.mac || 'N/A'}</span>
                          </div>

                          <div className="flex justify-between px-0.5">
                            <span className="text-slate-500">Channel:</span>
                            <span className="text-slate-300 truncate max-w-[140px]" title={ap.channel}>
                              {ap.channel}
                            </span>
                          </div>

                          <div className="flex justify-between px-0.5">
                            <span className="text-slate-500">SSID:</span>
                            <span className="text-slate-200 font-medium truncate max-w-[140px]">{ap.ssid}</span>
                          </div>

                          {/* Footer with Clients count and Click affordance */}
                          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-500 text-[11px]">Clients:</span>
                              {(() => {
                                const clientCount = getApClientCount(ap);
                                return (
                                  <span
                                    className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono inline-flex items-center space-x-1 ${
                                      clientCount > 0
                                        ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 shadow-sm'
                                        : 'text-slate-400 bg-slate-800/50'
                                    }`}
                                  >
                                    {clientCount > 0 && <Users className="w-3 h-3 mr-0.5 text-emerald-400" />}
                                    <span>{clientCount} User</span>
                                  </span>
                                );
                              })()}
                            </div>

                            <span className="text-[10px] text-cyan-400 group-hover:underline flex items-center space-x-0.5">
                              <span>Detail</span>
                              <Info className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* VIEW MODE 2: TABLE VIEW */}
            {viewLayout === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 bg-slate-900/60 text-[11px]">
                      <th className="p-3">Status</th>
                      <th className="p-3">Nama AP & Lokasi</th>
                      <th className="p-3">MAC Address</th>
                      <th className="p-3">SSID Dipancarkan</th>
                      <th className="p-3">Flags MikroTik</th>
                      <th className="p-3">Channel / Frekuensi</th>
                      <th className="p-3">Klien Aktif</th>
                      <th className="p-3">Catatan Lapangan</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {paginatedInterfaces.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          Tidak ada AP yang cocok dengan filter atau kata kunci "{searchQuery}"
                        </td>
                      </tr>
                    ) : (
                      paginatedInterfaces.map((iface) => {
                        const isOn = iface.status === 'ON';
                        const isFoPutus = iface.comment?.toLowerCase().includes('fo putus');
                        const isChannelError = iface.comment?.toLowerCase().includes('no supported channel');

                        return (
                          <tr
                            key={iface.id}
                            className={`transition-colors cursor-pointer ${
                              isOn
                                ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                                : isFoPutus
                                ? 'bg-amber-950/10 hover:bg-amber-950/20'
                                : 'hover:bg-slate-900/40'
                            }`}
                            onClick={() => setSelectedAp(iface)}
                          >
                            <td className="p-3">
                              {isOn ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                  <span>ON (RUNNING)</span>
                                </span>
                              ) : isFoPutus ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                  <span>OFF (FO PUTUS)</span>
                                </span>
                              ) : isChannelError ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                  <span>OFF (CH ERROR)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                  <span>OFF (INACTIVE)</span>
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              <span className="font-bold text-slate-100 text-[13px]">{iface.name}</span>
                            </td>

                            <td className="p-3 text-cyan-300 font-bold">{iface.mac || 'N/A'}</td>

                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {iface.ssid}
                              </span>
                            </td>

                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isOn
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                                }`}
                              >
                                {iface.flags}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="text-slate-300 text-[11px]">{iface.channel}</div>
                              <div className="text-[10px] text-slate-500">{iface.frequency} MHz</div>
                            </td>

                            <td className="p-3">
                              {(() => {
                                const clientCount = getApClientCount(iface);
                                return (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold ${
                                      clientCount > 0
                                        ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 shadow-sm'
                                        : 'text-slate-400 bg-slate-900/60 border border-slate-800/60'
                                    }`}
                                  >
                                    {clientCount > 0 && <Users className="w-3 h-3 mr-1 text-emerald-400" />}
                                    <span>{clientCount} User</span>
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="p-3">
                              {isFoPutus ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1 w-max">
                                  <Cable className="w-3 h-3 text-rose-400" />
                                  <span>FO Putus</span>
                                </span>
                              ) : iface.comment ? (
                                <span className="text-slate-400 text-[11px]">{iface.comment}</span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAp(iface);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950 text-cyan-400 border border-slate-800 hover:border-cyan-700 transition text-[11px]"
                              >
                                Info Detail
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs font-mono text-slate-400">
              <div>
                Menampilkan <strong className="text-slate-200">{totalItems > 0 ? startIndex + 1 : 0}</strong> -{' '}
                <strong className="text-slate-200">{endIndex}</strong> dari <strong className="text-slate-200">{totalItems}</strong> AP
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span>Baris:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-slate-300 font-bold">
                    {validPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: CONNECTED WIRELESS CLIENTS (REGISTRATION TABLE) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/70">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Signal className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider">
                    Connected Wireless Clients (Registration Table)
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Daftar perangkat client WiFi pengguna yang sedang terhubung ke radio AP aktif
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari MAC / interface..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 bg-slate-900/60 text-[11px]">
                    <th className="p-3">Client MAC Address</th>
                    <th className="p-3">Connected AP (Interface)</th>
                    <th className="p-3">SSID</th>
                    <th className="p-3">Signal Strength</th>
                    <th className="p-3">Tx / Rx Modulasi Rate</th>
                    <th className="p-3">Total Traffic (Tx / Rx)</th>
                    <th className="p-3">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredClients.map((client, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="p-3 text-cyan-300 font-bold">{client.mac}</td>
                      <td className="p-3 text-slate-200">{client.interfaceName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {client.ssid}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-bold ${
                              client.rxSignal > -60
                                ? 'text-emerald-400'
                                : client.rxSignal > -75
                                ? 'text-cyan-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {client.rxSignal} dBm
                          </span>
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                client.rxSignal > -60
                                  ? 'bg-emerald-400'
                                  : client.rxSignal > -75
                                  ? 'bg-cyan-400'
                                  : 'bg-amber-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(10, (client.rxSignal + 100) * 1.5))}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300 text-[11px]">
                        <div>Tx: {client.txRate}</div>
                        <div className="text-slate-500">Rx: {client.rxRate}</div>
                      </td>
                      <td className="p-3 text-slate-300 text-[11px]">{client.txRxBytes || 'N/A'}</td>
                      <td className="p-3 text-slate-400">{client.uptime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HARDWARE SENSORS & HEALTH */}
      {activeTab === 'hardware' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>CPU Temperature</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-300">{hardwareMetrics.cpuTemp}°C</div>
              <div className="text-[10px] text-slate-400 font-mono">CCR1036 36-Core Tile Architecture</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Mainboard Temperature</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-300">{hardwareMetrics.boardTemp}°C</div>
              <div className="text-[10px] text-emerald-400 font-mono">Normal Operational Range</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Fan 1 Speed</span>
                <Gauge className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-300">{hardwareMetrics.fan1Speed} RPM</div>
              <div className="text-[10px] text-slate-400 font-mono">Fan 2: {hardwareMetrics.fan2Speed} RPM</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Dual Redundant PSU</span>
                <HardDrive className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-lg font-bold font-mono text-purple-300">{hardwareMetrics.psu1State}</div>
              <div className="text-[10px] text-slate-400 font-mono">PSU 2: {hardwareMetrics.psu2State}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP: AP TECHNICAL DETAIL & CONNECTED CLIENTS */}
      {selectedAp && (() => {
        // Find connected wireless clients for this specific AP interface
        const apClients = wirelessClients.filter(
          (c) =>
            c.interfaceName.toLowerCase() === selectedAp.name.toLowerCase() ||
            (selectedAp.name.toLowerCase().includes('teknik') && c.interfaceName.toLowerCase().includes('teknik')) ||
            (selectedAp.name.toLowerCase().includes('pertanian') && c.interfaceName.toLowerCase().includes('pertanian')) ||
            (selectedAp.name.toLowerCase().includes('dekanat') && c.interfaceName.toLowerCase().includes(selectedAp.name.toLowerCase()))
        );

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedAp(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl border ${
                    selectedAp.status === 'ON'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 font-mono">{selectedAp.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">CAPsMAN Remote AP ID: #{selectedAp.id} • {selectedAp.type}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAp(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px]">STATUS OPERASIONAL</span>
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${selectedAp.status === 'ON' ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`}></span>
                    <span className={`font-bold text-sm ${selectedAp.status === 'ON' ? 'text-emerald-300' : 'text-rose-400'}`}>
                      {selectedAp.status === 'ON' ? 'ON (RUNNING-AP)' : 'OFF (INACTIVE)'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px]">CLIENT TERHUBUNG</span>
                  <div className="text-sm font-bold text-cyan-300 flex items-center space-x-1">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>
                      <strong className="text-cyan-300">{apClients.length || selectedAp.activeClients || 0}</strong> Perangkat User
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px]">MAC ADDRESS</span>
                  <div className="font-bold text-cyan-300">{selectedAp.mac || 'N/A'}</div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px]">SSID BROADCAST</span>
                  <div className="font-bold text-purple-300">{selectedAp.ssid}</div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px]">CHANNEL & FREKUENSI</span>
                  <div className="font-bold text-slate-200">{selectedAp.channel} ({selectedAp.frequency} MHz)</div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px]">MIKROTIK FLAGS</span>
                  <div className="font-bold text-emerald-400">{selectedAp.flags}</div>
                </div>

                {selectedAp.ipPort && (
                  <div className="sm:col-span-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px]">IP & PORT TUNNEL CAP</span>
                    <div className="font-bold text-slate-300">{selectedAp.ipPort}</div>
                  </div>
                )}

                {selectedAp.comment && (
                  <div className="sm:col-span-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px]">CATATAN LAPANGAN / KENDALA</span>
                    <div className="font-bold text-amber-300">{selectedAp.comment}</div>
                  </div>
                )}
              </div>

              {/* SECTION: DAFTAR PERANGKAT KLIEN YANG TERKONEKSI */}
              <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider">
                        Daftar Perangkat Terkoneksi ({apClients.length})
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Client WiFi yang saat ini terhubung ke radio {selectedAp.name}
                      </p>
                    </div>
                  </div>
                  {apClients.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Aktif Terhubung
                    </span>
                  )}
                </div>

                {apClients.length === 0 ? (
                  <div className="p-5 text-center bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-500 space-y-1">
                    <Users className="w-6 h-6 mx-auto text-slate-600 opacity-60" />
                    <p className="text-slate-400 font-medium">Belum ada perangkat klien yang terhubung</p>
                    <p className="text-[10px] text-slate-600">AP dalam keadaan idle atau offline</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {apClients.map((client, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3.5 space-y-2 text-xs font-mono transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-2.5">
                            <span className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
                              {client.deviceType === 'smartphone' || client.mac.startsWith('8') || client.mac.startsWith('6') ? (
                                <Smartphone className="w-4 h-4" />
                              ) : (
                                <Laptop className="w-4 h-4" />
                              )}
                            </span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-100 text-xs">{client.hostname || 'Perangkat Client WiFi'}</span>
                                {client.ipAddress && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950 text-slate-400 border border-slate-800">
                                    {client.ipAddress}
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-cyan-300 text-[11px] tracking-wider">{client.mac}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto ${
                              client.rxSignal > -60
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : client.rxSignal > -75
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            Sinyal: {client.rxSignal} dBm ({client.status})
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Rate Tx / Rx:</span>
                            <span className="text-slate-200 truncate block">{client.txRate.split('-')[0]} / {client.rxRate.split('-')[0]}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Total Trafik:</span>
                            <span className="text-slate-200 truncate block">{client.txRxBytes || 'Aktif'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Uptime Sesi:</span>
                            <span className="text-emerald-400 font-bold block">{client.uptime}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAp(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition"
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
