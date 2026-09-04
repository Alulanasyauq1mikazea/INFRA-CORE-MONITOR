import { ProxmoxTelemetry, ProxmoxNode, ProxmoxVm, ProxmoxStorage } from '../types.js';
import { getConfig } from '../config.js';
import { recordMetric } from '../db.js';
import { getAllNodes, getAllVms, getAllStorages } from './proxmoxStore.js';
import { parsePveExporterText } from './pveExporterParser.js';

export async function fetchProxmoxData(): Promise<{
  telemetry: ProxmoxTelemetry;
  latencyMs: number;
  isLive: boolean;
  error: string | null;
}> {
  const currentConfig = getConfig();
  const config = currentConfig.proxmox;
  const startTime = Date.now();

  if (!config.enabled) {
    return {
      telemetry: getDemoProxmoxTelemetry(false),
      latencyMs: 0,
      isLive: false,
      error: 'Proxmox collector is disabled in configuration',
    };
  }

  // Collect potential endpoints from main config and custom data sources targeting proxmox
  const exporterEndpoints: string[] = [];
  if (config.exporterEndpoint) {
    exporterEndpoints.push(config.exporterEndpoint);
  }

  if (currentConfig.dataSources) {
    for (const ds of currentConfig.dataSources) {
      if (ds.enabled && (ds.targetDashboard === 'proxmox' || ds.type === 'proxmox') && ds.endpoint) {
        if (!exporterEndpoints.includes(ds.endpoint)) {
          exporterEndpoints.push(ds.endpoint);
        }
      }
    }
  }

  const apiBase = config.apiEndpoint?.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
  };

  if (config.tokenId && config.tokenSecret) {
    headers['Authorization'] = `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`;
  }

  if (!config.verifySsl) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 5000);

    const promises: Promise<Response>[] = [];
    if (apiBase) {
      promises.push(fetch(`${apiBase}/api2/json/cluster/resources`, { headers, signal: controller.signal }));
    }
    for (const expUrl of exporterEndpoints) {
      promises.push(fetch(expUrl, { signal: controller.signal, headers: { Accept: 'text/plain' } }));
    }

    const settled = await Promise.allSettled(promises);
    clearTimeout(timeoutId);

    let isLiveSuccess = false;
    let vms: ProxmoxVm[] = [];
    let nodes: ProxmoxNode[] = [];
    let storages: ProxmoxStorage[] = [];
    let metricDefinitions: { metric: string; help: string; type: string; count: number }[] = [];
    let rawExporterMetrics = '';
    let parsedClusterName = config.clusterName || 'Proxmox VE Cluster';

    // 1. Check if any pve_exporter endpoint responded with Prometheus text
    for (const res of settled) {
      if (res.status === 'fulfilled' && res.value.ok) {
        const text = await res.value.text();
        if (text && (text.includes('pve_') || text.includes('# HELP'))) {
          const parsed = parsePveExporterText(text);
          if (parsed.nodes.length > 0 || parsed.vms.length > 0) {
            isLiveSuccess = true;
            nodes = parsed.nodes;
            vms = parsed.vms;
            storages = parsed.storages;
            metricDefinitions = parsed.metricDefinitions;
            rawExporterMetrics = text;
            parsedClusterName = parsed.clusterName;
            break;
          }
        }
      }
    }

    // 2. Fallback to API2 JSON if exporter was not found
    if (!isLiveSuccess && settled[0]?.status === 'fulfilled' && settled[0].value.ok) {
      try {
        const json = await settled[0].value.json();
        const data = json.data || [];
        if (data.length > 0) {
          isLiveSuccess = true;
          nodes = data
            .filter((item: any) => item.type === 'node')
            .map((n: any) => ({
              name: n.node || 'informatika',
              status: n.status === 'online' ? 'online' : 'offline',
              cpuPercent: Number(((n.cpu || 0) * 100).toFixed(1)),
              cpuCores: Number(n.maxcpu || 32),
              memBytes: Number(n.mem || 0),
              maxMemBytes: Number(n.maxmem || 32 * 1024 * 1024 * 1024),
              diskBytes: Number(n.disk || 0),
              maxDiskBytes: Number(n.maxdisk || 100 * 1024 * 1024 * 1024),
              uptimeSeconds: Number(n.uptime || 0),
              loadAverage: [1.2, 0.9, 0.7] as [number, number, number],
              release: '9.2',
              version: '9.2.2',
            }));

          vms = data
            .filter((item: any) => item.type === 'qemu' || item.type === 'lxc')
            .map((g: any) => ({
              vmid: Number(g.vmid || 100),
              name: g.name || `VM-${g.vmid}`,
              type: g.type as 'qemu' | 'lxc',
              node: g.node || 'informatika',
              status: g.status === 'running' ? 'running' : g.status === 'stopped' ? 'stopped' : 'paused',
              cpuPercent: Number(((g.cpu || 0) * 100).toFixed(1)),
              maxCpu: Number(g.maxcpu || 4),
              memBytes: Number(g.mem || 0),
              maxMemBytes: Number(g.maxmem || 4 * 1024 * 1024 * 1024),
              diskBytes: Number(g.disk || 0),
              maxDiskBytes: Number(g.maxdisk || 32 * 1024 * 1024 * 1024),
              netInBytes: Number(g.netin || 0),
              netOutBytes: Number(g.netout || 0),
              uptimeSeconds: Number(g.uptime || 0),
            }));
        }
      } catch {
        // Continue to fallback
      }
    }

    const latencyMs = Date.now() - startTime;

    if (isLiveSuccess || nodes.length > 0 || vms.length > 0) {
      const vmsRunning = vms.filter((v) => v.type === 'qemu' && v.status === 'running').length;
      const vmsTotal = vms.filter((v) => v.type === 'qemu').length;
      const lxcsRunning = vms.filter((v) => v.type === 'lxc' && v.status === 'running').length;
      const lxcsTotal = vms.filter((v) => v.type === 'lxc').length;

      const avgCpu = Number(
        (nodes.reduce((acc, n) => acc + n.cpuPercent, 0) / (nodes.length || 1)).toFixed(1)
      );
      const totalMemUsed = nodes.reduce((acc, n) => acc + n.memBytes, 0);
      const totalMemMax = nodes.reduce((acc, n) => acc + n.maxMemBytes, 0) || 1;
      const avgMem = Number(((totalMemUsed / totalMemMax) * 100).toFixed(1));

      recordMetric('proxmox', 'cluster_cpu', avgCpu);
      recordMetric('proxmox', 'cluster_mem', avgMem);

      const telemetry: ProxmoxTelemetry = {
        isLive: true,
        timestamp: Date.now(),
        cluster: {
          name: parsedClusterName,
          quorate: true,
          nodesCount: nodes.length || 2,
          nodesOnline: nodes.filter((n) => n.status === 'online').length || 2,
          vmsRunning,
          vmsTotal,
          lxcsRunning,
          lxcsTotal,
          totalCpuPercent: avgCpu,
          totalMemPercent: avgMem,
          totalDiskPercent: 32.4,
        },
        nodes: nodes.length > 0 ? nodes : getAllNodes(),
        vms: vms.length > 0 ? vms : getAllVms(),
        storages: storages.length > 0 ? storages : getAllStorages(),
        metricDefinitions,
        rawExporterMetrics,
      };

      return {
        telemetry,
        latencyMs,
        isLive: true,
        error: null,
      };
    }

    throw new Error('Proxmox API and Exporter endpoints unreachable');
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err.name === 'AbortError' ? 'Proxmox connection timed out' : err.message || 'Connection refused';

    return {
      telemetry: getDemoProxmoxTelemetry(false),
      latencyMs,
      isLive: false,
      error: errorMsg,
    };
  }
}

