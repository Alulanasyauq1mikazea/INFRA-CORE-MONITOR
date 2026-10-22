import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { SqliteDataSource, DashboardSourceMapping, EnvironmentPreset, PrometheusTarget } from '../types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'netwatch.db');

// Authentic default 12 Prometheus Jobs from University Infrastructure (Prometheus 192.168.77.30:9090)
export const DEFAULT_PROMETHEUS_CAMPUS_TARGETS: PrometheusTarget[] = [
  {
    id: 'tgt-mikrotik-gw',
    job: 'mikrotik',
    jobName: 'mikrotik',
    endpoint: 'http://192.168.77.30:9117/snmp?module=mikrotik&target=192.168.77.1',
    instanceIp: '192.168.77.1',
    module: 'mikrotik',
    mappedModule: 'mikrotik',
    nodeName: 'MikroTik CCR1036-12G-4S Core Gateway',
    mappedNodeName: 'MikroTik Gateway',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 2,
    scrapeInterval: '15s',
    scrapeDuration: '0.42s',
    exporterType: 'SNMP Exporter (MikroTik RouterOS MIB)',
    installedOnTarget: true,
    labels: {
      job: 'mikrotik',
      instance: '192.168.77.1',
      device_role: 'core_router',
      campus_zone: 'DataCenter_Unmus',
    },
    selectedMetrics: [
      'mtxrInterfaceStatsDriverRxBytes',
      'mtxrInterfaceStatsDriverTxBytes',
      'mtxrGaugeValue{mtxrGaugeName="cpu-temperature"}',
      'ifHCInOctets',
      'ifHCOutOctets',
    ],
  },
  {
    id: 'tgt-crowdsec-waf',
    job: 'crowdsec',
    jobName: 'crowdsec',
    endpoint: 'http://192.168.77.77:6060/metrics',
    instanceIp: '192.168.77.77',
    module: 'waf',
    mappedModule: 'waf',
    nodeName: 'CrowdSec LAPI Security & Threat Bouncer',
    mappedNodeName: 'WAF CrowdSec',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 3,
    scrapeInterval: '15s',
    scrapeDuration: '0.18s',
    exporterType: 'CrowdSec Prometheus Metrics Exporter',
    installedOnTarget: true,
    labels: {
      job: 'crowdsec',
      instance: '192.168.77.77:6060',
      security_layer: 'lapi_bouncer',
    },
    selectedMetrics: [
      'cs_active_decisions',
      'cs_alerts_total',
      'cs_lapi_requests_total',
      'cs_parser_processed_total',
    ],
  },
  {
    id: 'tgt-node-host',
    job: 'node',
    jobName: 'node',
    endpoint: 'http://192.168.77.30:9100/metrics',
    instanceIp: '192.168.77.30',
    module: 'server',
    mappedModule: 'server',
    nodeName: 'Ubuntu 24.04 Monitoring Server (Master Host)',
    mappedNodeName: 'Master Host 192.168.77.30',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 1,
    scrapeInterval: '10s',
    scrapeDuration: '0.08s',
    exporterType: 'Node Exporter v1.7.0',
    installedOnTarget: true,
    labels: {
      job: 'node',
      instance: '192.168.77.30:9100',
      os: 'linux',
      kernel: '6.8.0-ubuntu',
    },
    selectedMetrics: [
      'node_cpu_seconds_total',
      'node_memory_MemAvailable_bytes',
      'node_filesystem_free_bytes',
      'node_network_receive_bytes_total',
    ],
  },
  {
    id: 'tgt-node-exporter',
    job: 'node_exporter',
    jobName: 'node_exporter',
    endpoint: 'http://192.168.77.30:9100/metrics',
    instanceIp: '192.168.77.30',
    module: 'server',
    mappedModule: 'server',
    nodeName: 'Node Exporter Telemetry Service',
    mappedNodeName: 'Telemetry Daemon',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 1,
    scrapeInterval: '15s',
    scrapeDuration: '0.05s',
    exporterType: 'Node Exporter',
    installedOnTarget: true,
    labels: {
      job: 'node_exporter',
      instance: '192.168.77.30:9100',
    },
    selectedMetrics: [
      'node_load1',
      'node_load5',
      'node_load15',
      'node_disk_io_time_seconds_total',
    ],
  },
  {
    id: 'tgt-pve-dekanat',
    job: 'proxmox_Dekanat',
    jobName: 'proxmox_Dekanat',
    endpoint: 'https://192.168.77.29:8006/pve2/api2/json',
    instanceIp: '192.168.77.29',
    module: 'server',
    mappedModule: 'server',
    nodeName: 'Proxmox VE Cluster - Dekanat & OJS Web',
    mappedNodeName: 'PVE Dekanat',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 4,
    scrapeInterval: '30s',
    scrapeDuration: '0.35s',
    exporterType: 'Proxmox VE Exporter (pve-exporter)',
    installedOnTarget: true,
    labels: {
      job: 'proxmox_Dekanat',
      instance: '192.168.77.29:8006',
      cluster: 'pve_unmus',
      faculty: 'Dekanat',
    },
    selectedMetrics: [
      'pve_node_cpu_usage_ratio',
      'pve_node_memory_used_bytes',
      'pve_guest_status',
      'pve_storage_used_bytes',
    ],
  },
  {
    id: 'tgt-pve-simlitabmas',
    job: 'proxmox_Simlitabmas',
    jobName: 'proxmox_Simlitabmas',
    endpoint: 'https://192.168.77.99:8006/pve2/api2/json',
    instanceIp: '192.168.77.99',
    module: 'server',
    mappedModule: 'server',
    nodeName: 'Proxmox VE - LPPM Simlitabmas Server',
    mappedNodeName: 'PVE Simlitabmas',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 3,
    scrapeInterval: '30s',
    scrapeDuration: '0.29s',
    exporterType: 'Proxmox VE Exporter',
    installedOnTarget: true,
    labels: {
      job: 'proxmox_Simlitabmas',
      instance: '192.168.77.99:8006',
      cluster: 'pve_unmus',
      role: 'research_portal',
    },
    selectedMetrics: [
      'pve_node_cpu_usage_ratio',
      'pve_node_memory_used_bytes',
      'pve_guest_running_count',
    ],
  },
  {
    id: 'tgt-pve-teknik',
    job: 'proxmox_Teknik',
    jobName: 'proxmox_Teknik',
    endpoint: 'https://192.168.77.242:8006/pve2/api2/json',
    instanceIp: '192.168.77.242',
    module: 'server',
    mappedModule: 'server',
    nodeName: 'Proxmox VE - Fakultas Teknik Portal',
    mappedNodeName: 'PVE FT Teknik',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 5,
    scrapeInterval: '30s',
    scrapeDuration: '0.31s',
    exporterType: 'Proxmox VE Exporter',
    installedOnTarget: true,
    labels: {
      job: 'proxmox_Teknik',
      instance: '192.168.77.242:8006',
      faculty: 'Fakultas_Teknik',
    },
    selectedMetrics: [
      'pve_node_cpu_usage_ratio',
      'pve_node_memory_used_bytes',
      'pve_storage_free_bytes',
    ],
  },
  {
    id: 'tgt-pve-lab-ti',
    job: 'proxmox_lab-TI',
    jobName: 'proxmox_lab-TI',
    endpoint: 'https://192.168.14.222:8006/pve2/api2/json',
    instanceIp: '192.168.14.222',
    module: 'server',
    mappedModule: 'server',
    nodeName: 'Proxmox VE - Lab Komputer & Informatika Core',
    mappedNodeName: 'PVE Lab-TI Core',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 2,
    scrapeInterval: '30s',
    scrapeDuration: '0.24s',
    exporterType: 'Proxmox VE Exporter',
    installedOnTarget: true,
    labels: {
      job: 'proxmox_lab-TI',
      instance: '192.168.14.222:8006',
      department: 'Informatika',
      lab_id: 'LAB_TI_01',
    },
    selectedMetrics: [
      'pve_node_cpu_usage_ratio',
      'pve_node_memory_used_bytes',
      'pve_guest_network_receive_bytes_total',
    ],
  },
  {
    id: 'tgt-blackbox-http',
    job: 'blackbox-http',
    jobName: 'blackbox-http',
    endpoint: 'http://192.168.77.30:9115/probe?module=http_2xx&target=https://unmus.ac.id',
    instanceIp: '192.168.77.30',
    module: 'website',
    mappedModule: 'website',
    nodeName: 'Blackbox Exporter - Campus Web Endpoints Prober',
    mappedNodeName: 'Blackbox HTTP',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 4,
    scrapeInterval: '30s',
    scrapeDuration: '0.52s',
    exporterType: 'Blackbox Exporter v0.24.0',
    installedOnTarget: true,
    labels: {
      job: 'blackbox-http',
      instance: 'https://unmus.ac.id',
      probe_module: 'http_2xx',
    },
    selectedMetrics: [
      'probe_success',
      'probe_duration_seconds',
      'probe_http_status_code',
      'probe_ssl_earliest_cert_expiry',
    ],
  },
  {
    id: 'tgt-nginx-proxy',
    job: 'nginx-reverse-proxy',
    jobName: 'nginx-reverse-proxy',
    endpoint: 'http://192.168.77.188:9113/metrics',
    instanceIp: '192.168.77.188',
    module: 'waf',
    mappedModule: 'waf',
    nodeName: 'Nginx Reverse Proxy & ModSecurity WAF Exporter',
    mappedNodeName: 'Nginx Reverse Proxy',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 2,
    scrapeInterval: '15s',
    scrapeDuration: '0.12s',
    exporterType: 'Nginx Prometheus Exporter',
    installedOnTarget: true,
    labels: {
      job: 'nginx-reverse-proxy',
      instance: '192.168.77.188:9113',
      server_type: 'reverse_proxy',
    },
    selectedMetrics: [
      'nginx_up',
      'nginx_connections_active',
      'nginx_connections_accepted',
      'nginx_http_requests_total',
    ],
  },
  {
    id: 'tgt-uptime-kuma',
    job: 'uptime-kuma',
    jobName: 'uptime-kuma',
    endpoint: 'http://192.168.77.32:3001/metrics',
    instanceIp: '192.168.77.32:3001',
    module: 'website',
    mappedModule: 'website',
    nodeName: 'Uptime Kuma Multi-Website Synthetic Monitor (Remote 192.168.77.32)',
    mappedNodeName: 'Uptime Kuma (.32)',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 3,
    scrapeInterval: '15s',
    scrapeDuration: '0.08s',
    exporterType: 'Uptime Kuma Built-in Prometheus Metrics',
    installedOnTarget: true,
    labels: {
      job: 'uptime-kuma',
      instance: '192.168.77.32:3001',
      total_monitors: '42',
    },
    selectedMetrics: [
      'monitor_status',
      'monitor_response_time',
      'monitor_cert_days_remaining',
      'monitor_cert_is_valid',
    ],
  },
  {
    id: 'tgt-uptime-kuma-local',
    job: 'uptime-kuma-local',
    jobName: 'uptime-kuma-local',
    endpoint: 'http://192.168.77.30:3001/metrics',
    instanceIp: '192.168.77.30:3001',
    module: 'website',
    mappedModule: 'website',
    nodeName: 'Uptime Kuma Local Ingress Host (Master 192.168.77.30)',
    mappedNodeName: 'Uptime Kuma Local (.30)',
    state: 'UP',
    isPaused: false,
    responseTimeMs: 1,
    scrapeInterval: '15s',
    scrapeDuration: '0.08s',
    exporterType: 'Uptime Kuma Internal Engine',
    installedOnTarget: true,
    labels: {
      job: 'uptime-kuma-local',
      instance: '192.168.77.30:3001',
      total_monitors: '42',
    },
    selectedMetrics: [
      'monitor_status',
      'monitor_response_time',
      'monitor_cert_days_remaining',
      'monitor_cert_is_valid',
    ],
  },
];

