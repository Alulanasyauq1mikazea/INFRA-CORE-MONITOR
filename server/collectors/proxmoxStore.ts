import { ProxmoxNode, ProxmoxVm, ProxmoxStorage } from '../types.js';
import { recordEventFeed } from '../db.js';

// Real nodes matching user's Proxmox clusters
function createDefaultNodes(): ProxmoxNode[] {
  return [
    {
      name: 'informatika',
      status: 'online',
      cpuPercent: 0.83,
      cpuCores: 32,
      memBytes: 23111766016, // 23.11 GB
      maxMemBytes: 33547079680, // 33.55 GB
      diskBytes: 17207816192, // 17.21 GB
      maxDiskBytes: 100861726720, // 100.86 GB
      uptimeSeconds: 3125578, // ~36 days
      loadAverage: [0.85, 0.72, 0.65],
      release: '9.2',
      version: '9.2.2',
      unbackedUpTotal: 6,
    },
    {
      name: 'pve',
      status: 'online',
      cpuPercent: 3.46,
      cpuCores: 32,
      memBytes: 80119304192, // 80.12 GB
      maxMemBytes: 100410941440, // 100.41 GB
      diskBytes: 34240208896, // 34.24 GB
      maxDiskBytes: 100861726720, // 100.86 GB
      uptimeSeconds: 6281676, // ~72.7 days
      loadAverage: [2.15, 1.84, 1.62],
      release: '8.4',
      version: '8.4.19',
      unbackedUpTotal: 21,
    },
  ];
}

// Real Storages matching user's clusters
function createDefaultStorages(): ProxmoxStorage[] {
  return [
    {
      id: 'storage/informatika/local-lvm',
      storage: 'local-lvm',
      node: 'informatika',
      plugintype: 'lvmthin',
      content: 'images,rootdir',
      sizeBytes: 1840000000000,
      usageBytes: 0,
      shared: false,
      status: 'online',
    },
    {
      id: 'storage/informatika/local',
      storage: 'local',
      node: 'informatika',
      plugintype: 'dir',
      content: 'backup,import,iso,vztmpl',
      sizeBytes: 100861726720,
      usageBytes: 17207816192,
      shared: false,
      status: 'online',
    },
    {
      id: 'storage/informatika/Hardisk2',
      storage: 'Hardisk2',
      node: 'informatika',
      plugintype: 'lvmthin',
      content: 'images',
      sizeBytes: 1970000000000,
      usageBytes: 84100000000,
      shared: false,
      status: 'online',
    },
    {
      id: 'storage/informatika/Hardisk3',
      storage: 'Hardisk3',
      node: 'informatika',
      plugintype: 'lvmthin',
      content: 'images',
      sizeBytes: 1970000000000,
      usageBytes: 0,
      shared: false,
      status: 'online',
    },
    {
      id: 'storage/informatika/Hardisk4',
      storage: 'Hardisk4',
      node: 'informatika',
      plugintype: 'lvmthin',
      content: 'images',
      sizeBytes: 1970000000000,
      usageBytes: 0,
      shared: false,
      status: 'online',
    },
    {
      id: 'storage/pve/local',
      storage: 'local',
      node: 'pve',
      plugintype: 'dir',
      content: 'backup,import,iso,vztmpl',
      sizeBytes: 100861726720,
      usageBytes: 34240208896,
      shared: false,
      status: 'online',
    },
    {
      id: 'storage/pve/local-lvm',
      storage: 'local-lvm',
      node: 'pve',
      plugintype: 'lvmthin',
      content: 'images,rootdir',
      sizeBytes: 23350000000000,
      usageBytes: 628000000000,
      shared: false,
      status: 'online',
    },
  ];
}

