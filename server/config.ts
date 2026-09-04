import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ServerConfig, CustomDataSource } from './types.js';

dotenv.config();

const CONFIG_PATH = path.resolve(process.cwd(), 'config.json');
const EXAMPLE_CONFIG_PATH = path.resolve(process.cwd(), 'config.example.json');

const DEFAULT_DATA_SOURCES: CustomDataSource[] = [
  {
    id: 'ds-pve-cluster-01',
    name: 'Proxmox VE Cluster (PVE API & Exporter)',
    type: 'proxmox',
    targetDashboard: 'proxmox',
    endpoint: 'https://192.168.1.120:8006',
    authType: 'apiKey',
    username: 'root@pam',
    token: 'root@pam!monitoring',
    enabled: true,
    pollIntervalMs: 4000,
    timeoutMs: 5000,
    notes: 'Primary Proxmox VE 8.2 Cluster with PVE-01, PVE-02, PVE-03, PVE-04 nodes',
    lastStatus: 'online',
    lastLatencyMs: 14,
    createdAt: 1700000000000,
  },
  {
    id: 'ds-prom-tsdb',
    name: 'Prometheus TSDB & Node Exporter',
    type: 'prometheus',
    targetDashboard: 'prometheus',
    endpoint: 'http://192.168.1.100:9090',
    authType: 'none',
    enabled: true,
    pollIntervalMs: 4000,
    timeoutMs: 5000,
    notes: 'Hardware & OS metrics collector for Ubuntu 24.04 LTS servers',
    lastStatus: 'online',
    lastLatencyMs: 9,
    createdAt: 1700000000000,
  },
  {
    id: 'ds-mkt-ccr',
    name: 'MikroTik CCR2004 Core Router',
    type: 'mikrotik',
    targetDashboard: 'mikrotik',
    endpoint: 'https://192.168.1.1:443',
    authType: 'basic',
    username: 'admin',
    enabled: true,
    pollIntervalMs: 4000,
    timeoutMs: 5000,
    notes: 'Edge RouterOS REST gateway, BGP peering & dual-WAN load balance',
    lastStatus: 'online',
    lastLatencyMs: 11,
    createdAt: 1700000000000,
  },
  {
    id: 'ds-crowdsec-lapi',
    name: 'CrowdSec LAPI Threat Hub',
    type: 'crowdsec',
    targetDashboard: 'crowdsec',
    endpoint: 'http://192.168.1.105:8080',
    authType: 'apiKey',
    enabled: true,
    pollIntervalMs: 5000,
    timeoutMs: 5000,
    notes: 'Collaborative IPS, port-scan alerts, brute-force bans & active firewall bouncers',
    lastStatus: 'online',
    lastLatencyMs: 17,
    createdAt: 1700000000000,
  },
  {
    id: 'ds-uptime-kuma',
    name: 'Uptime Kuma Sentinel Service',
    type: 'uptimeKuma',
    targetDashboard: 'uptimeKuma',
    endpoint: 'http://192.168.1.110:3001',
    authType: 'none',
    enabled: true,
    pollIntervalMs: 5000,
    timeoutMs: 5000,
    notes: 'Synthetic HTTP / DNS / TCP service monitors and status page',
    lastStatus: 'online',
    lastLatencyMs: 15,
    createdAt: 1700000000000,
  },
];

const DEFAULT_CONFIG: ServerConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    corsOrigin: '*',
    demoFallbackEnabled: true,
    pollIntervalMs: 4000,
  },
  prometheus: {
    enabled: true,
    endpoint: 'http://192.168.1.100:9090',
    username: '',
    password: '',
    token: '',
    timeoutMs: 5000,
    customQueries: [
      {
        name: 'Node CPU Usage %',
        query: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)',
        unit: '%',
      },
      {
        name: 'Memory Available',
        query: 'node_memory_MemAvailable_bytes',
        unit: 'bytes',
      },
    ],
  },
  mikrotik: {
    enabled: true,
    host: 'https://192.168.1.1',
    port: 443,
    protocol: 'rest',
    username: 'admin',
    password: '',
    insecureTls: true,
    timeoutMs: 5000,
    monitoredInterfaces: ['ether1-WAN', 'ether2-LAN', 'bridge1'],
  },
  crowdsec: {
    enabled: true,
    exporterEndpoint: 'http://192.168.1.105:6060/metrics',
    lapiEndpoint: 'http://192.168.1.105:8080',
    apiKey: '',
    machineId: 'sentinel-watcher',
    timeoutMs: 5000,
  },
  uptimeKuma: {
    enabled: true,
    endpoint: 'http://192.168.1.110:3001',
    apiKey: '',
    slug: 'default',
    metricsEndpoint: 'http://192.168.1.110:3001/metrics',
    timeoutMs: 5000,
  },
  proxmox: {
    enabled: true,
    exporterEndpoint: 'http://192.168.1.120:9221/pve',
    apiEndpoint: 'https://192.168.1.120:8006',
    tokenId: 'root@pam!monitoring',
    tokenSecret: '',
    verifySsl: false,
    clusterName: 'PVE-Cluster-01',
    timeoutMs: 5000,
  },
  storage: {
    sqlitePath: './data/sentinel.sqlite',
    retainDays: 7,
    maxHistoryPoints: 500,
  },
  dataSources: DEFAULT_DATA_SOURCES,
};