export const PRESET_PROFILES: Record<string, EnvironmentPreset> = {
  campus_unmus: {
    id: 'campus_unmus',
    name: 'Kampus Utama Merauke (192.168.77.x & 14.x)',
    description: 'Konfigurasi jaringan default kampus dengan Gateway CCR1036 dan Master Prometheus.',
    subnetPrefix: '192.168.77',
    sources: [
      { id: 'ds-prom-main', endpoint_url: 'http://192.168.77.30:9090', ip_address: '192.168.77.30', port: 9090 },
      { id: 'ds-mikrotik-gw', endpoint_url: 'http://192.168.77.1/rest', ip_address: '192.168.77.1', port: 80 },
      { id: 'ds-mikrotik-snmp', endpoint_url: 'http://192.168.77.30:9117/snmp?module=mikrotik&target=192.168.77.1', ip_address: '192.168.77.30', port: 9117 },
      { id: 'ds-ruijie-gw', endpoint_url: 'http://192.168.110.1:80', ip_address: '192.168.110.1', port: 80 },
      { id: 'ds-pve-cluster', endpoint_url: 'https://192.168.77.30:8006/pve2/api2/json', ip_address: '192.168.77.30', port: 8006 },
      { id: 'ds-waf-crowdsec', endpoint_url: 'http://192.168.77.77:6060/metrics', ip_address: '192.168.77.77', port: 6060 },
      { id: 'ds-kuma-websites', endpoint_url: 'http://192.168.77.30:3001/metrics', ip_address: '192.168.77.30', port: 3001 },
    ]
  },
  office_standard: {
    id: 'office_standard',
    name: 'Standar Kantor / Branch (192.168.1.x)',
    description: 'Preset untuk jaringan kantor cabang atau enterprise subnet 192.168.1.0/24.',
    subnetPrefix: '192.168.1',
    sources: [
      { id: 'ds-prom-main', endpoint_url: 'http://192.168.1.10:9090', ip_address: '192.168.1.10', port: 9090 },
      { id: 'ds-mikrotik-gw', endpoint_url: 'http://192.168.1.1/rest', ip_address: '192.168.1.1', port: 80 },
      { id: 'ds-mikrotik-snmp', endpoint_url: 'http://192.168.1.10:9117/snmp?module=mikrotik&target=192.168.1.1', ip_address: '192.168.1.10', port: 9117 },
      { id: 'ds-ruijie-gw', endpoint_url: 'http://192.168.1.254:80', ip_address: '192.168.1.254', port: 80 },
      { id: 'ds-pve-cluster', endpoint_url: 'https://192.168.1.20:8006/pve2/api2/json', ip_address: '192.168.1.20', port: 8006 },
      { id: 'ds-waf-crowdsec', endpoint_url: 'http://192.168.1.30:6060/metrics', ip_address: '192.168.1.30', port: 6060 },
      { id: 'ds-kuma-websites', endpoint_url: 'http://192.168.1.10:3001/metrics', ip_address: '192.168.1.10', port: 3001 },
    ]
  },
  datacenter_10: {
    id: 'datacenter_10',
    name: 'Data Center Private LAN (10.10.x.x)',
    description: 'Preset untuk arsitektur server farm / Data Center subnet 10.10.0.0/16.',
    subnetPrefix: '10.10.0',
    sources: [
      { id: 'ds-prom-main', endpoint_url: 'http://10.10.0.10:9090', ip_address: '10.10.0.10', port: 9090 },
      { id: 'ds-mikrotik-gw', endpoint_url: 'http://10.10.0.1/rest', ip_address: '10.10.0.1', port: 80 },
      { id: 'ds-mikrotik-snmp', endpoint_url: 'http://10.10.0.10:9117/snmp?module=mikrotik&target=10.10.0.1', ip_address: '10.10.0.10', port: 9117 },
      { id: 'ds-ruijie-gw', endpoint_url: 'http://10.10.10.1:80', ip_address: '10.10.10.1', port: 80 },
      { id: 'ds-pve-cluster', endpoint_url: 'https://10.10.0.50:8006/pve2/api2/json', ip_address: '10.10.0.50', port: 8006 },
      { id: 'ds-waf-crowdsec', endpoint_url: 'http://10.10.0.80:6060/metrics', ip_address: '10.10.0.80', port: 6060 },
      { id: 'ds-kuma-websites', endpoint_url: 'http://10.10.0.10:3001/metrics', ip_address: '10.10.0.10', port: 3001 },
    ]
  }
};

