import { FullTelemetrySnapshot, CollectorStatus, AlertItem } from '../types.js';
import { getConfig } from '../config.js';
import { updateCollectorStatusInDb, recordAlert, getRecentAlerts, pruneOldMetrics, recordEventFeed } from '../db.js';
import { fetchPrometheusData } from './prometheus.js';
import { fetchMikroTikData } from './mikrotik.js';
import { fetchCrowdSecData } from './crowdsec.js';
import { fetchUptimeKumaData } from './uptimeKuma.js';
import { fetchProxmoxData } from './proxmox.js';
import { broadcastTelemetry, broadcastAlert } from '../socket.js';

let latestSnapshot: FullTelemetrySnapshot | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let isPolling = false;

export async function runAllCollectors(): Promise<FullTelemetrySnapshot> {
  if (isPolling) return latestSnapshot!;
  isPolling = true;

  const config = getConfig();

  try {
    const [promRes, mktRes, crowdRes, kumaRes, pveRes] = await Promise.all([
      fetchPrometheusData(),
      fetchMikroTikData(),
      fetchCrowdSecData(),
      fetchUptimeKumaData(),
      fetchProxmoxData(),
    ]);

    const now = Date.now();

    const collectors: Record<string, CollectorStatus> = {
      prometheus: {
        source: 'prometheus',
        displayName: 'Prometheus TSDB',
        enabled: config.prometheus.enabled,
        isLive: promRes.isLive,
        lastAttempt: now,
        lastSuccess: promRes.isLive ? now : null,
        lastError: promRes.error,
        latencyMs: promRes.latencyMs,
        itemCount: promRes.telemetry.history.length,
        endpointUrl: config.prometheus.endpoint,
      },
      mikrotik: {
        source: 'mikrotik',
        displayName: 'MikroTik RouterOS',
        enabled: config.mikrotik.enabled,
        isLive: mktRes.isLive,
        lastAttempt: now,
        lastSuccess: mktRes.isLive ? now : null,
        lastError: mktRes.error,
        latencyMs: mktRes.latencyMs,
        itemCount: mktRes.telemetry.interfaces.length,
        endpointUrl: config.mikrotik.host,
      },
      crowdsec: {
        source: 'crowdsec',
        displayName: 'CrowdSec LAPI & Exporter',
        enabled: config.crowdsec.enabled,
        isLive: crowdRes.isLive,
        lastAttempt: now,
        lastSuccess: crowdRes.isLive ? now : null,
        lastError: crowdRes.error,
        latencyMs: crowdRes.latencyMs,
        itemCount: crowdRes.telemetry.activeDecisions.length,
        endpointUrl: config.crowdsec.lapiEndpoint,
      },
      uptimeKuma: {
        source: 'uptimeKuma',
        displayName: 'Uptime Kuma Health',
        enabled: config.uptimeKuma.enabled,
        isLive: kumaRes.isLive,
        lastAttempt: now,
        lastSuccess: kumaRes.isLive ? now : null,
        lastError: kumaRes.error,
        latencyMs: kumaRes.latencyMs,
        itemCount: kumaRes.telemetry.monitors.length,
        endpointUrl: config.uptimeKuma.endpoint,
      },
      proxmox: {
        source: 'proxmox',
        displayName: 'Proxmox VE Cluster',
        enabled: config.proxmox.enabled,
        isLive: pveRes.isLive,
        lastAttempt: now,
        lastSuccess: pveRes.isLive ? now : null,
        lastError: pveRes.error,
        latencyMs: pveRes.latencyMs,
        itemCount: pveRes.telemetry.vms.length,
        endpointUrl: config.proxmox.apiEndpoint || config.proxmox.exporterEndpoint,
      },
    };

    // Update collector status in SQLite
    Object.values(collectors).forEach((c) => updateCollectorStatusInDb(c));

    // Calculate Health Score (0 - 100)
    let score = 100;
    if (promRes.telemetry.nodeMetrics.cpuPercent > 85) score -= 15;
    if (promRes.telemetry.nodeMetrics.memoryPercent > 90) score -= 15;
    if (kumaRes.telemetry.downCount > 0) score -= kumaRes.telemetry.downCount * 12;
    if (mktRes.telemetry.system.cpuLoad > 80) score -= 10;
    if (pveRes.telemetry.cluster.nodesOnline < pveRes.telemetry.cluster.nodesCount) score -= 25;
    const healthScore = Math.max(10, Math.min(100, Math.round(score)));

    // Detect and trigger automatic threshold alerts
    checkAndEmitAlerts(promRes.telemetry, mktRes.telemetry, crowdRes.telemetry, kumaRes.telemetry, pveRes.telemetry);

    const activeAlerts = getRecentAlerts(20);

    const snapshot: FullTelemetrySnapshot = {
      timestamp: now,
      collectors,
      prometheus: promRes.telemetry,
      mikrotik: mktRes.telemetry,
      crowdsec: crowdRes.telemetry,
      uptimeKuma: kumaRes.telemetry,
      proxmox: pveRes.telemetry,
      activeAlerts,
      healthScore,
    };

    latestSnapshot = snapshot;

    // Broadcast through socket.io
    broadcastTelemetry(snapshot);

    return snapshot;
  } catch (err) {
    console.error('[CollectorManager] Error during collection sweep:', err);
    return latestSnapshot!;
  } finally {
    isPolling = false;
  }
}