// Real VMs matching user's Proxmox exporter output
function createDefaultVms(): ProxmoxVm[] {
  return [
    // ---------------- Node: informatika (6 guests) ----------------
    {
      vmid: 100,
      name: 'DAS-WAF-X',
      type: 'qemu',
      node: 'informatika',
      status: 'running',
      cpuPercent: 0.95,
      maxCpu: 4,
      memBytes: 3010000000,
      maxMemBytes: 4720000000,
      diskBytes: 85000000000,
      maxDiskBytes: 4290000000000,
      netInBytes: 147000000000,
      netOutBytes: 362000000000,
      uptimeSeconds: 2422801,
      tags: '192.168.14.10',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 101,
      name: 'Informatika-LMS',
      type: 'qemu',
      node: 'informatika',
      status: 'running',
      cpuPercent: 1.45,
      maxCpu: 4,
      memBytes: 3740000000,
      maxMemBytes: 4190000000,
      diskBytes: 42000000000,
      maxDiskBytes: 107000000000,
      netInBytes: 2100000000,
      netOutBytes: 1580000000,
      uptimeSeconds: 3125528,
      tags: 'zabbix192.168.14.11',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 102,
      name: 'LMS-Informatika',
      type: 'qemu',
      node: 'informatika',
      status: 'running',
      cpuPercent: 0.88,
      maxCpu: 4,
      memBytes: 3470000000,
      maxMemBytes: 4190000000,
      diskBytes: 58000000000,
      maxDiskBytes: 214000000000,
      netInBytes: 2550000000,
      netOutBytes: 143000000,
      uptimeSeconds: 3107908,
      tags: 'lms-192.168.14.12',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 103,
      name: 'scedulesystem',
      type: 'qemu',
      node: 'informatika',
      status: 'running',
      cpuPercent: 0.62,
      maxCpu: 4,
      memBytes: 2980000000,
      maxMemBytes: 4190000000,
      diskBytes: 24000000000,
      maxDiskBytes: 107000000000,
      netInBytes: 2340000000,
      netOutBytes: 57000000,
      uptimeSeconds: 3105380,
      tags: 'penjadwalan-192.168.14.13',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 104,
      name: 'VPN-OPNsense',
      type: 'qemu',
      node: 'informatika',
      status: 'stopped',
      cpuPercent: 0,
      maxCpu: 4,
      memBytes: 0,
      maxMemBytes: 6290000000,
      diskBytes: 14000000000,
      maxDiskBytes: 107000000000,
      netInBytes: 0,
      netOutBytes: 0,
      uptimeSeconds: 0,
      tags: '192.168.14.14',
      onboot: false,
      notBackedUp: true,
    },
    {
      vmid: 105,
      name: 'SistemInformasiKelulusan',
      type: 'qemu',
      node: 'informatika',
      status: 'running',
      cpuPercent: 1.15,
      maxCpu: 4,
      memBytes: 2780000000,
      maxMemBytes: 6290000000,
      diskBytes: 65000000000,
      maxDiskBytes: 1070000000000,
      netInBytes: 1590000000,
      netOutBytes: 475000000,
      uptimeSeconds: 947948,
      tags: '192.168.14.15',
      onboot: true,
      notBackedUp: true,
    },

    // ---------------- Node: pve (21 guests) ----------------
    {
      vmid: 100,
      name: 'Grafana',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 2.85,
      maxCpu: 8,
      memBytes: 3740000000,
      maxMemBytes: 4294967296,
      diskBytes: 22000000000,
      maxDiskBytes: 50000000000,
      netInBytes: 8400000000,
      netOutBytes: 6200000000,
      uptimeSeconds: 4280000,
      tags: '192.168.77.30',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 101,
      name: 'OJS',
      type: 'qemu',
      node: 'pve',
      status: 'stopped',
      cpuPercent: 0,
      maxCpu: 12,
      memBytes: 0,
      maxMemBytes: 8589934592,
      diskBytes: 45000000000,
      maxDiskBytes: 150000000000,
      netInBytes: 0,
      netOutBytes: 0,
      uptimeSeconds: 0,
      tags: '192.168.77.31',
      onboot: false,
      notBackedUp: true,
    },
    {
      vmid: 102,
      name: 'A-Panel',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 4.12,
      maxCpu: 8,
      memBytes: 4100000000,
      maxMemBytes: 4720000000,
      diskBytes: 38000000000,
      maxDiskBytes: 80000000000,
      netInBytes: 12500000000,
      netOutBytes: 9800000000,
      uptimeSeconds: 5890000,
      tags: '192.168.77.32',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 103,
      name: 'ReverseProxy',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 3.80,
      maxCpu: 8,
      memBytes: 4900000000,
      maxMemBytes: 6290000000,
      diskBytes: 28000000000,
      maxDiskBytes: 60000000000,
      netInBytes: 48000000000,
      netOutBytes: 45000000000,
      uptimeSeconds: 6100000,
      tags: '192.168.77.77',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 104,
      name: 'FakultasTeknik',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 2.20,
      maxCpu: 8,
      memBytes: 4200000000,
      maxMemBytes: 6290000000,
      diskBytes: 48000000000,
      maxDiskBytes: 120000000000,
      netInBytes: 3400000000,
      netOutBytes: 2800000000,
      uptimeSeconds: 3420000,
      tags: 'website_fakultas_ekonomi_192.168.77.40',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 105,
      name: 'ServerScanningMalware',
      type: 'qemu',
      node: 'pve',
      status: 'stopped',
      cpuPercent: 0,
      maxCpu: 8,
      memBytes: 0,
      maxMemBytes: 8589934592,
      diskBytes: 60000000000,
      maxDiskBytes: 100000000000,
      netInBytes: 0,
      netOutBytes: 0,
      uptimeSeconds: 0,
      tags: 'website_fakultas_teknik_192.168.77.41',
      onboot: false,
      notBackedUp: true,
    },
    {
      vmid: 106,
      name: 'FakultasHukum',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.45,
      maxCpu: 4,
      memBytes: 2800000000,
      maxMemBytes: 4294967296,
      diskBytes: 32000000000,
      maxDiskBytes: 80000000000,
      netInBytes: 1800000000,
      netOutBytes: 1200000000,
      uptimeSeconds: 4120000,
      tags: 'website-hukum-192.168.77.42',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 107,
      name: 'FKIP',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.60,
      maxCpu: 4,
      memBytes: 3100000000,
      maxMemBytes: 4294967296,
      diskBytes: 35000000000,
      maxDiskBytes: 80000000000,
      netInBytes: 2200000000,
      netOutBytes: 1900000000,
      uptimeSeconds: 4120000,
      tags: 'website_fkip_192.168.77.43',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 108,
      name: 'faperta',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.10,
      maxCpu: 4,
      memBytes: 2400000000,
      maxMemBytes: 4294967296,
      diskBytes: 28000000000,
      maxDiskBytes: 60000000000,
      netInBytes: 1400000000,
      netOutBytes: 1100000000,
      uptimeSeconds: 3890000,
      tags: 'website_faperta_192.168.77.44',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 109,
      name: 'fisip',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.35,
      maxCpu: 4,
      memBytes: 2700000000,
      maxMemBytes: 4294967296,
      diskBytes: 30000000000,
      maxDiskBytes: 60000000000,
      netInBytes: 1600000000,
      netOutBytes: 1300000000,
      uptimeSeconds: 3890000,
      tags: 'website_fisip_192.168.77.45',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 110,
      name: 'SafeLink',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 2.10,
      maxCpu: 4,
      memBytes: 2900000000,
      maxMemBytes: 4294967296,
      diskBytes: 22000000000,
      maxDiskBytes: 50000000000,
      netInBytes: 4500000000,
      netOutBytes: 3900000000,
      uptimeSeconds: 5120000,
      tags: 'safelink-waf_192.168.77.46',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 111,
      name: 'PPG',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.25,
      maxCpu: 4,
      memBytes: 2600000000,
      maxMemBytes: 4294967296,
      diskBytes: 26000000000,
      maxDiskBytes: 60000000000,
      netInBytes: 1100000000,
      netOutBytes: 900000000,
      uptimeSeconds: 3450000,
      tags: 'website_ppg_192.168.77.47',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 112,
      name: 'HelpdeskUnmus',
      type: 'qemu',
      node: 'pve',
      status: 'stopped',
      cpuPercent: 0,
      maxCpu: 4,
      memBytes: 0,
      maxMemBytes: 4294967296,
      diskBytes: 20000000000,
      maxDiskBytes: 50000000000,
      netInBytes: 0,
      netOutBytes: 0,
      uptimeSeconds: 0,
      tags: 'helpdesk-unmus-192.168.77.48',
      onboot: false,
      notBackedUp: true,
    },
    {
      vmid: 113,
      name: 'JadwalLabTI',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.70,
      maxCpu: 9,
      memBytes: 3400000000,
      maxMemBytes: 8589934592,
      diskBytes: 34000000000,
      maxDiskBytes: 80000000000,
      netInBytes: 2800000000,
      netOutBytes: 2400000000,
      uptimeSeconds: 4200000,
      tags: '192.168.77.49',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 114,
      name: 'ServerRPL',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.55,
      maxCpu: 4,
      memBytes: 2900000000,
      maxMemBytes: 4294967296,
      diskBytes: 30000000000,
      maxDiskBytes: 60000000000,
      netInBytes: 1900000000,
      netOutBytes: 1500000000,
      uptimeSeconds: 3100000,
      tags: 'rpl-192.168.77.50',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 115,
      name: 'wazuhunmus',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 4.85,
      maxCpu: 4,
      memBytes: 3800000000,
      maxMemBytes: 4294967296,
      diskBytes: 45000000000,
      maxDiskBytes: 100000000000,
      netInBytes: 14200000000,
      netOutBytes: 4500000000,
      uptimeSeconds: 5200000,
      tags: '192.168.77.51',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 116,
      name: 'PendaftaranHotspot',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.20,
      maxCpu: 4,
      memBytes: 2300000000,
      maxMemBytes: 4294967296,
      diskBytes: 22000000000,
      maxDiskBytes: 50000000000,
      netInBytes: 1100000000,
      netOutBytes: 850000000,
      uptimeSeconds: 2800000,
      tags: '192.168.77.52',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 117,
      name: 'NewFakultasTeknik',
      type: 'qemu',
      node: 'pve',
      status: 'stopped',
      cpuPercent: 0,
      maxCpu: 4,
      memBytes: 0,
      maxMemBytes: 4294967296,
      diskBytes: 24000000000,
      maxDiskBytes: 60000000000,
      netInBytes: 0,
      netOutBytes: 0,
      uptimeSeconds: 0,
      tags: '192.168.77.53-website-teknik-new',
      onboot: false,
      notBackedUp: true,
    },
    {
      vmid: 118,
      name: 'LapoanPengajaran',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.40,
      maxCpu: 4,
      memBytes: 2700000000,
      maxMemBytes: 4294967296,
      diskBytes: 25000000000,
      maxDiskBytes: 50000000000,
      netInBytes: 1300000000,
      netOutBytes: 950000000,
      uptimeSeconds: 3200000,
      tags: '192.168.77.54',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 119,
      name: 'LaporanKasFatek',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.10,
      maxCpu: 4,
      memBytes: 2100000000,
      maxMemBytes: 4294967296,
      diskBytes: 20000000000,
      maxDiskBytes: 50000000000,
      netInBytes: 890000000,
      netOutBytes: 640000000,
      uptimeSeconds: 2900000,
      tags: '192.168.77.55',
      onboot: true,
      notBackedUp: true,
    },
    {
      vmid: 120,
      name: 'TeknikInformatika',
      type: 'qemu',
      node: 'pve',
      status: 'running',
      cpuPercent: 1.80,
      maxCpu: 4,
      memBytes: 3100000000,
      maxMemBytes: 4294967296,
      diskBytes: 28000000000,
      maxDiskBytes: 60000000000,
      netInBytes: 1650000000,
      netOutBytes: 1250000000,
      uptimeSeconds: 3400000,
      tags: '192.168.77.56',
      onboot: true,
      notBackedUp: true,
    },
  ];
}

