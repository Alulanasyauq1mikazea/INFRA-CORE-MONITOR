import { PrometheusTelemetry } from '../types.js';
import { getConfig } from '../config.js';
import { recordMetric } from '../db.js';

// Historical buffer for graphs
const historyBuffer: {
  timestamp: number;
  cpu: number;
  memory: number;
  netRx: number;
  netTx: number;
  load1: number;
}[] = [];

// Demo state generator for realistic fallback
let demoCpu = 24.5;
let demoMem = 58.2;
let demoRx = 4500000;
let demoTx = 1800000;

export async function fetchPrometheusData(): Promise<{
  telemetry: PrometheusTelemetry;
  latencyMs: number;
  isLive: boolean;
  error: string | null;
}> {
  const config = getConfig().prometheus;
  const startTime = Date.now();

  if (!config.enabled) {
    return {
      telemetry: getDemoPrometheusTelemetry(false),
      latencyMs: 0,
      isLive: false,
      error: 'Prometheus collector is disabled in configuration',
    };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  } else if (config.username && config.password) {
    const creds = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 5000);

    // 1. Try Prometheus Instant Query API
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const queryUrl = `${baseUrl}/api/v1/query`;

    // Core PromQL queries to run in parallel
    const queries = {
      cpu: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)',
      memTotal: 'node_memory_MemTotal_bytes',
      memAvail: 'node_memory_MemAvailable_bytes',
      diskTotal: 'node_filesystem_size_bytes{mountpoint="/"}',
      diskAvail: 'node_filesystem_avail_bytes{mountpoint="/"}',
      netRx: 'sum(rate(node_network_receive_bytes_total[1m]))',
      netTx: 'sum(rate(node_network_transmit_bytes_total[1m]))',
      load1: 'node_load1',
      load5: 'node_load5',
      load15: 'node_load15',
      bootTime: 'node_boot_time_seconds',
    };

    const queryPromises = Object.entries(queries).map(async ([key, promql]) => {
      const url = `${queryUrl}?query=${encodeURIComponent(promql)}`;
      const res = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${key}`);
      const json = await res.json();
      const valStr = json?.data?.result?.[0]?.value?.[1];
      return [key, valStr !== undefined ? parseFloat(valStr) : null] as const;
    });

    const results = await Promise.allSettled(queryPromises);
    clearTimeout(timeoutId);

    const dataMap: Record<string, number | null> = {};
    let successfulQueries = 0;

    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        const [key, val] = r.value;
        dataMap[key] = val;
        if (val !== null && !isNaN(val)) successfulQueries++;
      }
    });

    const latencyMs = Date.now() - startTime;

    if (successfulQueries > 0) {
      const cpu = Math.max(0, Math.min(100, dataMap.cpu ?? 15));
      const memTotal = dataMap.memTotal || 16 * 1024 * 1024 * 1024;
      const memAvail = dataMap.memAvail || 8 * 1024 * 1024 * 1024;
      const memUsed = Math.max(0, memTotal - memAvail);
      const memPercent = (memUsed / memTotal) * 100;

      const diskTotal = dataMap.diskTotal || 500 * 1024 * 1024 * 1024;
      const diskAvail = dataMap.diskAvail || 200 * 1024 * 1024 * 1024;
      const diskUsed = Math.max(0, diskTotal - diskAvail);
      const diskPercent = (diskUsed / diskTotal) * 100;

      const netRx = dataMap.netRx || 0;
      const netTx = dataMap.netTx || 0;
      const load1 = dataMap.load1 || 0.5;
      const load5 = dataMap.load5 || 0.4;
      const load15 = dataMap.load15 || 0.3;
      const bootTime = dataMap.bootTime || Date.now() / 1000 - 3600 * 24;
      const uptimeSeconds = Math.max(0, Math.floor(Date.now() / 1000 - bootTime));

      // Record metrics to SQLite
      recordMetric('prometheus', 'cpu_percent', cpu);
      recordMetric('prometheus', 'memory_percent', memPercent);
      recordMetric('prometheus', 'network_rx_bps', netRx);
      recordMetric('prometheus', 'network_tx_bps', netTx);
      recordMetric('prometheus', 'load1', load1);

      // Add to buffer
      historyBuffer.push({
        timestamp: Date.now(),
        cpu: Number(cpu.toFixed(1)),
        memory: Number(memPercent.toFixed(1)),
        netRx: Math.round(netRx),
        netTx: Math.round(netTx),
        load1: Number(load1.toFixed(2)),
      });

      if (historyBuffer.length > 50) historyBuffer.shift();

      const telemetry: PrometheusTelemetry = {
        isLive: true,
        timestamp: Date.now(),
        nodeMetrics: {
          cpuPercent: Number(cpu.toFixed(1)),
          memoryUsedBytes: memUsed,
          memoryTotalBytes: memTotal,
          memoryPercent: Number(memPercent.toFixed(1)),
          diskUsedBytes: diskUsed,
          diskTotalBytes: diskTotal,
          diskPercent: Number(diskPercent.toFixed(1)),
          networkRxBytesPerSec: Math.round(netRx),
          networkTxBytesPerSec: Math.round(netTx),
          load1: Number(load1.toFixed(2)),
          load5: Number(load5.toFixed(2)),
          load15: Number(load15.toFixed(2)),
          uptimeSeconds,
          instanceName: 'node-exporter-main',
        },
        history: [...historyBuffer],
      };

      return {
        telemetry,
        latencyMs,
        isLive: true,
        error: null,
      };
    }

    throw new Error('Prometheus endpoint returned empty metric results');
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err.name === 'AbortError' ? 'Prometheus request timed out' : err.message || 'Connection refused';

    // Graceful fallback to realistic demo stream
    const fallbackTelemetry = getDemoPrometheusTelemetry(false);

    return {
      telemetry: fallbackTelemetry,
      latencyMs,
      isLive: false,
      error: errorMsg,
    };
  }
}

function getDemoPrometheusTelemetry(isLive: boolean): PrometheusTelemetry {
  // Drift simulation values smoothly
  demoCpu = Math.max(5, Math.min(95, demoCpu + (Math.random() * 8 - 4)));
  demoMem = Math.max(40, Math.min(85, demoMem + (Math.random() * 2 - 1)));
  demoRx = Math.max(100000, Math.min(25000000, demoRx + (Math.random() * 2000000 - 1000000)));
  demoTx = Math.max(50000, Math.min(10000000, demoTx + (Math.random() * 1000000 - 500000)));

  const memTotal = 32 * 1024 * 1024 * 1024; // 32 GB
  const memUsed = (memTotal * demoMem) / 100;
  const diskTotal = 1000 * 1024 * 1024 * 1024; // 1 TB
  const diskUsed = 420 * 1024 * 1024 * 1024; // 420 GB

  const now = Date.now();

  historyBuffer.push({
    timestamp: now,
    cpu: Number(demoCpu.toFixed(1)),
    memory: Number(demoMem.toFixed(1)),
    netRx: Math.round(demoRx),
    netTx: Math.round(demoTx),
    load1: Number((demoCpu / 25).toFixed(2)),
  });

  if (historyBuffer.length > 50) historyBuffer.shift();

  // Populate initial buffer if empty
  if (historyBuffer.length < 10) {
    for (let i = 10; i > 0; i--) {
      historyBuffer.unshift({
        timestamp: now - i * 4000,
        cpu: Number((demoCpu + (Math.random() * 6 - 3)).toFixed(1)),
        memory: Number((demoMem + (Math.random() * 2 - 1)).toFixed(1)),
        netRx: Math.round(demoRx * (0.8 + Math.random() * 0.4)),
        netTx: Math.round(demoTx * (0.8 + Math.random() * 0.4)),
        load1: Number((demoCpu / 25 + (Math.random() * 0.2 - 0.1)).toFixed(2)),
      });
    }
  }

  return {
    isLive,
    timestamp: now,
    nodeMetrics: {
      cpuPercent: Number(demoCpu.toFixed(1)),
      memoryUsedBytes: memUsed,
      memoryTotalBytes: memTotal,
      memoryPercent: Number(demoMem.toFixed(1)),
      diskUsedBytes: diskUsed,
      diskTotalBytes: diskTotal,
      diskPercent: Number(((diskUsed / diskTotal) * 100).toFixed(1)),
      networkRxBytesPerSec: Math.round(demoRx),
      networkTxBytesPerSec: Math.round(demoTx),
      load1: Number((demoCpu / 25).toFixed(2)),
      load5: Number((demoCpu / 28).toFixed(2)),
      load15: Number((demoCpu / 30).toFixed(2)),
      uptimeSeconds: 1428500, // ~16 days
      instanceName: 'srv-primary-node (Ubuntu 24.04 LTS)',
    },
    history: [...historyBuffer],
  };
}