export function getProxmoxInventoryTelemetry(isLive: boolean = false): ProxmoxTelemetry {
  const nodes = getAllNodes();
  const vms = getAllVms();
  const storages = getAllStorages();

  const vmsRunning = vms.filter((v) => v.type === 'qemu' && v.status === 'running').length;
  const vmsTotal = vms.filter((v) => v.type === 'qemu').length;
  const lxcsRunning = vms.filter((v) => v.type === 'lxc' && v.status === 'running').length;
  const lxcsTotal = vms.filter((v) => v.type === 'lxc').length;

  const totalMemUsed = nodes.reduce((acc, n) => acc + (n.memBytes || 0), 0);
  const totalMemMax = nodes.reduce((acc, n) => acc + (n.maxMemBytes || 0), 0) || 1;
  const totalDiskUsed = nodes.reduce((acc, n) => acc + (n.diskBytes || 0), 0);
  const totalDiskMax = nodes.reduce((acc, n) => acc + (n.maxDiskBytes || 0), 0) || 1;
  const avgCpu = nodes.length > 0 ? Number((nodes.reduce((acc, n) => acc + (n.cpuPercent || 0), 0) / nodes.length).toFixed(1)) : 0;
  const avgMem = Number(((totalMemUsed / totalMemMax) * 100).toFixed(1));
  const avgDisk = Number(((totalDiskUsed / totalDiskMax) * 100).toFixed(1));

  // Default metric definitions available in PVE exporter
  const defaultMetricDefs = [
    { metric: 'pve_up', help: 'Node/VM/CT-Status is online/running', type: 'gauge', count: 27 },
    { metric: 'pve_cpu_usage_ratio', help: 'CPU utilization (for types node, qemu, lxc)', type: 'gauge', count: 27 },
    { metric: 'pve_cpu_usage_limit', help: 'Number of available CPUs', type: 'gauge', count: 27 },
    { metric: 'pve_memory_usage_bytes', help: 'Used memory in bytes', type: 'gauge', count: 27 },
    { metric: 'pve_memory_size_bytes', help: 'Available memory in bytes', type: 'gauge', count: 27 },
    { metric: 'pve_disk_usage_bytes', help: 'Used disk space in bytes', type: 'gauge', count: 27 },
    { metric: 'pve_disk_size_bytes', help: 'Storage size in bytes', type: 'gauge', count: 27 },
    { metric: 'pve_network_transmit_bytes_total', help: 'Guest transmitted network traffic bytes', type: 'counter', count: 27 },
    { metric: 'pve_network_receive_bytes_total', help: 'Guest received network traffic bytes', type: 'counter', count: 27 },
    { metric: 'pve_guest_info', help: 'VM/CT metadata info (name, node, tags, template, type)', type: 'gauge', count: 27 },
    { metric: 'pve_onboot_status', help: 'Proxmox VM config onboot auto-start value', type: 'gauge', count: 27 },
    { metric: 'pve_not_backed_up_total', help: 'Total number of guests not covered by any backup job', type: 'gauge', count: 2 },
    { metric: 'pve_storage_info', help: 'Storage info, plugintype, content types', type: 'gauge', count: 7 },
  ];

  return {
    isLive,
    timestamp: Date.now(),
    cluster: {
      name: 'Proxmox VE Multi-Node Cluster (Informatika & PVE)',
      quorate: true,
      nodesCount: nodes.length,
      nodesOnline: nodes.filter((n) => n.status === 'online').length,
      vmsRunning,
      vmsTotal,
      lxcsRunning,
      lxcsTotal,
      totalCpuPercent: avgCpu,
      totalMemPercent: avgMem,
      totalDiskPercent: avgDisk,
    },
    nodes,
    vms,
    storages,
    metricDefinitions: defaultMetricDefs,
  };
}

function getDemoNodes(): ProxmoxNode[] {
  return getAllNodes();
}

function getDemoVms(): ProxmoxVm[] {
  return getAllVms();
}

function getDemoProxmoxTelemetry(isLive: boolean): ProxmoxTelemetry {
  return getProxmoxInventoryTelemetry(isLive);
}
