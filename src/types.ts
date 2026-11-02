export type NodeCategory = 'mikrotik' | 'ruijie' | 'server' | 'vm' | 'waf' | 'website';

export type SystemStatus = 'online' | 'warning' | 'critical' | 'offline';

export interface NodeMetric {
  id: string;
  name: string;
  category: NodeCategory;
  ip: string;
  location?: string;
  status: SystemStatus;
  uptime: string;
  lastUpdated: string;
  cpuUsage: number; // percentage
  ramUsage: number; // percentage
  diskUsage: number; // percentage
  temperature?: number; // Celsius
  latencyMs: number;
  
  // Specific fields
  rxSpeedMbps?: number; // Traffic In
  txSpeedMbps?: number; // Traffic Out
  activeConnections?: number;
  
  // MikroTik
  routerOSVersion?: string;
  activeDhcpLeases?: number;
  snmpStatus?: 'connected' | 'error' | 'disabled';

  // Ruijie Gateway & Reyee Cloud
  ruijieModel?: string;
  rgosVersion?: string;
  multiWanStatus?: 'balanced' | 'failover' | 'single';
  managedApsCount?: number;
  managedSwitchesCount?: number;
  poePowerUsageWatts?: number;
  poeMaxBudgetWatts?: number;
  jitterMs?: number;
  
  // Server / VM
  osName?: string;
  vmHost?: string;
  servicesRunning?: { name: string; status: 'active' | 'failed' | 'stopped'; cpu: number; ram: string }[];
  
  // WAF
  blockedRequestsTotal?: number;
  attacksToday?: { sqli: number; xss: number; rateLimit: number; botnet: number };
  httpStatusDist?: { '2xx': number; '3xx': number; '4xx': number; '5xx': number };
  topBlockedIps?: { ip: string; country: string; reason: string; count: number }[];
  
  // Website
  sslDaysRemaining?: number;
  sslIssuer?: string;
  httpStatusCode?: number;
  dnsLookupMs?: number;
}

export interface MetricTimeSeriesPoint {
  time: string;
  cpu: number;
  ram: number;
  bandwidthIn: number; // Mbps
  bandwidthOut: number; // Mbps
  latency: number; // ms
  wafBlocked: number;
}

export interface SystemAlert {
  id: string;
  nodeId: string;
  nodeName: string;
  category: NodeCategory;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  sentViaTelegram: boolean;
  sentViaEmail: boolean;
}

export interface InfluxAuditLog {
  id: string;
  timestamp: string;
  measurement: 'syslog' | 'auth_event' | 'waf_event' | 'snmp_trap' | 'backup_event';
  sourceIp: string;
  user: string;
  action: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'CRITICAL';
  details: string;
  nodeName: string;
}

export interface BackupSnapshot {
  id: string;
  title: string;
  targetType: 'MikroTik RSC' | 'Ubuntu Config' | 'InfluxDB Dump' | 'Nginx WAF Rules' | 'Full System Bundle';
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  status: 'completed' | 'in_progress' | 'failed';
  downloadUrl: string;
  checksum: string;
}

export interface NotificationConfig {
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  recipientEmail: string;
  notifyOnWarning: boolean;
  notifyOnCritical: boolean;
  autoReportDaily: boolean;
}

export interface PredictiveAnalysisResult {
  nodeId: string;
  nodeName: string;
  domainCategory?: 'server' | 'network' | 'waf' | 'ssl';
  riskScore: number; // 0 - 100
  predictedExhaustionDays: number | null; // e.g. 14 days left for disk
  predictedFailureType: string;
  confidence: number; // 0 - 100%
  recommendedAction: string;
  anomalySummary: string;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  historicalTrendPoints?: { time: string; actual: number; predicted: number }[];
}

export interface UserSecurityState {
  is2FAEnabled: boolean;
  totpSecret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  lastLogin: string;
  userRole: 'Administrator' | 'Security Ops' | 'Auditor' | 'Viewer';
}

export interface PrometheusTarget {
  id: string;
  job?: string;
  jobName?: string;
  endpoint: string;
  instanceIp?: string;
  module?: 'mikrotik' | 'server' | 'waf' | 'website' | 'system' | 'custom';
  mappedModule?: 'mikrotik' | 'server' | 'waf' | 'website' | 'system' | 'custom';
  nodeName?: string;
  mappedNodeName?: string;
  state: 'UP' | 'DOWN' | 'PENDING_INSTALL';
  isPaused?: boolean;
  responseTimeMs?: number;
  labels?: Record<string, string>;
  lastScrape?: string;
  lastScrapeTime?: string;
  scrapeDuration?: string;
  scrapeInterval?: string;
  healthReason?: string;
  selectedMetrics?: string[];
  exporterType?: string;
  installedOnTarget?: boolean;
}