class SqliteDatabaseManager {
  private db: DatabaseSync;

  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    this.db = new DatabaseSync(DB_FILE);
    this.initializeSchema();
    this.seedInitialDataIfEmpty();
    this.seedTargetsIfEmpty();
    this.ensureProxmoxNodesInDataSources();
    this.ensureCrowdsecDefaultConfig();
  }

  private ensureCrowdsecDefaultConfig() {
    try {
      const row = this.db.prepare("SELECT auth_credentials FROM data_sources WHERE id = 'ds-waf-crowdsec'").get() as any;
      let creds: any = {};
      try {
        creds = row?.auth_credentials ? JSON.parse(row.auth_credentials) : {};
      } catch {}

      const defaultKey = process.env.CROWDSEC_API_KEY || 'mGV7hVEc1YeRDfwFSN2vB6QeiAj76w+BrTDO8pfmrKA';
      const defaultLapiPort = process.env.CROWDSEC_LAPI_PORT || '8181';
      const defaultLapiUrl = process.env.CROWDSEC_LAPI_URL || `http://192.168.77.77:${defaultLapiPort}`;

      if (!creds.apiKey || creds.lapiPort !== defaultLapiPort) {
        creds.apiKey = creds.apiKey || defaultKey;
        creds.lapiPort = creds.lapiPort || defaultLapiPort;
        creds.lapiUrl = creds.lapiUrl || defaultLapiUrl;

        this.db.prepare(`
          UPDATE data_sources 
          SET auth_credentials = ?, auth_type = 'bearer', updated_at = ?
          WHERE id = 'ds-waf-crowdsec'
        `).run(JSON.stringify(creds), new Date().toISOString());
      }
    } catch {}
  }

  private initializeSchema() {
    // 1. System Settings Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        updated_at TEXT NOT NULL
      );
    `);

    // 2. Data Sources Master Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        driver TEXT NOT NULL,
        endpoint_url TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        port INTEGER NOT NULL,
        auth_type TEXT DEFAULT 'none',
        auth_credentials TEXT,
        scrape_interval_sec INTEGER DEFAULT 15,
        status TEXT DEFAULT 'active',
        last_status TEXT DEFAULT 'unknown',
        last_latency_ms INTEGER DEFAULT 0,
        last_error TEXT,
        last_checked_at TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 3. Dashboard Mappings Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dashboard_mappings (
        dashboard_key TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        primary_source_id TEXT NOT NULL,
        secondary_source_id TEXT,
        mode TEXT DEFAULT 'hybrid',
        auto_fallback INTEGER DEFAULT 1,
        refresh_interval_sec INTEGER DEFAULT 10,
        notes TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    // 4. Monitored Nodes / Devices Catalog Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monitored_nodes (
        id TEXT PRIMARY KEY,
        data_source_id TEXT,
        name TEXT NOT NULL,
        node_type TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        port INTEGER,
        is_active INTEGER DEFAULT 1,
        status TEXT DEFAULT 'online',
        labels TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 5. Audit Logs Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        operator TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);

    // 6. Prometheus Monitored Targets Table (Migrated into SQLite 3)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prometheus_targets (
        id TEXT PRIMARY KEY,
        job TEXT NOT NULL,
        job_name TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        instance_ip TEXT,
        module TEXT,
        mapped_module TEXT,
        node_name TEXT,
        mapped_node_name TEXT,
        state TEXT DEFAULT 'UP',
        is_paused INTEGER DEFAULT 0,
        response_time_ms INTEGER DEFAULT 0,
        scrape_interval TEXT DEFAULT '15s',
        scrape_duration TEXT,
        exporter_type TEXT,
        installed_on_target INTEGER DEFAULT 1,
        labels TEXT,
        selected_metrics TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  private seedInitialDataIfEmpty() {
    // Check if data_sources is empty
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM data_sources').get() as { count: number };
    if (countRow && countRow.count > 0) {
      return; // Already initialized
    }

    const now = new Date().toISOString();

    // Seed Settings
    const insertSetting = this.db.prepare(
      'INSERT OR REPLACE INTO system_settings (key, value, category, updated_at) VALUES (?, ?, ?, ?)'
    );
    insertSetting.run('environment_profile', 'campus_unmus', 'general', now);
    insertSetting.run('organization_name', 'Universitas Musamus Data Center & NOC', 'general', now);
    insertSetting.run('auto_fallback_simulation', 'true', 'general', now);
    insertSetting.run('snmp_default_community', 'public', 'network', now);
    insertSetting.run('default_prometheus_host', 'http://192.168.77.30:9090', 'metrics', now);

    // Seed Data Sources
    const insertSource = this.db.prepare(`
      INSERT INTO data_sources (
        id, name, category, driver, endpoint_url, ip_address, port, auth_type,
        auth_credentials, scrape_interval_sec, status, last_status, last_latency_ms,
        is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialSources: SqliteDataSource[] = [
      {
        id: 'ds-prom-main',
        name: 'Prometheus Master Host',
        category: 'prometheus',
        driver: 'prometheus_promql',
        endpoint_url: 'http://192.168.77.30:9090',
        ip_address: '192.168.77.30',
        port: 9090,
        auth_type: 'none',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 2,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-mikrotik-gw',
        name: 'MikroTik Core Router (CCR1036-12G-4S)',
        category: 'mikrotik',
        driver: 'mikrotik_rest',
        endpoint_url: 'http://192.168.77.1/rest',
        ip_address: '192.168.77.1',
        port: 80,
        auth_type: 'basic',
        auth_credentials: {
          username: process.env.MIKROTIK_USER || 'netwatch',
          password: process.env.MIKROTIK_PASS || '',
          snmpCommunity: process.env.MIKROTIK_SNMP_COMMUNITY || 'public',
        },
        scrape_interval_sec: 10,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 1,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-mikrotik-snmp',
        name: 'MikroTik SNMP Exporter Host',
        category: 'mikrotik',
        driver: 'mikrotik_snmp',
        endpoint_url: 'http://192.168.77.30:9117/snmp?module=mikrotik&target=192.168.77.1',
        ip_address: '192.168.77.30',
        port: 9117,
        auth_type: 'snmp_community',
        auth_credentials: { snmpCommunity: 'public' },
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 3,
        is_default: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-ruijie-gw',
        name: 'Ruijie Reyee Core Gateway & PoE Switches',
        category: 'ruijie',
        driver: 'ruijie_eweb',
        endpoint_url: 'http://192.168.110.1:80',
        ip_address: '192.168.110.1',
        port: 80,
        auth_type: 'basic',
        auth_credentials: { username: 'admin', password: '', snmpCommunity: 'public' },
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 4,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-pve-cluster',
        name: 'Proxmox VE Cluster (Master VIP Gateway)',
        category: 'server_node',
        driver: 'proxmox_api',
        endpoint_url: 'https://192.168.77.30:8006/pve2/api2/json',
        ip_address: '192.168.77.30',
        port: 8006,
        auth_type: 'token',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 2,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-pve-informatika',
        name: 'PVE Node 01: Informatika (Master Lab-TI)',
        category: 'server_node',
        driver: 'proxmox_api',
        endpoint_url: 'https://192.168.14.222:8006/pve2/api2/json',
        ip_address: '192.168.14.222',
        port: 8006,
        auth_type: 'token',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 2,
        is_default: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-pve-dekanat',
        name: 'PVE Node 02: Server Dekanat & OJS Web',
        category: 'server_node',
        driver: 'proxmox_api',
        endpoint_url: 'https://192.168.77.29:8006/pve2/api2/json',
        ip_address: '192.168.77.29',
        port: 8006,
        auth_type: 'token',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 4,
        is_default: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-pve-teknik',
        name: 'PVE Node 03: Fakultas Teknik (Fatek Portal)',
        category: 'server_node',
        driver: 'proxmox_api',
        endpoint_url: 'https://192.168.77.30:8006/pve2/api2/json',
        ip_address: '192.168.77.30',
        port: 8006,
        auth_type: 'token',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 3,
        is_default: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-pve-simlitabmas',
        name: 'PVE Node 04: LPPM Simlitabmas Server',
        category: 'server_node',
        driver: 'proxmox_api',
        endpoint_url: 'https://192.168.77.99:8006/pve2/api2/json',
        ip_address: '192.168.77.99',
        port: 8006,
        auth_type: 'token',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 5,
        is_default: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-node-exporter',
        name: 'Linux Node Exporter (Hardware Telemetry)',
        category: 'server_node',
        driver: 'prometheus_promql',
        endpoint_url: 'http://192.168.77.30:9100/metrics',
        ip_address: '192.168.77.30',
        port: 9100,
        auth_type: 'none',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 1,
        is_default: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-waf-crowdsec',
        name: 'CrowdSec LAPI Threat Bouncer & WAF',
        category: 'waf_crowdsec',
        driver: 'crowdsec_lapi',
        endpoint_url: 'http://192.168.77.77:6060/metrics',
        ip_address: '192.168.77.77',
        port: 6060,
        auth_type: 'none',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 2,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ds-kuma-websites',
        name: 'Uptime Kuma & Blackbox Probe Exporter',
        category: 'website_kuma',
        driver: 'http_probe',
        endpoint_url: 'http://192.168.77.30:3001/metrics',
        ip_address: '192.168.77.30',
        port: 3001,
        auth_type: 'none',
        scrape_interval_sec: 15,
        status: 'active',
        last_status: 'online',
        last_latency_ms: 3,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
    ];

    for (const s of initialSources) {
      insertSource.run(
        s.id,
        s.name,
        s.category,
        s.driver,
        s.endpoint_url,
        s.ip_address,
        s.port,
        s.auth_type,
        s.auth_credentials ? JSON.stringify(s.auth_credentials) : null,
        s.scrape_interval_sec,
        s.status,
        s.last_status || 'unknown',
        s.last_latency_ms || 0,
        s.is_default ? 1 : 0,
        s.created_at,
        s.updated_at
      );
    }

    // Seed Dashboard Mappings
    const insertMapping = this.db.prepare(`
      INSERT INTO dashboard_mappings (
        dashboard_key, title, primary_source_id, secondary_source_id,
        mode, auto_fallback, refresh_interval_sec, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialMappings: DashboardSourceMapping[] = [
      {
        dashboard_key: 'overview',
        title: 'Executive NOC Overview',
        primary_source_id: 'ds-prom-main',
        secondary_source_id: 'ds-mikrotik-gw',
        mode: 'hybrid',
        auto_fallback: true,
        refresh_interval_sec: 5,
        notes: 'Menggabungkan telemetri lintas router, server, WAF, dan availability.',
        updated_at: now,
      },
      {
        dashboard_key: 'mikrotik',
        title: 'MikroTik RouterOS Network Monitor',
        primary_source_id: 'ds-mikrotik-gw',
        secondary_source_id: 'ds-mikrotik-snmp',
        mode: 'hybrid',
        auto_fallback: true,
        refresh_interval_sec: 5,
        notes: 'Mode Hybrid: Menggunakan Direct REST API untuk interface & DHCP, dengan SNMP Prometheus sebagai backup.',
        updated_at: now,
      },
      {
        dashboard_key: 'ruijie',
        title: 'Ruijie Reyee Switch & AP Gateway',
        primary_source_id: 'ds-ruijie-gw',
        mode: 'direct_api',
        auto_fallback: true,
        refresh_interval_sec: 10,
        notes: 'Monitoring Access Point, PoE wattage, dan per-client flow bandwidth.',
        updated_at: now,
      },
      {
        dashboard_key: 'servers',
        title: 'Proxmox VE & Linux Virtual Machines',
        primary_source_id: 'ds-pve-cluster',
        secondary_source_id: 'ds-prom-main',
        mode: 'hybrid',
        auto_fallback: true,
        refresh_interval_sec: 10,
        notes: 'Cluster hypervisor telemetry + Node Exporter metrics (CPU, RAM, Disk I/O).',
        updated_at: now,
      },
      {
        dashboard_key: 'waf',
        title: 'ModSecurity & CrowdSec Security Center',
        primary_source_id: 'ds-waf-crowdsec',
        secondary_source_id: 'ds-mikrotik-gw',
        mode: 'direct_api',
        auto_fallback: true,
        refresh_interval_sec: 10,
        notes: 'LAPI ingestion & sinkronisasi otomatis address-list ban ke MikroTik.',
        updated_at: now,
      },
      {
        dashboard_key: 'websites',
        title: 'Website & Uptime Kuma HTTP Latency',
        primary_source_id: 'ds-kuma-websites',
        mode: 'hybrid',
        auto_fallback: true,
        refresh_interval_sec: 15,
        notes: 'Blackbox probing dan SSL certificate expiration tracking.',
        updated_at: now,
      },
    ];

    for (const m of initialMappings) {
      insertMapping.run(
        m.dashboard_key,
        m.title,
        m.primary_source_id,
        m.secondary_source_id || null,
        m.mode,
        m.auto_fallback ? 1 : 0,
        m.refresh_interval_sec,
        m.notes || null,
        m.updated_at || now
      );
    }

    // Seed Initial Audit Log
    this.addAuditLog(
      'SQLITE_INITIALIZED',
      'System Engine',
      'Database SQLite (netwatch.db) berhasil dibuat dan diinisialisasi dengan 7 Data Sources terkelola.'
    );
  }

  private seedTargetsIfEmpty() {
    try {
      const countRow = this.db.prepare('SELECT COUNT(*) as count FROM prometheus_targets').get() as { count: number };
      if (!countRow || countRow.count === 0) {
        for (const t of DEFAULT_PROMETHEUS_CAMPUS_TARGETS) {
          this.createTarget(t, 'System Init');
        }
      }
    } catch (e) {
      console.warn('[SQLite] Error seeding targets:', e);
    }
  }

  private ensureProxmoxNodesInDataSources() {
    try {
      const now = new Date().toISOString();
      // 1. Update ds-pve-cluster name if it's still the old combined name
      this.db.prepare(`
        UPDATE data_sources 
        SET name = 'Proxmox VE Cluster (Master VIP Gateway)', updated_at = ?
        WHERE id = 'ds-pve-cluster' AND (name = 'Proxmox VE Cluster & Node Exporter' OR name LIKE '%Node Exporter%')
      `).run(now);

      // 2. Insert the 4 dedicated Proxmox cluster nodes and the node-exporter host
      const pveNodes: Partial<SqliteDataSource>[] = [
        {
          id: 'ds-pve-informatika',
          name: 'PVE Node 01: Informatika (Master Lab-TI)',
          category: 'server_node',
          driver: 'proxmox_api',
          endpoint_url: 'https://192.168.14.222:8006/pve2/api2/json',
          ip_address: '192.168.14.222',
          port: 8006,
          auth_type: 'token',
          scrape_interval_sec: 15,
          status: 'active',
          last_status: 'online',
          last_latency_ms: 2,
          is_default: false,
        },
        {
          id: 'ds-pve-dekanat',
          name: 'PVE Node 02: Server Dekanat & OJS Web',
          category: 'server_node',
          driver: 'proxmox_api',
          endpoint_url: 'https://192.168.77.29:8006/pve2/api2/json',
          ip_address: '192.168.77.29',
          port: 8006,
          auth_type: 'token',
          scrape_interval_sec: 15,
          status: 'active',
          last_status: 'online',
          last_latency_ms: 4,
          is_default: false,
        },
        {
          id: 'ds-pve-teknik',
          name: 'PVE Node 03: Fakultas Teknik (Fatek Portal)',
          category: 'server_node',
          driver: 'proxmox_api',
          endpoint_url: 'https://192.168.77.30:8006/pve2/api2/json',
          ip_address: '192.168.77.30',
          port: 8006,
          auth_type: 'token',
          scrape_interval_sec: 15,
          status: 'active',
          last_status: 'online',
          last_latency_ms: 3,
          is_default: false,
        },
        {
          id: 'ds-pve-simlitabmas',
          name: 'PVE Node 04: LPPM Simlitabmas Server',
          category: 'server_node',
          driver: 'proxmox_api',
          endpoint_url: 'https://192.168.77.99:8006/pve2/api2/json',
          ip_address: '192.168.77.99',
          port: 8006,
          auth_type: 'token',
          scrape_interval_sec: 15,
          status: 'active',
          last_status: 'online',
          last_latency_ms: 5,
          is_default: false,
        },
        {
          id: 'ds-node-exporter',
          name: 'Linux Node Exporter (Hardware Telemetry)',
          category: 'server_node',
          driver: 'prometheus_promql',
          endpoint_url: 'http://192.168.77.30:9100/metrics',
          ip_address: '192.168.77.30',
          port: 9100,
          auth_type: 'none',
          scrape_interval_sec: 15,
          status: 'active',
          last_status: 'online',
          last_latency_ms: 1,
          is_default: false,
        },
      ];

      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO data_sources (
          id, name, category, driver, endpoint_url, ip_address, port, auth_type,
          auth_credentials, scrape_interval_sec, status, last_status, last_latency_ms,
          is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const n of pveNodes) {
        insertStmt.run(
          n.id, n.name, n.category, n.driver, n.endpoint_url, n.ip_address, n.port,
          n.auth_type, JSON.stringify({ token: 'PVEAPIToken=root@pam!monitoring=...' }),
          n.scrape_interval_sec, n.status, n.last_status, n.last_latency_ms,
          n.is_default ? 1 : 0, now, now
        );
      }
    } catch (e) {
      console.warn('[SQLite] Error ensuring Proxmox nodes in data_sources:', e);
    }
  }

  // --- CRUD DATA SOURCES ---
  public getDataSources(category?: string): SqliteDataSource[] {
    let sql = 'SELECT * FROM data_sources';
    const params: any[] = [];
    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }
    sql += ' ORDER BY created_at ASC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      ...r,
      is_default: Boolean(r.is_default),
      auth_credentials: r.auth_credentials ? JSON.parse(r.auth_credentials) : undefined,
    }));
  }

  public getDataSourceById(id: string): SqliteDataSource | null {
    const row = this.db.prepare('SELECT * FROM data_sources WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      ...row,
      is_default: Boolean(row.is_default),
      auth_credentials: row.auth_credentials ? JSON.parse(row.auth_credentials) : undefined,
    };
  }

  public getDataSourceByCategory(category: string): SqliteDataSource | null {
    const row = this.db.prepare("SELECT * FROM data_sources WHERE category = ? AND status = 'active' ORDER BY is_default DESC LIMIT 1").get(category) as any;
    if (!row) return null;
    return {
      ...row,
      is_default: Boolean(row.is_default),
      auth_credentials: row.auth_credentials ? JSON.parse(row.auth_credentials) : undefined,
    };
  }

  public createDataSource(data: Partial<SqliteDataSource>): SqliteDataSource {
    const now = new Date().toISOString();
    const id = data.id || `ds-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const port = data.port || 80;
    const ip = data.ip_address || '127.0.0.1';
    const endpoint = data.endpoint_url || `http://${ip}:${port}`;

    const stmt = this.db.prepare(`
      INSERT INTO data_sources (
        id, name, category, driver, endpoint_url, ip_address, port, auth_type,
        auth_credentials, scrape_interval_sec, status, last_status, last_latency_ms,
        is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name || 'New Data Source',
      data.category || 'custom_api',
      data.driver || 'custom_json',
      endpoint,
      ip,
      port,
      data.auth_type || 'none',
      data.auth_credentials ? JSON.stringify(data.auth_credentials) : null,
      data.scrape_interval_sec || 15,
      data.status || 'active',
      data.last_status || 'unknown',
      data.last_latency_ms || 0,
      data.is_default ? 1 : 0,
      now,
      now
    );

    this.addAuditLog('DATA_SOURCE_CREATED', 'Operator', `Sumber data baru "${data.name}" (${ip}:${port}) ditambahkan ke SQLite.`);
    return this.getDataSourceById(id)!;
  }

  public updateDataSource(id: string, data: Partial<SqliteDataSource>): SqliteDataSource | null {
    const existing = this.getDataSourceById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const merged: SqliteDataSource = {
      ...existing,
      ...data,
      updated_at: now,
    };

    const stmt = this.db.prepare(`
      UPDATE data_sources SET
        name = ?,
        category = ?,
        driver = ?,
        endpoint_url = ?,
        ip_address = ?,
        port = ?,
        auth_type = ?,
        auth_credentials = ?,
        scrape_interval_sec = ?,
        status = ?,
        last_status = ?,
        last_latency_ms = ?,
        last_error = ?,
        last_checked_at = ?,
        is_default = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.name,
      merged.category,
      merged.driver,
      merged.endpoint_url,
      merged.ip_address,
      merged.port,
      merged.auth_type,
      merged.auth_credentials ? JSON.stringify(merged.auth_credentials) : null,
      merged.scrape_interval_sec,
      merged.status,
      merged.last_status || 'unknown',
      merged.last_latency_ms || 0,
      merged.last_error || null,
      merged.last_checked_at || null,
      merged.is_default ? 1 : 0,
      now,
      id
    );

    this.addAuditLog('DATA_SOURCE_UPDATED', 'Operator', `Sumber data "${merged.name}" diperbarui ke IP ${merged.ip_address}:${merged.port}.`);
    return this.getDataSourceById(id);
  }

  public deleteDataSource(id: string): boolean {
    const ds = this.getDataSourceById(id);
    if (!ds) return false;

    this.db.prepare('DELETE FROM data_sources WHERE id = ?').run(id);
    this.addAuditLog('DATA_SOURCE_DELETED', 'Operator', `Sumber data "${ds.name}" (${ds.ip_address}) dihapus dari SQLite.`);
    return true;
  }

  // --- DASHBOARD MAPPINGS ---
  public getDashboardMappings(): DashboardSourceMapping[] {
    const rows = this.db.prepare('SELECT * FROM dashboard_mappings').all() as any[];
    return rows.map(r => ({
      ...r,
      auto_fallback: Boolean(r.auto_fallback),
    }));
  }

  public getDashboardMapping(dashboardKey: string): DashboardSourceMapping | null {
    const row = this.db.prepare('SELECT * FROM dashboard_mappings WHERE dashboard_key = ?').get(dashboardKey) as any;
    if (!row) return null;
    return {
      ...row,
      auto_fallback: Boolean(row.auto_fallback),
    };
  }

  public updateDashboardMapping(dashboardKey: string, data: Partial<DashboardSourceMapping>): DashboardSourceMapping | null {
    const existing = this.getDashboardMapping(dashboardKey);
    if (!existing) return null;

    const now = new Date().toISOString();
    const merged = { ...existing, ...data, updated_at: now };

    const stmt = this.db.prepare(`
      UPDATE dashboard_mappings SET
        primary_source_id = ?,
        secondary_source_id = ?,
        mode = ?,
        auto_fallback = ?,
        refresh_interval_sec = ?,
        notes = ?,
        updated_at = ?
      WHERE dashboard_key = ?
    `);

    stmt.run(
      merged.primary_source_id,
      merged.secondary_source_id || null,
      merged.mode,
      merged.auto_fallback ? 1 : 0,
      merged.refresh_interval_sec,
      merged.notes || null,
      now,
      dashboardKey
    );

    this.addAuditLog('MAPPING_UPDATED', 'Operator', `Mapping dashboard "${dashboardKey}" diubah ke source [${merged.primary_source_id}].`);
    return this.getDashboardMapping(dashboardKey);
  }

  // --- SYSTEM SETTINGS ---
  public getSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM system_settings').all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  public getSetting(key: string, defaultVal: string = ''): string {
    const row = this.db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : defaultVal;
  }

  public setSetting(key: string, value: string, category: string = 'general'): void {
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT OR REPLACE INTO system_settings (key, value, category, updated_at) VALUES (?, ?, ?, ?)'
    ).run(key, value, category, now);
  }

  // --- ENVIRONMENT PRESET APPLIER ---
  public applyPreset(presetId: string): boolean {
    const preset = PRESET_PROFILES[presetId];
    if (!preset) return false;

    const now = new Date().toISOString();
    for (const s of preset.sources) {
      if (!s.id) continue;
      const existing = this.getDataSourceById(s.id);
      if (existing) {
        this.updateDataSource(s.id, {
          endpoint_url: s.endpoint_url,
          ip_address: s.ip_address,
          port: s.port,
        });
      }
    }

    this.setSetting('environment_profile', preset.id);
    this.addAuditLog('PRESET_APPLIED', 'Operator', `Preset lingkungan "${preset.name}" berhasil diterapkan ke SQLite.`);
    this.syncDataSourcesAndTargets();
    return true;
  }

  // --- SYNC DATA SOURCES WITH PROMETHEUS TARGETS ---
  public syncDataSourcesAndTargets(): { updatedTargets: number; updatedSources: number } {
    let updatedTargets = 0;
    const sources = this.getDataSources();
    const now = new Date().toISOString();

    for (const s of sources) {
      if (s.category === 'mikrotik' && s.ip_address) {
        // Sync to MikroTik SNMP & Core targets
        const tgts = this.db.prepare("SELECT id FROM prometheus_targets WHERE module = 'mikrotik'").all() as any[];
        for (const t of tgts) {
          this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id = ?")
            .run(s.ip_address, now, t.id);
          updatedTargets++;
        }
      } else if (s.category === 'server_node' && s.ip_address) {
        // Sync to specific Proxmox Node targets based on source ID
        if (s.id === 'ds-pve-informatika') {
          this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id = 'tgt-pve-lab-ti'").run(s.ip_address, now);
          updatedTargets++;
        } else if (s.id === 'ds-pve-dekanat') {
          this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id = 'tgt-pve-dekanat'").run(s.ip_address, now);
          updatedTargets++;
        } else if (s.id === 'ds-pve-teknik') {
          this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id = 'tgt-pve-teknik'").run(s.ip_address, now);
          updatedTargets++;
        } else if (s.id === 'ds-pve-simlitabmas') {
          this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id = 'tgt-pve-simlitabmas'").run(s.ip_address, now);
          updatedTargets++;
        } else if (s.id === 'ds-node-exporter') {
          this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id IN ('tgt-node-exporter', 'tgt-node-host')").run(s.ip_address, now);
          updatedTargets += 2;
        } else if (s.id === 'ds-pve-cluster') {
          // If cluster VIP is updated, update all PVE targets that don't have dedicated sources
          const t = this.getTargetById('tgt-pve-cluster');
          if (t) {
            this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id = ?")
              .run(s.ip_address, now, t.id);
            updatedTargets++;
          }
        }
      } else if (s.category === 'waf_crowdsec' && s.ip_address) {
        // Sync to WAF targets
        const tgts = this.db.prepare("SELECT id FROM prometheus_targets WHERE module = 'waf'").all() as any[];
        for (const t of tgts) {
          this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id = ?")
            .run(s.ip_address, now, t.id);
          updatedTargets++;
        }
      } else if (s.category === 'website_kuma' && s.ip_address) {
        // Sync to Website targets
        const tgts = this.db.prepare("SELECT id FROM prometheus_targets WHERE module = 'website'").all() as any[];
        for (const t of tgts) {
          this.db.prepare("UPDATE prometheus_targets SET instance_ip = ?, updated_at = ? WHERE id = ?")
            .run(s.ip_address, now, t.id);
          updatedTargets++;
        }
      }
    }

    this.addAuditLog('SYNC_SOURCES_TARGETS', 'System/Operator', `Sinkronisasi menyeluruh: ${updatedTargets} target Prometheus diperbarui sesuai Data Sources SQLite.`);
    return { updatedTargets, updatedSources: sources.length };
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(limit: number = 50): any[] {
    return this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  public clearAuditLogs(): void {
    try {
      this.db.prepare('DELETE FROM audit_logs').run();
    } catch (e) {
      console.warn('[SQLite] Failed to clear audit logs:', e);
    }
  }

  public cleanSlateDatabase(preserveTargets: boolean = true): void {
    try {
      this.clearAuditLogs();
      this.setSetting('auto_fallback_simulation', 'false', 'general');
      if (!preserveTargets) {
        this.db.prepare('DELETE FROM prometheus_targets').run();
      }
      this.addAuditLog('CLEAN_SLATE_ACTIVATED', 'Administrator', 'Mode Bersih (Clean Slate) diaktifkan. Seluruh log & simulasi dummy dibersihkan.');
    } catch (e) {
      console.warn('[SQLite] Failed to clean slate database:', e);
    }
  }

  public addAuditLog(action: string, operator: string, details: string): void {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    try {
      this.db.prepare(`
        INSERT INTO audit_logs (id, action, operator, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, action, operator, details, now);
    } catch (e) {
      // Ignore logging failures
    }
  }

  // --- CRUD PROMETHEUS TARGETS (MIGRATED TO SQLITE) ---
  public getAllTargets(filters: { module?: string; state?: string; search?: string } = {}): PrometheusTarget[] {
    let sql = 'SELECT * FROM prometheus_targets WHERE 1=1';
    const params: any[] = [];

    if (filters.module && filters.module !== 'all') {
      sql += ' AND (module = ? OR mapped_module = ?)';
      params.push(filters.module, filters.module);
    }

    if (filters.state && filters.state !== 'all') {
      if (filters.state === 'PAUSED') {
        sql += ' AND is_paused = 1';
      } else {
        sql += ' AND state = ? AND is_paused = 0';
        params.push(filters.state);
      }
    }

    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      sql += ' AND (LOWER(job_name) LIKE ? OR LOWER(endpoint) LIKE ? OR LOWER(instance_ip) LIKE ? OR LOWER(node_name) LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY is_paused ASC, job_name ASC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapRowToTarget(r));
  }

  public getTargetById(id: string): PrometheusTarget | null {
    const row = this.db.prepare('SELECT * FROM prometheus_targets WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToTarget(row);
  }

  public createTarget(data: Partial<PrometheusTarget>, operator: string = 'Admin'): PrometheusTarget {
    const id = data.id || `tgt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const target: PrometheusTarget = {
      id,
      job: data.job || data.jobName || 'custom-job',
      jobName: data.jobName || data.job || 'Custom Job',
      endpoint: data.endpoint || 'http://127.0.0.1:9100/metrics',
      instanceIp: data.instanceIp || '127.0.0.1',
      module: (data.module as any) || 'custom',
      mappedModule: (data.mappedModule as any) || (data.module as any) || 'custom',
      nodeName: data.nodeName || data.jobName || 'Unnamed Node',
      mappedNodeName: data.mappedNodeName || data.nodeName || 'Unnamed Node',
      state: data.state || 'UP',
      isPaused: Boolean(data.isPaused),
      responseTimeMs: data.responseTimeMs || 1,
      scrapeInterval: data.scrapeInterval || '15s',
      scrapeDuration: data.scrapeDuration || '0.05s',
      exporterType: data.exporterType || 'Generic Prometheus Exporter',
      installedOnTarget: data.installedOnTarget !== undefined ? Boolean(data.installedOnTarget) : true,
      labels: data.labels || {},
      selectedMetrics: data.selectedMetrics || [],
    };

    const stmt = this.db.prepare(`
      INSERT INTO prometheus_targets (
        id, job, job_name, endpoint, instance_ip, module, mapped_module,
        node_name, mapped_node_name, state, is_paused, response_time_ms,
        scrape_interval, scrape_duration, exporter_type, installed_on_target,
        labels, selected_metrics, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      target.id,
      target.job,
      target.jobName,
      target.endpoint,
      target.instanceIp,
      target.module,
      target.mappedModule,
      target.nodeName,
      target.mappedNodeName,
      target.state,
      target.isPaused ? 1 : 0,
      target.responseTimeMs,
      target.scrapeInterval,
      target.scrapeDuration,
      target.exporterType,
      target.installedOnTarget ? 1 : 0,
      JSON.stringify(target.labels || {}),
      JSON.stringify(target.selectedMetrics || []),
      now,
      now
    );

    this.addAuditLog('CREATE_TARGET', operator, `Menambahkan target Prometheus: ${target.jobName} (${target.endpoint})`);
    return target;
  }

  public updateTarget(id: string, updates: Partial<PrometheusTarget>, operator: string = 'Admin'): PrometheusTarget | null {
    const existing = this.getTargetById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const merged: PrometheusTarget = {
      ...existing,
      ...updates,
      id,
    };

    const stmt = this.db.prepare(`
      UPDATE prometheus_targets SET
        job = ?,
        job_name = ?,
        endpoint = ?,
        instance_ip = ?,
        module = ?,
        mapped_module = ?,
        node_name = ?,
        mapped_node_name = ?,
        state = ?,
        is_paused = ?,
        response_time_ms = ?,
        scrape_interval = ?,
        scrape_duration = ?,
        exporter_type = ?,
        installed_on_target = ?,
        labels = ?,
        selected_metrics = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.job,
      merged.jobName,
      merged.endpoint,
      merged.instanceIp,
      merged.module,
      merged.mappedModule,
      merged.nodeName,
      merged.mappedNodeName,
      merged.state,
      merged.isPaused ? 1 : 0,
      merged.responseTimeMs,
      merged.scrapeInterval,
      merged.scrapeDuration,
      merged.exporterType,
      merged.installedOnTarget ? 1 : 0,
      JSON.stringify(merged.labels || {}),
      JSON.stringify(merged.selectedMetrics || []),
      now,
      id
    );

    this.addAuditLog('UPDATE_TARGET', operator, `Memperbarui target ${merged.jobName}`);
    return merged;
  }

  public toggleTargetPause(id: string, operator: string = 'Admin'): PrometheusTarget | null {
    const target = this.getTargetById(id);
    if (!target) return null;

    const newPaused = !target.isPaused;
    const now = new Date().toISOString();
    this.db.prepare('UPDATE prometheus_targets SET is_paused = ?, updated_at = ? WHERE id = ?')
      .run(newPaused ? 1 : 0, now, id);

    const action = newPaused ? 'PAUSE_TARGET' : 'RESUME_TARGET';
    this.addAuditLog(action, operator, `Mengubah status scrape target ${target.jobName} menjadi ${newPaused ? 'Dijeda' : 'Aktif'}`);
    return { ...target, isPaused: newPaused };
  }

  public deleteTarget(id: string, operator: string = 'Admin'): boolean {
    const target = this.getTargetById(id);
    if (!target) return false;

    this.db.prepare('DELETE FROM prometheus_targets WHERE id = ?').run(id);
    this.addAuditLog('DELETE_TARGET', operator, `Menghapus target ${target.jobName} (${target.endpoint})`);
    return true;
  }

  public batchUpsertTargets(targets: Partial<PrometheusTarget>[], operator: string = 'Admin'): number {
    let count = 0;
    for (const t of targets) {
      if (t.id && this.getTargetById(t.id)) {
        this.updateTarget(t.id, t, operator);
      } else {
        this.createTarget(t, operator);
      }
      count++;
    }
    this.addAuditLog('BATCH_UPSERT_TARGETS', operator, `Batch upsert ${count} target ke SQLite`);
    return count;
  }

  public resetTargetsToSeed(operator: string = 'Admin'): PrometheusTarget[] {
    this.db.prepare('DELETE FROM prometheus_targets').run();
    for (const t of DEFAULT_PROMETHEUS_CAMPUS_TARGETS) {
      this.createTarget(t, operator);
    }
    this.addAuditLog('RESET_TARGETS_SEED', operator, 'Mereset target Prometheus ke 12 seed kampus awal');
    return this.getAllTargets();
  }

  public replaceAllTargets(targets: Partial<PrometheusTarget>[], operator: string = 'Prometheus Live Sync'): PrometheusTarget[] {
    this.db.prepare('DELETE FROM prometheus_targets').run();
    const created: PrometheusTarget[] = [];
    for (const t of targets) {
      created.push(this.createTarget(t, operator));
    }
    this.addAuditLog('REPLACE_ALL_TARGETS', operator, `Mengganti seluruh target dengan ${created.length} target riil dari Prometheus Host.`);
    return created;
  }

  public generatePrometheusYaml(): string {
    const activeTargets = this.getAllTargets().filter((t) => !t.isPaused);
    let yaml = `# =========================================================================\n# NetWatch Pro Prometheus Configuration File (prometheus.yml)\n# Generated automatically from SQLite Native Database Manager\n# Generated at: ${new Date().toISOString()}\n# Active Scrape Jobs: ${activeTargets.length}\n# =========================================================================\n\nglobal:\n  scrape_interval: 15s\n  evaluation_interval: 15s\n  scrape_timeout: 10s\n\nalerting:\n  alertmanagers:\n    - static_configs:\n        - targets: []\n\nrule_files: []\n\nscrape_configs:\n`;

    const jobMap = new Map<string, PrometheusTarget[]>();
    activeTargets.forEach((t) => {
      const jobKey = t.jobName || t.job || 'unnamed_job';
      if (!jobMap.has(jobKey)) {
        jobMap.set(jobKey, []);
      }
      jobMap.get(jobKey)!.push(t);
    });

    jobMap.forEach((targets, jobKey) => {
      const first = targets[0];
      const interval = first.scrapeInterval || '15s';

      yaml += `  - job_name: '${jobKey}'\n`;
      yaml += `    scrape_interval: ${interval}\n`;

      if (first.endpoint.includes('/snmp?')) {
        try {
          const urlObj = new URL(first.endpoint);
          const exporterTarget = urlObj.host;
          const snmpTargetIp = urlObj.searchParams.get('target') || first.instanceIp || '192.168.77.1';
          const snmpModule = urlObj.searchParams.get('module') || 'mikrotik';

          yaml += `    static_configs:\n`;
          yaml += `      - targets:\n`;
          yaml += `          - '${snmpTargetIp}'\n`;
          yaml += `        labels:\n`;
          yaml += `          module: '${snmpModule}'\n`;
          yaml += `          instance: '${first.nodeName || snmpTargetIp}'\n`;
          yaml += `    metrics_path: /snmp\n`;
          yaml += `    params:\n`;
          yaml += `      module: ['${snmpModule}']\n`;
          yaml += `    relabel_configs:\n`;
          yaml += `      - source_labels: [__address__]\n`;
          yaml += `        target_label: __param_target\n`;
          yaml += `      - source_labels: [__param_target]\n`;
          yaml += `        target_label: instance\n`;
          yaml += `      - target_label: __address__\n`;
          yaml += `        replacement: ${exporterTarget}\n`;
        } catch {
          yaml += `    static_configs:\n`;
          yaml += `      - targets: ['${first.instanceIp || '192.168.77.1:9117'}']\n`;
        }
      } else {
        let rawTargetAddress = first.instanceIp || '127.0.0.1:9100';
        try {
          const u = new URL(first.endpoint);
          rawTargetAddress = u.host;
          if (u.pathname && u.pathname !== '/metrics' && u.pathname !== '/') {
            yaml += `    metrics_path: '${u.pathname}'\n`;
          }
        } catch {}

        yaml += `    static_configs:\n`;
        yaml += `      - targets:\n`;
        targets.forEach((t) => {
          let host = t.instanceIp;
          try {
            host = new URL(t.endpoint).host;
          } catch {}
          yaml += `          - '${host}'\n`;
        });

        if (first.labels && Object.keys(first.labels).length > 0) {
          yaml += `        labels:\n`;
          Object.entries(first.labels).forEach(([k, v]) => {
            yaml += `          ${k}: '${v}'\n`;
          });
        }
      }
      yaml += `\n`;
    });

    return yaml;
  }

  public getTargetStats() {
    const all = this.getAllTargets();
    let sizeBytes = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        sizeBytes = fs.statSync(DB_FILE).size;
      }
    } catch {}

    const totalLogs = (this.db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any)?.count || 0;

    return {
      storageEngine: 'SQLite 3 Native (Node.js DatabaseSync)',
      dbFilePath: DB_FILE,
      sizeBytes,
      totalTargets: all.length,
      activeTargets: all.filter((t) => !t.isPaused).length,
      pausedTargets: all.filter((t) => t.isPaused).length,
      totalAuditLogs: totalLogs,
      lastUpdated: new Date().toISOString(),
      settings: this.getSettings(),
    };
  }

  private mapRowToTarget(r: any): PrometheusTarget {
    let labels: Record<string, string> = {};
    try {
      if (r.labels) labels = JSON.parse(r.labels);
    } catch {}

    let selectedMetrics: string[] = [];
    try {
      if (r.selected_metrics) selectedMetrics = JSON.parse(r.selected_metrics);
    } catch {}

    return {
      id: r.id,
      job: r.job,
      jobName: r.job_name,
      endpoint: r.endpoint,
      instanceIp: r.instance_ip || '',
      module: (r.module as any) || 'custom',
      mappedModule: (r.mapped_module as any) || (r.module as any) || 'custom',
      nodeName: r.node_name || r.job_name,
      mappedNodeName: r.mapped_node_name || r.node_name || r.job_name,
      state: r.state || 'UP',
      isPaused: Boolean(r.is_paused),
      responseTimeMs: r.response_time_ms || 0,
      scrapeInterval: r.scrape_interval || '15s',
      scrapeDuration: r.scrape_duration || '0.10s',
      exporterType: r.exporter_type || 'Generic Exporter',
      installedOnTarget: Boolean(r.installed_on_target),
      labels,
      selectedMetrics,
    };
  }

  // --- DB STATS & EXPORT/IMPORT ---
  public getDatabaseStats() {
    let sizeBytes = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        sizeBytes = fs.statSync(DB_FILE).size;
      }
    } catch {}

    const sourcesCount = (this.db.prepare('SELECT COUNT(*) as count FROM data_sources').get() as any)?.count || 0;
    const mappingsCount = (this.db.prepare('SELECT COUNT(*) as count FROM dashboard_mappings').get() as any)?.count || 0;
    const logsCount = (this.db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any)?.count || 0;
    const targetsCount = (this.db.prepare('SELECT COUNT(*) as count FROM prometheus_targets').get() as any)?.count || 0;

    return {
      engine: 'SQLite 3 (Built-in Node.js v22 DatabaseSync)',
      databaseFile: DB_FILE,
      sizeBytes,
      sizeFormatted: `${(sizeBytes / 1024).toFixed(2)} KB`,
      sourcesCount,
      mappingsCount,
      logsCount,
      targetsCount,
      activeProfile: this.getSetting('environment_profile', 'campus_unmus'),
      lastUpdated: new Date().toISOString(),
    };
  }

  public exportAll(): any {
    return {
      version: '3.0.0-sqlite',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      dataSources: this.getDataSources(),
      mappings: this.getDashboardMappings(),
      targets: this.getAllTargets(),
      auditLogs: this.getAuditLogs(100),
    };
  }

  public importAll(payload: any): boolean {
    if (!payload || (!Array.isArray(payload.dataSources) && !Array.isArray(payload.targets))) return false;

    // Update data sources
    if (Array.isArray(payload.dataSources)) {
      for (const ds of payload.dataSources) {
        if (this.getDataSourceById(ds.id)) {
          this.updateDataSource(ds.id, ds);
        } else {
          this.createDataSource(ds);
        }
      }
    }

    // Update targets
    if (Array.isArray(payload.targets)) {
      this.batchUpsertTargets(payload.targets, 'Import');
    }

    if (Array.isArray(payload.mappings)) {
      for (const m of payload.mappings) {
        this.updateDashboardMapping(m.dashboard_key, m);
      }
    }

    if (payload.settings && typeof payload.settings === 'object') {
      for (const [k, v] of Object.entries(payload.settings)) {
        this.setSetting(k, String(v));
      }
    }

    this.addAuditLog('CONFIG_IMPORTED', 'Operator', 'Konfigurasi jaringan berhasil diimpor dari file cadangan.');
    return true;
  }
}

// Export singleton instance
export const sqliteDb = new SqliteDatabaseManager();