let activeConfig: ServerConfig = loadConfiguration();

export function loadConfiguration(): ServerConfig {
  let fileConfig: Partial<ServerConfig> = {};

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      fileConfig = JSON.parse(raw);
    } else if (fs.existsSync(EXAMPLE_CONFIG_PATH)) {
      const raw = fs.readFileSync(EXAMPLE_CONFIG_PATH, 'utf-8');
      fileConfig = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Config] Failed to parse config.json, falling back to defaults:', err);
  }

  // Merge defaults with file config
  const merged: ServerConfig = {
    server: {
      ...DEFAULT_CONFIG.server,
      ...(fileConfig.server || {}),
      port: Number(process.env.PORT) || fileConfig.server?.port || DEFAULT_CONFIG.server.port,
      host: process.env.HOST || fileConfig.server?.host || DEFAULT_CONFIG.server.host,
      corsOrigin: process.env.CORS_ORIGIN || fileConfig.server?.corsOrigin || DEFAULT_CONFIG.server.corsOrigin,
      demoFallbackEnabled:
        process.env.DEMO_FALLBACK_ENABLED !== undefined
          ? process.env.DEMO_FALLBACK_ENABLED === 'true'
          : fileConfig.server?.demoFallbackEnabled ?? DEFAULT_CONFIG.server.demoFallbackEnabled,
      pollIntervalMs:
        Number(process.env.POLL_INTERVAL_MS) || fileConfig.server?.pollIntervalMs || DEFAULT_CONFIG.server.pollIntervalMs,
    },
    prometheus: {
      ...DEFAULT_CONFIG.prometheus,
      ...(fileConfig.prometheus || {}),
      enabled:
        process.env.PROMETHEUS_ENABLED !== undefined
          ? process.env.PROMETHEUS_ENABLED === 'true'
          : fileConfig.prometheus?.enabled ?? DEFAULT_CONFIG.prometheus.enabled,
      endpoint: process.env.PROMETHEUS_ENDPOINT || fileConfig.prometheus?.endpoint || DEFAULT_CONFIG.prometheus.endpoint,
      username: process.env.PROMETHEUS_USERNAME || fileConfig.prometheus?.username || '',
      password: process.env.PROMETHEUS_PASSWORD || fileConfig.prometheus?.password || '',
      token: process.env.PROMETHEUS_BEARER_TOKEN || fileConfig.prometheus?.token || '',
      timeoutMs:
        Number(process.env.PROMETHEUS_TIMEOUT_MS) || fileConfig.prometheus?.timeoutMs || DEFAULT_CONFIG.prometheus.timeoutMs,
    },
    mikrotik: {
      ...DEFAULT_CONFIG.mikrotik,
      ...(fileConfig.mikrotik || {}),
      enabled:
        process.env.MIKROTIK_ENABLED !== undefined
          ? process.env.MIKROTIK_ENABLED === 'true'
          : fileConfig.mikrotik?.enabled ?? DEFAULT_CONFIG.mikrotik.enabled,
      host: process.env.MIKROTIK_HOST || fileConfig.mikrotik?.host || DEFAULT_CONFIG.mikrotik.host,
      port: Number(process.env.MIKROTIK_PORT) || fileConfig.mikrotik?.port || DEFAULT_CONFIG.mikrotik.port,
      protocol: (process.env.MIKROTIK_PROTOCOL as 'rest' | 'web') || fileConfig.mikrotik?.protocol || 'rest',
      username: process.env.MIKROTIK_USERNAME || fileConfig.mikrotik?.username || DEFAULT_CONFIG.mikrotik.username,
      password: process.env.MIKROTIK_PASSWORD || fileConfig.mikrotik?.password || '',
      insecureTls:
        process.env.MIKROTIK_INSECURE_TLS !== undefined
          ? process.env.MIKROTIK_INSECURE_TLS === 'true'
          : fileConfig.mikrotik?.insecureTls ?? DEFAULT_CONFIG.mikrotik.insecureTls,
      timeoutMs:
        Number(process.env.MIKROTIK_TIMEOUT_MS) || fileConfig.mikrotik?.timeoutMs || DEFAULT_CONFIG.mikrotik.timeoutMs,
    },
    crowdsec: {
      ...DEFAULT_CONFIG.crowdsec,
      ...(fileConfig.crowdsec || {}),
      enabled:
        process.env.CROWDSEC_ENABLED !== undefined
          ? process.env.CROWDSEC_ENABLED === 'true'
          : fileConfig.crowdsec?.enabled ?? DEFAULT_CONFIG.crowdsec.enabled,
      exporterEndpoint:
        process.env.CROWDSEC_EXPORTER_ENDPOINT ||
        fileConfig.crowdsec?.exporterEndpoint ||
        DEFAULT_CONFIG.crowdsec.exporterEndpoint,
      lapiEndpoint:
        process.env.CROWDSEC_LAPI_ENDPOINT || fileConfig.crowdsec?.lapiEndpoint || DEFAULT_CONFIG.crowdsec.lapiEndpoint,
      apiKey: process.env.CROWDSEC_API_KEY || fileConfig.crowdsec?.apiKey || '',
      machineId: process.env.CROWDSEC_MACHINE_ID || fileConfig.crowdsec?.machineId || DEFAULT_CONFIG.crowdsec.machineId,
      timeoutMs:
        Number(process.env.CROWDSEC_TIMEOUT_MS) || fileConfig.crowdsec?.timeoutMs || DEFAULT_CONFIG.crowdsec.timeoutMs,
    },
    uptimeKuma: {
      ...DEFAULT_CONFIG.uptimeKuma,
      ...(fileConfig.uptimeKuma || {}),
      enabled:
        process.env.UPTIME_KUMA_ENABLED !== undefined
          ? process.env.UPTIME_KUMA_ENABLED === 'true'
          : fileConfig.uptimeKuma?.enabled ?? DEFAULT_CONFIG.uptimeKuma.enabled,
      endpoint: process.env.UPTIME_KUMA_ENDPOINT || fileConfig.uptimeKuma?.endpoint || DEFAULT_CONFIG.uptimeKuma.endpoint,
      apiKey: process.env.UPTIME_KUMA_API_KEY || fileConfig.uptimeKuma?.apiKey || '',
      slug: process.env.UPTIME_KUMA_SLUG || fileConfig.uptimeKuma?.slug || DEFAULT_CONFIG.uptimeKuma.slug,
      metricsEndpoint:
        process.env.UPTIME_KUMA_METRICS_ENDPOINT ||
        fileConfig.uptimeKuma?.metricsEndpoint ||
        DEFAULT_CONFIG.uptimeKuma.metricsEndpoint,
      timeoutMs:
        Number(process.env.UPTIME_KUMA_TIMEOUT_MS) ||
        fileConfig.uptimeKuma?.timeoutMs ||
        DEFAULT_CONFIG.uptimeKuma.timeoutMs,
    },
    proxmox: {
      ...DEFAULT_CONFIG.proxmox,
      ...(fileConfig.proxmox || {}),
      enabled:
        process.env.PROXMOX_ENABLED !== undefined
          ? process.env.PROXMOX_ENABLED === 'true'
          : fileConfig.proxmox?.enabled ?? DEFAULT_CONFIG.proxmox.enabled,
      exporterEndpoint:
        process.env.PROXMOX_EXPORTER_ENDPOINT ||
        fileConfig.proxmox?.exporterEndpoint ||
        DEFAULT_CONFIG.proxmox.exporterEndpoint,
      apiEndpoint: process.env.PROXMOX_API_ENDPOINT || fileConfig.proxmox?.apiEndpoint || DEFAULT_CONFIG.proxmox.apiEndpoint,
      tokenId: process.env.PROXMOX_TOKEN_ID || fileConfig.proxmox?.tokenId || DEFAULT_CONFIG.proxmox.tokenId,
      tokenSecret: process.env.PROXMOX_TOKEN_SECRET || fileConfig.proxmox?.tokenSecret || '',
      verifySsl:
        process.env.PROXMOX_VERIFY_SSL !== undefined
          ? process.env.PROXMOX_VERIFY_SSL === 'true'
          : fileConfig.proxmox?.verifySsl ?? DEFAULT_CONFIG.proxmox.verifySsl,
      clusterName:
        process.env.PROXMOX_CLUSTER_NAME || fileConfig.proxmox?.clusterName || DEFAULT_CONFIG.proxmox.clusterName,
      timeoutMs:
        Number(process.env.PROXMOX_TIMEOUT_MS) || fileConfig.proxmox?.timeoutMs || DEFAULT_CONFIG.proxmox.timeoutMs,
    },
    storage: {
      ...DEFAULT_CONFIG.storage,
      ...(fileConfig.storage || {}),
      sqlitePath: process.env.SQLITE_PATH || fileConfig.storage?.sqlitePath || DEFAULT_CONFIG.storage.sqlitePath,
      retainDays: Number(process.env.DATA_RETAIN_DAYS) || fileConfig.storage?.retainDays || DEFAULT_CONFIG.storage.retainDays,
    },
    dataSources:
      fileConfig.dataSources && Array.isArray(fileConfig.dataSources) && fileConfig.dataSources.length > 0
        ? fileConfig.dataSources
        : DEFAULT_DATA_SOURCES,
  };

  return merged;
}

