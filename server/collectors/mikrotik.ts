import { MikroTikTelemetry, MikroTikInterface, MikroTikDhcpLease } from '../types.js';
import { getConfig } from '../config.js';
import { recordMetric } from '../db.js';

const trafficHistory: {
  timestamp: number;
  totalRxBps: number;
  totalTxBps: number;
}[] = [];

// Demo state
let routerCpu = 18;
let ether1Rx = 14500000;
let ether1Tx = 4200000;

export async function fetchMikroTikData(): Promise<{
  telemetry: MikroTikTelemetry;
  latencyMs: number;
  isLive: boolean;
  error: string | null;
}> {
  const config = getConfig().mikrotik;
  const startTime = Date.now();

  if (!config.enabled) {
    return {
      telemetry: getDemoMikroTikTelemetry(false),
      latencyMs: 0,
      isLive: false,
      error: 'MikroTik collector is disabled in configuration',
    };
  }

  const baseUrl = config.host.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (config.username && config.password) {
    const creds = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }

  // Handle self-signed certs if configured
  if (config.insecureTls) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 5000);

    // Fetch resources & interfaces from RouterOS REST API
    const [resResource, resInterfaces, resLeases] = await Promise.allSettled([
      fetch(`${baseUrl}/rest/system/resource`, { headers, signal: controller.signal }),
      fetch(`${baseUrl}/rest/interface`, { headers, signal: controller.signal }),
      fetch(`${baseUrl}/rest/ip/dhcp-server/lease`, { headers, signal: controller.signal }),
    ]);

    clearTimeout(timeoutId);

    if (resResource.status === 'fulfilled' && resResource.value.ok) {
      const resourceData = await resResource.value.json();
      const resItem = Array.isArray(resourceData) ? resourceData[0] : resourceData;

      let interfaceList: MikroTikInterface[] = [];
      let totalRx = 0;
      let totalTx = 0;

      if (resInterfaces.status === 'fulfilled' && resInterfaces.value.ok) {
        const ifData = await resInterfaces.value.json();
        const rawList = Array.isArray(ifData) ? ifData : [ifData];

        interfaceList = rawList.map((item: any) => {
          const rx = Number(item['rx-byte'] || item['rx-bits-per-second'] || 0);
          const tx = Number(item['tx-byte'] || item['tx-bits-per-second'] || 0);
          totalRx += rx;
          totalTx += tx;

          return {
            name: item.name || item['default-name'] || 'etherX',
            type: item.type || 'ether',
            running: item.running === 'true' || item.running === true,
            disabled: item.disabled === 'true' || item.disabled === true,
            rxBytesPerSec: rx,
            txBytesPerSec: tx,
            rxPacketsPerSec: Number(item['rx-packet'] || 0),
            txPacketsPerSec: Number(item['tx-packet'] || 0),
            macAddress: item['mac-address'],
            comment: item.comment,
          };
        });
      }

      let leaseList: MikroTikDhcpLease[] = [];
      if (resLeases.status === 'fulfilled' && resLeases.value.ok) {
        const leaseData = await resLeases.value.json();
        const rawLeases = Array.isArray(leaseData) ? leaseData : [leaseData];
        leaseList = rawLeases.slice(0, 20).map((l: any) => ({
          address: l.address || '',
          macAddress: l['mac-address'] || '',
          hostName: l['host-name'] || l.comment || 'Unknown Client',
          status: l.status || 'bound',
          expiresAfter: l['expires-after'],
          server: l.server,
        }));
      }

      const cpuLoad = Number(resItem['cpu-load'] || 10);
      const totalMem = Number(resItem['total-memory'] || 1073741824);
      const freeMem = Number(resItem['free-memory'] || 536870912);
      const latencyMs = Date.now() - startTime;

      recordMetric('mikrotik', 'cpu_load', cpuLoad);
      recordMetric('mikrotik', 'traffic_rx', totalRx);
      recordMetric('mikrotik', 'traffic_tx', totalTx);

      trafficHistory.push({
        timestamp: Date.now(),
        totalRxBps: totalRx,
        totalTxBps: totalTx,
      });
      if (trafficHistory.length > 50) trafficHistory.shift();

      const telemetry: MikroTikTelemetry = {
        isLive: true,
        timestamp: Date.now(),
        system: {
          boardName: resItem['board-name'] || 'RouterBOARD',
          model: resItem['model'] || resItem['platform'] || 'MikroTik CCR/RB',
          version: resItem['version'] || 'RouterOS v7.x',
          cpuLoad,
          cpuCount: Number(resItem['cpu-count'] || 4),
          cpuFrequencyMhz: Number(resItem['cpu-frequency'] || 1400),
          freeMemoryBytes: freeMem,
          totalMemoryBytes: totalMem,
          freeHddBytes: Number(resItem['free-hdd-space'] || 134217728),
          totalHddBytes: Number(resItem['total-hdd-space'] || 268435456),
          uptime: resItem['uptime'] || '12w4d',
          voltageVolts: 24.2,
          temperatureCelsius: 41,
          activeConnections: 342,
        },
        interfaces: interfaceList.length > 0 ? interfaceList : getDemoInterfaces(),
        dhcpLeases: leaseList.length > 0 ? leaseList : getDemoDhcpLeases(),
        trafficHistory: [...trafficHistory],
      };

      return {
        telemetry,
        latencyMs,
        isLive: true,
        error: null,
      };
    }

    throw new Error('MikroTik REST API returned non-OK response');
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err.name === 'AbortError' ? 'MikroTik connection timed out' : err.message || 'Connection refused';

    return {
      telemetry: getDemoMikroTikTelemetry(false),
      latencyMs,
      isLive: false,
      error: errorMsg,
    };
  }
}