let storedNodes: ProxmoxNode[] = createDefaultNodes();
let storedVms: ProxmoxVm[] = createDefaultVms();
let storedStorages: ProxmoxStorage[] = createDefaultStorages();

export function getAllStorages(): ProxmoxStorage[] {
  return [...storedStorages];
}

// Helper to extract node key like 'pve-node-01'
export function extractNodeKey(nodeName: string): string {
  const match = nodeName.match(/(pve-node-\d+|[a-zA-Z0-9_-]+)/);
  return match ? match[1] : nodeName;
}

// ----------------------------------------------------
// NODE (HOST SERVER) CRUD
// ----------------------------------------------------

export function getAllNodes(): ProxmoxNode[] {
  return [...storedNodes];
}

export function getNodeByName(name: string): ProxmoxNode | undefined {
  const cleanTarget = extractNodeKey(name).toLowerCase();
  return storedNodes.find(
    (n) => extractNodeKey(n.name).toLowerCase() === cleanTarget || n.name.toLowerCase() === name.toLowerCase()
  );
}

export interface CreateNodeInput {
  name: string;
  hardwareSpec?: string;
  status?: 'online' | 'offline';
  cpuCores: number;
  cpuPercent?: number;
  maxMemGb: number;
  maxDiskGb: number;
}

