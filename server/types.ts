export interface ServerConfig {
  server: {
    port: number;
    host: string;
    corsOrigin: string;
    demoFallbackEnabled: boolean;
    pollIntervalMs: number;
  };
  prometheus: {
    enabled: boolean;
    endpoint: string; // e.g., http://192.168.1.100:9090
    username?: string;
    password?: string;
    token?: string;
    timeoutMs: number;
    customQueries?: { name: string; query: string; unit: string }[];
  };
  mikrotik: {
    enabled: boolean;
    host: string; // e.g., https://192.168.1.1 or 192.168.1.1:8728
    port: number;
    protocol: 'rest' | 'web';
    username: string;
    password: string;
    insecureTls: boolean;
    timeoutMs: number;
    monitoredInterfaces?: string[];
  };
  crowdsec: {
    enabled: boolean;
    exporterEndpoint: string; // e.g., http://192.168.1.105:6060/metrics
    lapiEndpoint: string; // e.g., http://192.168.1.105:8080
    apiKey: string;
    machineId?: string;
    timeoutMs: number;
  };
  uptimeKuma: {
    enabled: boolean;
    endpoint: string; // e.g., http://192.168.1.110:3001
    apiKey?: string;
    slug?: string;
    metricsEndpoint?: string; // e.g. http://192.168.1.110:3001/metrics
    timeoutMs: number;
  };
  proxmox: {
    enabled: boolean;
    exporterEndpoint: string; // e.g. http://192.168.1.120:9221/pve
    apiEndpoint?: string; // e.g. https://192.168.1.120:8006
    tokenId?: string;
    tokenSecret?: string;
    verifySsl: boolean;
    clusterName: string;
    timeoutMs: number;
  };
  storage: {
    sqlitePath: string;
    retainDays: number;
    maxHistoryPoints: number;
  };
  dataSources?: CustomDataSource[];
}

export interface CustomDataSource {
  id: string;
  name: string;
  type: 'proxmox' | 'prometheus' | 'mikrotik' | 'crowdsec' | 'uptimeKuma' | 'custom_api';
  targetDashboard: 'proxmox' | 'prometheus' | 'mikrotik' | 'crowdsec' | 'uptimeKuma' | 'overview';
  endpoint: string;
  instanceIp?: string;
  moduleTarget?: 'SERVER' | 'MIKROTIK' | 'SYSTEM' | 'WEBSITE' | 'WAF' | 'DATABASE';
  authType: 'none' | 'basic' | 'bearer' | 'apiKey';
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
  enabled: boolean;
  notes?: string;
  selectedMetrics?: string[];
  lastTestedAt?: number;
  lastStatus?: 'online' | 'offline' | 'untested';
  lastLatencyMs?: number;
  lastError?: string | null;
  createdAt: number;
}

export interface CollectorStatus {
  source: 'prometheus' | 'mikrotik' | 'crowdsec' | 'uptimeKuma' | 'proxmox';
  displayName: string;
  enabled: boolean;
  isLive: boolean; // true if real endpoint responded successfully, false if demo/fallback
  lastAttempt: number;
  lastSuccess: number | null;
  lastError: string | null;
  latencyMs: number;
  itemCount: number;
  endpointUrl: string;
}

export interface PrometheusTelemetry {
  isLive: boolean;
  timestamp: number;
  nodeMetrics: {
    cpuPercent: number;
    memoryUsedBytes: number;
    memoryTotalBytes: number;
    memoryPercent: number;
    diskUsedBytes: number;
    diskTotalBytes: number;
    diskPercent: number;
    networkRxBytesPerSec: number;
    networkTxBytesPerSec: number;
    load1: number;
    load5: number;
    load15: number;
    uptimeSeconds: number;
    instanceName: string;
  };
  customMetrics?: Record<string, { value: number; unit: string; name: string }>;
  history: {
    timestamp: number;
    cpu: number;
    memory: number;
    netRx: number;
    netTx: number;
    load1: number;
  }[];
}

export interface MikroTikInterface {
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  rxPacketsPerSec: number;
  txPacketsPerSec: number;
  macAddress?: string;
  ipAddress?: string;
  comment?: string;
}

export interface MikroTikDhcpLease {
  address: string;
  macAddress: string;
  hostName: string;
  status: string;
  expiresAfter?: string;
  server?: string;
}

export interface MikroTikTelemetry {
  isLive: boolean;
  timestamp: number;
  system: {
    boardName: string;
    model: string;
    version: string;
    cpuLoad: number;
    cpuCount: number;
    cpuFrequencyMhz: number;
    freeMemoryBytes: number;
    totalMemoryBytes: number;
    freeHddBytes: number;
    totalHddBytes: number;
    uptime: string;
    voltageVolts?: number;
    temperatureCelsius?: number;
    activeConnections: number;
  };
  interfaces: MikroTikInterface[];
  dhcpLeases: MikroTikDhcpLease[];
  trafficHistory: {
    timestamp: number;
    totalRxBps: number;
    totalTxBps: number;
  }[];
}