export function getConfig(): ServerConfig {
  return activeConfig;
}

export function updateConfig(newConfig: Partial<ServerConfig>): ServerConfig {
  activeConfig = {
    ...activeConfig,
    ...newConfig,
    server: { ...activeConfig.server, ...(newConfig.server || {}) },
    prometheus: { ...activeConfig.prometheus, ...(newConfig.prometheus || {}) },
    mikrotik: { ...activeConfig.mikrotik, ...(newConfig.mikrotik || {}) },
    crowdsec: { ...activeConfig.crowdsec, ...(newConfig.crowdsec || {}) },
    uptimeKuma: { ...activeConfig.uptimeKuma, ...(newConfig.uptimeKuma || {}) },
    proxmox: { ...activeConfig.proxmox, ...(newConfig.proxmox || {}) },
    storage: { ...activeConfig.storage, ...(newConfig.storage || {}) },
    dataSources: newConfig.dataSources !== undefined ? newConfig.dataSources : activeConfig.dataSources || DEFAULT_DATA_SOURCES,
  };

  // Persist to config.json
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(activeConfig, null, 2), 'utf-8');
    console.log('[Config] Updated configuration and saved to config.json');
  } catch (err) {
    console.error('[Config] Failed to save config.json:', err);
  }

  return activeConfig;
}