export function createNode(input: CreateNodeInput): ProxmoxNode {
  const existing = getNodeByName(input.name);
  if (existing) {
    throw new Error(`Node with name or key "${input.name}" already exists`);
  }

  const fullName = input.hardwareSpec
    ? `${input.name} (${input.hardwareSpec})`
    : input.name;

  const maxMemBytes = Math.max(1, input.maxMemGb) * 1024 * 1024 * 1024;
  const maxDiskBytes = Math.max(1, input.maxDiskGb) * 1024 * 1024 * 1024;

  const newNode: ProxmoxNode = {
    name: fullName,
    status: input.status || 'online',
    cpuPercent: input.cpuPercent ?? 12.0,
    cpuCores: Number(input.cpuCores) || 16,
    memBytes: Math.floor(maxMemBytes * 0.25),
    maxMemBytes,
    diskBytes: Math.floor(maxDiskBytes * 0.2),
    maxDiskBytes,
    uptimeSeconds: 3600,
    loadAverage: [0.85, 0.65, 0.45],
  };

  storedNodes.push(newNode);
  recordEventFeed('proxmox', 'NODE_CREATED', `Hypervisor host server ${input.name} added (${newNode.cpuCores} cores, ${input.maxMemGb} GB RAM)`);
  return newNode;
}

