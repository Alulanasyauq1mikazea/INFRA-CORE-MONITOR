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
  userRole: 'Administrator' | 'Security Ops' | 'Auditor';
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