export interface CrowdSecDecision {
  id: string | number;
  source: string;
  value: string; // e.g. "198.51.100.42"
  scope: string; // "Ip", "Range"
  type: string; // "ban", "captcha"
  duration: string; // "3h59m"
  scenario: string; // e.g. "crowdsecurity/ssh-bf"
  origin: string; // "cscli", "crowdsec"
  country?: string;
  countryCode?: string;
  createdAt: string;
}

export interface CrowdSecTelemetry {
  isLive: boolean;
  timestamp: number;
  metrics: {
    activeDecisionsCount: number;
    totalAlertsReceived: number;
    totalLapiRequests: number;
    bouncersCount: number;
    parsersHits: number;
    bucketOverflows: number;
  };
  topScenarios: { scenario: string; count: number }[];
  topCountries: { country: string; countryCode: string; count: number }[];
  activeDecisions: CrowdSecDecision[];
  recentAlerts: {
    id: string | number;
    scenario: string;
    ip: string;
    country: string;
    timestamp: string;
    capacity: number;
    eventsCount: number;
  }[];
}

export interface UptimeKumaMonitor {
  id: number;
  name: string;
  url: string;
  type: string; // "http", "ping", "port", "dns"
  status: number; // 1 = UP, 0 = DOWN, 2 = PENDING, 3 = MAINTENANCE
  ping: number; // ms
  uptime24h: number; // percentage e.g. 99.98
  uptime30d: number;
  lastHeartbeat: string;
  certExpiryDays?: number | null;
  tags?: string[];
  msg?: string;
}

export interface UptimeKumaTelemetry {
  isLive: boolean;
  timestamp: number;
  overallUptimePercent: number;
  upCount: number;
  downCount: number;
  pendingCount: number;
  maintenanceCount: number;
  monitors: UptimeKumaMonitor[];
  incidentLog: {
    id: string | number;
    monitorName: string;
    status: number;
    msg: string;
    timestamp: string;
  }[];
  latencyHistory: {
    timestamp: number;
    avgLatency: number;
  }[];
}

export interface ProxmoxVm {
  vmid: number;
  name: string;
  type: 'qemu' | 'lxc';
  node: string;
  status: 'running' | 'stopped' | 'paused';
  cpuPercent: number;
  maxCpu: number;
  memBytes: number;
  maxMemBytes: number;
  diskBytes: number;
  maxDiskBytes: number;
  netInBytes: number;
  netOutBytes: number;
  uptimeSeconds: number;
  tags?: string;
  onboot?: boolean;
  notBackedUp?: boolean;
  diskReadBytes?: number;
  diskWriteBytes?: number;
}

export interface ProxmoxStorage {
  id: string;
  storage: string;
  node: string;
  plugintype: string;
  content: string;
  sizeBytes: number;
  usageBytes: number;
  shared: boolean;
  status: 'online' | 'offline';
}

export interface ProxmoxNode {
  name: string;
  status: 'online' | 'offline';
  cpuPercent: number;
  cpuCores: number;
  memBytes: number;
  maxMemBytes: number;
  diskBytes: number;
  maxDiskBytes: number;
  uptimeSeconds: number;
  loadAverage: [number, number, number];
  release?: string;
  version?: string;
  unbackedUpTotal?: number;
}

export interface ProxmoxTelemetry {
  isLive: boolean;
  timestamp: number;
  cluster: {
    name: string;
    quorate: boolean;
    nodesCount: number;
    nodesOnline: number;
    vmsRunning: number;
    vmsTotal: number;
    lxcsRunning: number;
    lxcsTotal: number;
    totalCpuPercent: number;
    totalMemPercent: number;
    totalDiskPercent: number;
  };
  nodes: ProxmoxNode[];
  vms: ProxmoxVm[];
  storages?: ProxmoxStorage[];
  rawExporterMetrics?: string;
  metricDefinitions?: { metric: string; help: string; type: string; count: number }[];
}

export interface AlertItem {
  id: string;
  source: 'prometheus' | 'mikrotik' | 'crowdsec' | 'uptimeKuma' | 'proxmox' | 'system';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface FullTelemetrySnapshot {
  timestamp: number;
  collectors: Record<string, CollectorStatus>;
  prometheus: PrometheusTelemetry;
  mikrotik: MikroTikTelemetry;
  crowdsec: CrowdSecTelemetry;
  uptimeKuma: UptimeKumaTelemetry;
  proxmox: ProxmoxTelemetry;
  activeAlerts: AlertItem[];
  healthScore: number; // 0 - 100
}
