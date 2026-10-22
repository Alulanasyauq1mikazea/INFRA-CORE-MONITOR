import { PrometheusTarget } from '../types';

export interface AuditLogItem {
  id: string;
  targetId?: string;
  action: string;
  operator?: string;
  details: string;
  timestamp: string;
}

let lastEmittedTargetsJson = '';
const listeners: Set<(targets: PrometheusTarget[]) => void> = new Set();
const auditListeners: Set<(logs: AuditLogItem[]) => void> = new Set();
let pollingTimer: any = null;

async function fetchHubTargets(): Promise<PrometheusTarget[]> {
  try {
    const res = await fetch('/api/hub/targets', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.targets)) {
        return data.targets;
      }
    }
  } catch (err) {
    // Attempt fallback from localStorage or fallback-sync endpoint
  }

  try {
    const local = localStorage.getItem('netwatch_local_targets');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return [];
}

async function fetchHubAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const res = await fetch('/api/hub/audit-logs?limit=30', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        return data.logs;
      }
    }
  } catch {}
  return [];
}

function notifyTargetListeners(targets: PrometheusTarget[]) {
  const currentJson = JSON.stringify(targets);
  if (currentJson === lastEmittedTargetsJson) return;
  lastEmittedTargetsJson = currentJson;

  try {
    localStorage.setItem('netwatch_local_targets', currentJson);
  } catch {}

  listeners.forEach((fn) => {
    try {
      fn(targets);
    } catch (e) {
      console.warn('[HubService] Listener error:', e);
    }
  });
}

function notifyAuditListeners(logs: AuditLogItem[]) {
  auditListeners.forEach((fn) => {
    try {
      fn(logs);
    } catch (e) {
      console.warn('[HubService] Audit listener error:', e);
    }
  });
}

function startPollingIfNeeded() {
  if (pollingTimer) return;
  pollingTimer = setInterval(async () => {
    if (listeners.size > 0) {
      const targets = await fetchHubTargets();
      if (targets.length > 0) {
        notifyTargetListeners(targets);
      }
    }
    if (auditListeners.size > 0) {
      const logs = await fetchHubAuditLogs();
      if (logs.length > 0) {
        notifyAuditListeners(logs);
      }
    }
  }, 4000);
}

/**
 * Real-time subscription to Prometheus targets stored in Centralized Data Hub.
 */