function checkAndEmitAlerts(
  prom: any,
  mkt: any,
  crowd: any,
  kuma: any,
  pve: any
) {
  // Prometheus alerts
  if (prom.nodeMetrics.cpuPercent > 90) {
    const alert: AlertItem = {
      id: `prom-cpu-high-${Math.floor(Date.now() / 60000)}`,
      source: 'prometheus',
      severity: 'critical',
      title: 'High Host CPU Utilization',
      message: `Node CPU usage reached ${prom.nodeMetrics.cpuPercent}% (threshold: 90%)`,
      timestamp: Date.now(),
      acknowledged: false,
    };
    recordAlert(alert);
    broadcastAlert(alert);
  }

  // Uptime Kuma alerts for down services
  if (kuma.downCount > 0) {
    const downMonitor = kuma.monitors.find((m: any) => m.status === 0);
    if (downMonitor) {
      const alert: AlertItem = {
        id: `kuma-down-${downMonitor.id}-${Math.floor(Date.now() / 60000)}`,
        source: 'uptimeKuma',
        severity: 'critical',
        title: `Service Outage: ${downMonitor.name}`,
        message: `Uptime monitor ${downMonitor.name} (${downMonitor.url}) is currently DOWN!`,
        timestamp: Date.now(),
        acknowledged: false,
      };
      recordAlert(alert);
      broadcastAlert(alert);
    }
  }

  // Proxmox alerts
  if (pve.cluster.nodesOnline < pve.cluster.nodesCount) {
    const alert: AlertItem = {
      id: `pve-node-offline-${Date.now()}`,
      source: 'proxmox',
      severity: 'critical',
      title: 'Proxmox Node Offline',
      message: `Only ${pve.cluster.nodesOnline} of ${pve.cluster.nodesCount} nodes are online in ${pve.cluster.name}`,
      timestamp: Date.now(),
      acknowledged: false,
    };
    recordAlert(alert);
    broadcastAlert(alert);
  }
}

export function startCollectorLoop(): void {
  if (pollTimer) clearInterval(pollTimer);
  const config = getConfig();
  const interval = config.server.pollIntervalMs || 4000;

  console.log(`[CollectorManager] Starting telemetry polling loop every ${interval}ms`);

  // Run initial sweep immediately
  runAllCollectors();

  pollTimer = setInterval(() => {
    runAllCollectors();
  }, interval);

  // Daily pruning
  setInterval(() => {
    const pruned = pruneOldMetrics(config.storage.retainDays || 7);
    if (pruned) console.log('[SQLite] Pruned metrics older than retention period');
  }, 24 * 60 * 60 * 1000);
}

export function restartCollectorLoop(): void {
  startCollectorLoop();
}

export function getLatestSnapshot(): FullTelemetrySnapshot | null {
  return latestSnapshot;
}

export async function testEndpoint(type: string, url: string, auth?: any): Promise<{
  success: boolean;
  latencyMs: number;
  statusCode?: number;
  message: string;
  sampleData?: any;
}> {
  // Allow self-signed TLS certificates for local hypervisors and switches
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  let probeUrl = url.trim();
  if (!probeUrl.startsWith('http://') && !probeUrl.startsWith('https://')) {
    if (probeUrl.includes(':8006') || probeUrl.includes(':443')) {
      probeUrl = `https://${probeUrl}`;
    } else {
      probeUrl = `http://${probeUrl}`;
    }
  }

  // If Proxmox API base without endpoint path, target version check API
  if (type === 'proxmox' && !probeUrl.includes('/api2/') && !probeUrl.includes('/pve') && !probeUrl.includes('/metrics')) {
    probeUrl = probeUrl.replace(/\/+$/, '') + '/api2/json/version';
  }

  const startTime = Date.now();
  try {
    const headers: Record<string, string> = { Accept: 'application/json, text/plain, */*' };
    
    if (auth?.token) {
      if (type === 'proxmox' && !auth.token.startsWith('Bearer ') && !auth.token.startsWith('PVEAPIToken=')) {
        headers['Authorization'] = `PVEAPIToken=${auth.token}`;
      } else {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
    }
    if (auth?.apiKey) headers['X-Api-Key'] = auth.apiKey;
    if (auth?.username && auth?.password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(probeUrl, { headers, signal: controller.signal });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const contentType = res.headers.get('content-type') || '';
    let sample: any = null;

    if (contentType.includes('application/json')) {
      sample = await res.json();
    } else {
      const txt = await res.text();
      sample = txt.slice(0, 300);
    }

    recordEventFeed(type, 'TEST_CONNECTION', `Tested ${probeUrl} -> HTTP ${res.status} (${latencyMs}ms)`);

    return {
      success: res.ok,
      latencyMs,
      statusCode: res.status,
      message: res.ok ? `Connected successfully in ${latencyMs}ms (HTTP ${res.status})` : `Failed with HTTP ${res.status}: ${res.statusText}`,
      sampleData: sample,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: err.name === 'AbortError' ? 'Connection timed out after 6000ms' : err.message || 'Connection failed',
    };
  }
}