// ==========================================
// Data Sources CRUD Operations
// ==========================================

export function getDataSources(): CustomDataSource[] {
  return activeConfig.dataSources || DEFAULT_DATA_SOURCES;
}

export function getDataSourceById(id: string): CustomDataSource | undefined {
  return (activeConfig.dataSources || DEFAULT_DATA_SOURCES).find((ds) => ds.id === id);
}

export function addDataSource(data: Omit<CustomDataSource, 'id' | 'createdAt'>): CustomDataSource {
  const id = 'ds-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  const newSource: CustomDataSource = {
    ...data,
    id,
    createdAt: Date.now(),
    lastStatus: 'untested',
    lastLatencyMs: undefined,
    lastError: null,
  };
  const list = [...(activeConfig.dataSources || DEFAULT_DATA_SOURCES), newSource];
  updateConfig({ dataSources: list });
  return newSource;
}

export function updateDataSource(id: string, updates: Partial<CustomDataSource>): CustomDataSource {
  const current = activeConfig.dataSources || DEFAULT_DATA_SOURCES;
  const index = current.findIndex((ds) => ds.id === id);
  if (index === -1) {
    throw new Error(`Data source with id '${id}' not found`);
  }
  const updatedItem: CustomDataSource = {
    ...current[index],
    ...updates,
  };
  const newList = [...current];
  newList[index] = updatedItem;
  updateConfig({ dataSources: newList });
  return updatedItem;
}

export function deleteDataSource(id: string): boolean {
  const current = activeConfig.dataSources || DEFAULT_DATA_SOURCES;
  const initialLen = current.length;
  const filtered = current.filter((ds) => ds.id !== id);
  if (filtered.length === initialLen) {
    return false;
  }
  updateConfig({ dataSources: filtered });
  return true;
}