export function updateNode(targetName: string, updates: Partial<ProxmoxNode> & { maxMemGb?: number; maxDiskGb?: number }): ProxmoxNode {
  const index = storedNodes.findIndex((n) => {
    return extractNodeKey(n.name).toLowerCase() === extractNodeKey(targetName).toLowerCase() || n.name === targetName;
  });

  if (index === -1) {
    throw new Error(`Node "${targetName}" not found`);
  }

  const current = storedNodes[index];
  const maxMemBytes = updates.maxMemGb ? updates.maxMemGb * 1024 * 1024 * 1024 : (updates.maxMemBytes ?? current.maxMemBytes);
  const maxDiskBytes = updates.maxDiskGb ? updates.maxDiskGb * 1024 * 1024 * 1024 : (updates.maxDiskBytes ?? current.maxDiskBytes);

  const updated: ProxmoxNode = {
    ...current,
    ...updates,
    maxMemBytes,
    maxDiskBytes,
    memBytes: Math.min(current.memBytes, maxMemBytes),
    diskBytes: Math.min(current.diskBytes, maxDiskBytes),
  };

  storedNodes[index] = updated;
  recordEventFeed('proxmox', 'NODE_UPDATED', `Hypervisor host server ${targetName} updated (status: ${updated.status})`);
  return updated;
}

export function deleteNode(targetName: string): boolean {
  const nodeKey = extractNodeKey(targetName).toLowerCase();
  const index = storedNodes.findIndex((n) => extractNodeKey(n.name).toLowerCase() === nodeKey);

  if (index === -1) {
    throw new Error(`Node "${targetName}" not found`);
  }

  // Check if any VM is hosted on this node
  const activeVmsOnNode = storedVms.filter((v) => extractNodeKey(v.node).toLowerCase() === nodeKey);
  if (activeVmsOnNode.length > 0) {
    // Reassign VMs to another available node if possible, or warn
    const otherNode = storedNodes.find((n) => extractNodeKey(n.name).toLowerCase() !== nodeKey);
    if (otherNode) {
      const otherKey = extractNodeKey(otherNode.name);
      activeVmsOnNode.forEach((vm) => {
        vm.node = otherKey;
      });
      recordEventFeed('proxmox', 'VMS_EVACUATED', `${activeVmsOnNode.length} VMs evacuated from ${targetName} to ${otherKey}`);
    }
  }

  const [removed] = storedNodes.splice(index, 1);
  recordEventFeed('proxmox', 'NODE_DELETED', `Hypervisor host server ${removed.name} removed from cluster`);
  return true;
}

// ----------------------------------------------------
// VIRTUAL MACHINE / LXC CONTAINER CRUD
// ----------------------------------------------------

export function getAllVms(): ProxmoxVm[] {
  return [...storedVms];
}

export function getVmById(vmid: number): ProxmoxVm | undefined {
  return storedVms.find((v) => v.vmid === Number(vmid));
}

export interface CreateVmInput {
  vmid?: number;
  name: string;
  type: 'qemu' | 'lxc';
  node: string;
  status?: 'running' | 'stopped';
  cpuCores: number;
  cpuPercent?: number;
  ramMb: number;
  diskGb: number;
}