export function subscribeToTargets(
  onUpdate: (targets: PrometheusTarget[]) => void,
  onError?: (err: Error) => void
): () => void {
  listeners.add(onUpdate);

  // Initial immediate fetch
  fetchHubTargets()
    .then((targets) => {
      if (targets.length > 0) {
        onUpdate(targets);
      }
    })
    .catch((err) => {
      if (onError) onError(err);
    });

  startPollingIfNeeded();

  return () => {
    listeners.delete(onUpdate);
    if (listeners.size === 0 && auditListeners.size === 0 && pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };
}

/**
 * Save multiple targets to Hub atomically.
 */
export async function saveTargetsBatchToDb(
  targets: PrometheusTarget[],
  auditActionName: string = 'batch_update_targets',
  auditDetails?: string
): Promise<void> {
  if (!targets || targets.length === 0) return;

  const res = await fetch('/api/hub/targets/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user': localStorage.getItem('omniguard_user') || 'Admin',
    },
    body: JSON.stringify({ targets }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal batch update' }));
    throw new Error(err.error || 'Gagal menyimpan target batch');
  }

  notifyTargetListeners(targets);
}

/**
 * Seed initial targets into Hub if empty.
 */
export async function seedInitialTargetsIfEmpty(defaultTargets: PrometheusTarget[]): Promise<boolean> {
  try {
    const current = await fetchHubTargets();
    if (current.length === 0 && defaultTargets.length > 0) {
      await saveTargetsBatchToDb(defaultTargets, 'seed_initial_targets', `Inisialisasi ${defaultTargets.length} target Prometheus`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[HubService] Seed check warning:', err);
    return false;
  }
}

/**
 * Update target data in Centralized Data Hub.
 */
export async function updateTargetInDb(
  targetId: string,
  data: Partial<PrometheusTarget>,
  auditActionName?: string,
  auditDetails?: string
): Promise<void> {
  const res = await fetch(`/api/hub/targets/${encodeURIComponent(targetId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user': localStorage.getItem('omniguard_user') || 'Admin',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal memperbarui target' }));
    throw new Error(err.error || 'Gagal update target');
  }

  const result = await res.json();
  if (result.target) {
    const updatedList = await fetchHubTargets();
    notifyTargetListeners(updatedList);
  }
}

/**
 * Save new target to Centralized Data Hub.
 */
export async function saveTargetToDb(target: PrometheusTarget): Promise<void> {
  const res = await fetch('/api/hub/targets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user': localStorage.getItem('omniguard_user') || 'Admin',
    },
    body: JSON.stringify(target),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal menambahkan target baru' }));
    throw new Error(err.error || 'Gagal menambahkan target');
  }

  const updatedList = await fetchHubTargets();
  notifyTargetListeners(updatedList);
}

/**
 * Delete a target from Centralized Data Hub.
 */
export async function deleteTargetFromDb(targetId: string, jobName?: string): Promise<void> {
  const res = await fetch(`/api/hub/targets/${encodeURIComponent(targetId)}`, {
    method: 'DELETE',
    headers: {
      'x-user': localStorage.getItem('omniguard_user') || 'Admin',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal menghapus target' }));
    throw new Error(err.error || 'Gagal menghapus target');
  }

  const updatedList = await fetchHubTargets();
  notifyTargetListeners(updatedList);
}

/**
 * Record an audit log entry.
 */
export async function logAuditAction(
  targetId: string,
  action: string,
  details: string
): Promise<void> {
  try {
    await fetch('/api/hub/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId,
        action,
        operator: localStorage.getItem('omniguard_user') || 'Admin',
        details,
      }),
    });
  } catch (err) {
    console.warn('[HubService] Audit log warning:', err);
  }
}

/**
 * Subscribe to recent audit logs.
 */
export function subscribeToAuditLogs(
  onUpdate: (logs: AuditLogItem[]) => void
): () => void {
  auditListeners.add(onUpdate);

  fetchHubAuditLogs().then((logs) => {
    if (logs.length > 0) {
      onUpdate(logs);
    }
  });

  startPollingIfNeeded();

  return () => {
    auditListeners.delete(onUpdate);
    if (listeners.size === 0 && auditListeners.size === 0 && pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };
}

/**
 * Test target connectivity live.
 */
export async function testTargetConnectivity(endpoint: string, instanceIp?: string): Promise<{
  reachable: boolean;
  httpStatus?: number;
  latencyMs: number;
  message: string;
}> {
  try {
    const res = await fetch('/api/hub/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, instanceIp }),
    });
    const data = await res.json();
    return {
      reachable: Boolean(data.reachable),
      httpStatus: data.httpStatus,
      latencyMs: data.latencyMs || 0,
      message: data.message || 'Respons target diterima',
    };
  } catch (err: any) {
    return {
      reachable: false,
      latencyMs: 0,
      message: err.message || 'Koneksi gagal atau waktu habis',
    };
  }
}

/**
 * Re-seed default 11 authentic Prometheus targets.
 */
export async function resetHubDefaultSeeds(): Promise<PrometheusTarget[]> {
  const res = await fetch('/api/hub/targets/reset-seed', {
    method: 'POST',
    headers: {
      'x-user': localStorage.getItem('omniguard_user') || 'Admin',
    },
  });
  if (!res.ok) {
    throw new Error('Gagal mereset target ke default');
  }
  const data = await res.json();
  if (Array.isArray(data.targets)) {
    notifyTargetListeners(data.targets);
    return data.targets;
  }
  return [];
}