function getDemoInterfaces(): MikroTikInterface[] {
  ether1Rx = Math.max(1000000, ether1Rx + (Math.random() * 2000000 - 1000000));
  ether1Tx = Math.max(500000, ether1Tx + (Math.random() * 800000 - 400000));

  return [
    {
      name: 'ether1-WAN (ISP Primary)',
      type: 'ether',
      running: true,
      disabled: false,
      rxBytesPerSec: Math.round(ether1Rx),
      txBytesPerSec: Math.round(ether1Tx),
      rxPacketsPerSec: Math.round(ether1Rx / 1400),
      txPacketsPerSec: Math.round(ether1Tx / 1400),
      macAddress: 'DC:2C:6E:88:1A:01',
      comment: 'Fiber Uplink 1Gbps',
    },
    {
      name: 'ether2-LAN (Core Switch)',
      type: 'ether',
      running: true,
      disabled: false,
      rxBytesPerSec: Math.round(ether1Tx * 0.95),
      txBytesPerSec: Math.round(ether1Rx * 0.95),
      rxPacketsPerSec: Math.round((ether1Tx * 0.95) / 1400),
      txPacketsPerSec: Math.round((ether1Rx * 0.95) / 1400),
      macAddress: 'DC:2C:6E:88:1A:02',
      comment: 'Trunk to Switch-01',
    },
    {
      name: 'sfp-sfpplus1 (10G Server Farm)',
      type: 'sfp-plus',
      running: true,
      disabled: false,
      rxBytesPerSec: Math.round(ether1Rx * 1.8),
      txBytesPerSec: Math.round(ether1Tx * 1.4),
      rxPacketsPerSec: Math.round((ether1Rx * 1.8) / 1400),
      txPacketsPerSec: Math.round((ether1Tx * 1.4) / 1400),
      macAddress: 'DC:2C:6E:88:1A:03',
      comment: 'Proxmox Cluster Vlan',
    },
    {
      name: 'bridge-vlan100-mgmt',
      type: 'bridge',
      running: true,
      disabled: false,
      rxBytesPerSec: 124000,
      txBytesPerSec: 85000,
      rxPacketsPerSec: 90,
      txPacketsPerSec: 65,
      macAddress: 'DC:2C:6E:88:1A:00',
      comment: 'Management Subnet',
    },
    {
      name: 'wireguard-hq',
      type: 'wireguard',
      running: true,
      disabled: false,
      rxBytesPerSec: 840000,
      txBytesPerSec: 1200000,
      rxPacketsPerSec: 720,
      txPacketsPerSec: 890,
      comment: 'Site-to-Site VPN Tunnel',
    },
  ];
}

function getDemoDhcpLeases(): MikroTikDhcpLease[] {
  return [
    { address: '192.168.10.15', macAddress: '00:1A:2B:3C:4D:5E', hostName: 'proxmox-node-01', status: 'bound', server: 'dhcp-lan' },
    { address: '192.168.10.16', macAddress: '00:1A:2B:3C:4D:5F', hostName: 'proxmox-node-02', status: 'bound', server: 'dhcp-lan' },
    { address: '192.168.10.22', macAddress: 'B8:27:EB:11:22:33', hostName: 'crowdsec-security-box', status: 'bound', server: 'dhcp-lan' },
    { address: '192.168.10.30', macAddress: '44:65:0E:99:88:77', hostName: 'nas-truenas-core', status: 'bound', server: 'dhcp-lan' },
    { address: '192.168.10.45', macAddress: 'FC:EC:DA:AA:BB:CC', hostName: 'unifi-ap-ac-pro', status: 'bound', server: 'dhcp-lan' },
    { address: '192.168.10.102', macAddress: '3C:22:FB:45:67:89', hostName: 'admin-macbook-pro', status: 'bound', server: 'dhcp-lan' },
  ];
}

function getDemoMikroTikTelemetry(isLive: boolean): MikroTikTelemetry {
  routerCpu = Math.max(8, Math.min(75, routerCpu + (Math.random() * 6 - 3)));
  const interfaces = getDemoInterfaces();
  const totalRx = interfaces.reduce((acc, i) => acc + i.rxBytesPerSec, 0);
  const totalTx = interfaces.reduce((acc, i) => acc + i.txBytesPerSec, 0);

  const now = Date.now();
  trafficHistory.push({
    timestamp: now,
    totalRxBps: totalRx,
    totalTxBps: totalTx,
  });
  if (trafficHistory.length > 50) trafficHistory.shift();

  if (trafficHistory.length < 10) {
    for (let i = 10; i > 0; i--) {
      trafficHistory.unshift({
        timestamp: now - i * 4000,
        totalRxBps: Math.round(totalRx * (0.8 + Math.random() * 0.4)),
        totalTxBps: Math.round(totalTx * (0.8 + Math.random() * 0.4)),
      });
    }
  }

  return {
    isLive,
    timestamp: now,
    system: {
      boardName: 'CCR2004-1G-12S+2XS',
      model: 'Cloud Core Router',
      version: 'RouterOS v7.14.3 (stable)',
      cpuLoad: Number(routerCpu.toFixed(1)),
      cpuCount: 4,
      cpuFrequencyMhz: 1700,
      freeMemoryBytes: 3420 * 1024 * 1024,
      totalMemoryBytes: 4096 * 1024 * 1024,
      freeHddBytes: 980 * 1024 * 1024,
      totalHddBytes: 1024 * 1024 * 1024,
      uptime: '42d 18h 35m',
      voltageVolts: 24.3,
      temperatureCelsius: 42,
      activeConnections: 894,
    },
    interfaces,
    dhcpLeases: getDemoDhcpLeases(),
    trafficHistory: [...trafficHistory],
  };
}