export function createVm(input: CreateVmInput): ProxmoxVm {
  let vmid = Number(input.vmid);
  if (!vmid || isNaN(vmid)) {
    // Generate next available VMID
    const existingIds = storedVms.map((v) => v.vmid);
    vmid = Math.max(...existingIds, 100) + 1;
  } else if (getVmById(vmid)) {
    throw new Error(`VMID ${vmid} already in use`);
  }

  const maxMemBytes = Math.max(128, input.ramMb) * 1024 * 1024;
  const maxDiskBytes = Math.max(1, input.diskGb) * 1024 * 1024 * 1024;
  const isRunning = input.status === 'running' || !input.status;

  const newVm: ProxmoxVm = {
    vmid,
    name: input.name.trim() || `${input.type}-${vmid}`,
    type: input.type === 'lxc' ? 'lxc' : 'qemu',
    node: extractNodeKey(input.node),
    status: isRunning ? 'running' : 'stopped',
    cpuPercent: isRunning ? (input.cpuPercent ?? 12.5) : 0,
    maxCpu: Number(input.cpuCores) || 2,
    memBytes: isRunning ? Math.floor(maxMemBytes * 0.4) : 0,
    maxMemBytes,
    diskBytes: Math.floor(maxDiskBytes * 0.3),
    maxDiskBytes,
    netInBytes: isRunning ? 50000000 : 0,
    netOutBytes: isRunning ? 40000000 : 0,
    uptimeSeconds: isRunning ? 1800 : 0,
  };

  storedVms.push(newVm);
  recordEventFeed(
    'proxmox',
    'VM_CREATED',
    `Created ${newVm.type.toUpperCase()} #${newVm.vmid} (${newVm.name}) on ${newVm.node}`
  );
  return newVm;
}

export function updateVm(vmid: number, updates: Partial<ProxmoxVm> & { ramMb?: number; diskGb?: number }): ProxmoxVm {
  const index = storedVms.findIndex((v) => v.vmid === Number(vmid));
  if (index === -1) {
    throw new Error(`VM #${vmid} not found`);
  }

  const current = storedVms[index];
  const maxMemBytes = updates.ramMb ? updates.ramMb * 1024 * 1024 : (updates.maxMemBytes ?? current.maxMemBytes);
  const maxDiskBytes = updates.diskGb ? updates.diskGb * 1024 * 1024 * 1024 : (updates.maxDiskBytes ?? current.maxDiskBytes);

  let targetNode = current.node;
  if (updates.node && updates.node !== current.node) {
    targetNode = extractNodeKey(updates.node);
    recordEventFeed(
      'proxmox',
      'VM_MIGRATED',
      `VM #${vmid} (${current.name}) live-migrated from ${current.node} to ${targetNode}`
    );
  }

  const updated: ProxmoxVm = {
    ...current,
    ...updates,
    node: targetNode,
    maxMemBytes,
    maxDiskBytes,
  };

  storedVms[index] = updated;
  recordEventFeed('proxmox', 'VM_UPDATED', `Config updated for VM #${vmid} (${updated.name})`);
  return updated;
}

export function setVmPower(vmid: number, action: 'start' | 'stop' | 'restart'): ProxmoxVm {
  const index = storedVms.findIndex((v) => v.vmid === Number(vmid));
  if (index === -1) {
    throw new Error(`VM #${vmid} not found`);
  }

  const current = storedVms[index];
  if (action === 'start') {
    current.status = 'running';
    current.cpuPercent = 15.4;
    current.memBytes = Math.floor(current.maxMemBytes * 0.45);
    current.uptimeSeconds = 60;
    recordEventFeed('proxmox', 'VM_STARTED', `VM #${vmid} (${current.name}) powered on`);
  } else if (action === 'stop') {
    current.status = 'stopped';
    current.cpuPercent = 0;
    current.memBytes = 0;
    current.uptimeSeconds = 0;
    recordEventFeed('proxmox', 'VM_STOPPED', `VM #${vmid} (${current.name}) gracefully shut down`);
  } else if (action === 'restart') {
    current.status = 'running';
    current.cpuPercent = 22.1;
    current.uptimeSeconds = 10;
    recordEventFeed('proxmox', 'VM_RESTARTED', `VM #${vmid} (${current.name}) rebooted`);
  }

  return current;
}

export function deleteVm(vmid: number): boolean {
  const index = storedVms.findIndex((v) => v.vmid === Number(vmid));
  if (index === -1) {
    throw new Error(`VM #${vmid} not found`);
  }

  const [removed] = storedVms.splice(index, 1);
  recordEventFeed(
    'proxmox',
    'VM_DELETED',
    `Destroyed ${removed.type.toUpperCase()} #${removed.vmid} (${removed.name}) from ${removed.node}`
  );
  return true;
}

export function resetInventoryToDefaults(): void {
  storedNodes = createDefaultNodes();
  storedVms = createDefaultVms();
  recordEventFeed('proxmox', 'INVENTORY_RESET', 'Proxmox hypervisor inventory reset to default 4 nodes and 24 VMs');
}