export interface RuijieWanInterface {
  name: string;
  type: 'WAN' | 'LAN' | 'LAN/WAN';
  ip: string;
  gateway: string;
  dns: string[];
  status: 'UP' | 'DOWN';
  speed: string;
  duplex: string;
  mac: string;
  rxBytes: number;
  txBytes: number;
  rxSpeedMbps: number;
  txSpeedMbps: number;
  packetLossPercent: number;
  latencyMs: number;
  jitterMs: number;
  ispName: string;
  isPrimary: boolean;
  weight: number;
  role?: string;
  bandwidthCapacityMbps?: number;
  utilizationPercent?: number;
  loadBalanceWeight?: number;
}

export interface RuijieReyeeDevice {
  id: string;
  name: string;
  model: string;
  type: 'AP' | 'SWITCH' | 'GATEWAY' | 'ROUTER';
  ip: string;
  mac: string;
  sn: string;
  status: 'online' | 'offline';
  firmware: string;
  uptime: string;
  poePowerUsageWatts?: number;
  poeMaxWatts?: number;
  clientCount: number;
  cpuUsage: number;
  memoryUsage: number;
  location: string;
  rf24Channel?: number;
  rf5Channel?: number;
  meshRole?: 'Master' | 'Repeater' | 'Wired';
}

export interface RuijieClient {
  id: string;
  ip: string;
  mac: string;
  hostname: string;
  deviceType: 'Phone' | 'Laptop' | 'Desktop' | 'Server' | 'IoT' | 'Printer';
  vendor: string;
  connectedDevice: string;
  connectedPortOrSsid: string;
  vlan: number;
  rxSpeedKbps: number;
  txSpeedKbps: number;
  totalDataMb: number;
  appCategory: string;
  onlineDuration: string;
  isRateLimited: boolean;
  rateLimitMbps?: number;
}

export interface RuijieAppDpiStats {
  category: string;
  name: string;
  rxMbps: number;
  txMbps: number;
  percentage: number;
  color: string;
}

export type DataSourceCategory = 
  | 'prometheus' 
  | 'mikrotik' 
  | 'ruijie' 
  | 'server_node' 
  | 'waf_crowdsec' 
  | 'website_kuma' 
  | 'custom_api';

export type DataSourceDriver = 
  | 'prometheus_promql' 
  | 'mikrotik_rest' 
  | 'mikrotik_snmp' 
  | 'ruijie_eweb' 
  | 'ruijie_snmp' 
  | 'proxmox_api' 
  | 'crowdsec_lapi' 
  | 'http_probe'
  | 'custom_json';

export interface SqliteDataSource {
  id: string;
  name: string;
  category: DataSourceCategory;
  driver: DataSourceDriver;
  endpoint_url: string;
  ip_address: string;
  port: number;
  auth_type: 'none' | 'basic' | 'bearer' | 'token' | 'snmp_community';
  auth_credentials?: {
    username?: string;
    password?: string;
    token?: string;
    snmpCommunity?: string;
    apiKey?: string;
    lapiUrl?: string;
    lapiPort?: string | number;
    [key: string]: any;
  };
  scrape_interval_sec: number;
  status: 'active' | 'inactive' | 'error';
  last_status?: 'online' | 'offline' | 'degraded' | 'unknown';
  last_latency_ms?: number;
  last_error?: string | null;
  last_checked_at?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardSourceMapping {
  dashboard_key: 'overview' | 'mikrotik' | 'ruijie' | 'servers' | 'waf' | 'websites';
  title: string;
  primary_source_id: string;
  secondary_source_id?: string;
  mode: 'prometheus' | 'direct_api' | 'snmp' | 'hybrid';
  auto_fallback: boolean;
  refresh_interval_sec: number;
  notes?: string;
  updated_at?: string;
}

export interface EnvironmentPreset {
  id: string;
  name: string;
  description: string;
  subnetPrefix: string;
  sources: Partial<SqliteDataSource>[];
}

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
    endpoint: string;
    username?: string;
    password?: string;
    token?: string;
    timeoutMs: number;
    customQueries?: { name: string; query: string; unit: string }[];
  };
  mikrotik: {
    enabled: boolean;
    host: string;
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
    exporterEndpoint: string;
    lapiEndpoint: string;
    apiKey: string;
    machineId?: string;
    timeoutMs: number;
  };
  uptimeKuma: {
    enabled: boolean;
    endpoint: string;
    apiKey?: string;
    slug?: string;
    metricsEndpoint?: string;
    timeoutMs: number;
  };
  proxmox: {
    enabled: boolean;
    exporterEndpoint: string;
    apiEndpoint?: string;
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
  isLive: boolean;
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
  value: string;
  scope: string;
  type: string;
  duration: string;
  scenario: string;
  origin: string;
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
  type: string;
  status: number; // 1 = UP, 0 = DOWN, 2 = PENDING, 3 = MAINTENANCE
  ping: number;
  uptime24h: number;
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
  healthScore: number;
}


