import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { AlertItem, CollectorStatus } from './types.js';
import { getConfig } from './config.js';

let dbInstance: Database | null = null;
let dbFilePath = './data/sentinel.sqlite';
let isSaving = false;

export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  const config = getConfig();
  dbFilePath = path.resolve(process.cwd(), config.storage.sqlitePath);

  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      dbInstance = new SQL.Database(fileBuffer);
      console.log(`[SQLite] Loaded existing database from ${dbFilePath}`);
    } catch (err) {
      console.warn(`[SQLite] Failed to load existing database file, creating fresh DB:`, err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
    console.log(`[SQLite] Initialized new in-memory SQLite database for ${dbFilePath}`);
  }

  // Create Schema
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS metrics_timeseries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      labels_json TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_query 
    ON metrics_timeseries(source, metric_name, timestamp);

    CREATE TABLE IF NOT EXISTS alerts_log (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      acknowledged INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS collector_status (
      source TEXT PRIMARY KEY,
      display_name TEXT,
      enabled INTEGER,
      is_live INTEGER,
      last_attempt INTEGER,
      last_success INTEGER,
      last_error TEXT,
      latency_ms INTEGER,
      item_count INTEGER,
      endpoint_url TEXT
    );

    CREATE TABLE IF NOT EXISTS event_feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details TEXT,
      timestamp INTEGER NOT NULL
    );
  `);

  saveDatabaseToDisk();

  // Periodic disk sync every 15s
  setInterval(() => {
    saveDatabaseToDisk();
  }, 15000);

  return dbInstance;
}

export function saveDatabaseToDisk(): void {
  if (!dbInstance || isSaving) return;
  isSaving = true;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('[SQLite] Error saving database to disk:', err);
  } finally {
    isSaving = false;
  }
}

export function recordMetric(
  source: string,
  metricName: string,
  value: number,
  labels?: Record<string, any>,
  timestamp: number = Date.now()
): void {
  if (!dbInstance) return;
  try {
    dbInstance.run(
      `INSERT INTO metrics_timeseries (source, metric_name, value, labels_json, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [source, metricName, value, labels ? JSON.stringify(labels) : null, timestamp]
    );
  } catch (err) {
    console.error('[SQLite] Error recording metric:', err);
  }
}

export function recordAlert(alert: AlertItem): void {
  if (!dbInstance) return;
  try {
    dbInstance.run(
      `INSERT OR REPLACE INTO alerts_log (id, source, severity, title, message, timestamp, acknowledged)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [alert.id, alert.source, alert.severity, alert.title, alert.message, alert.timestamp, alert.acknowledged ? 1 : 0]
    );
  } catch (err) {
    console.error('[SQLite] Error recording alert:', err);
  }
}

export function getRecentAlerts(limit: number = 50): AlertItem[] {
  if (!dbInstance) return [];
  try {
    const res = dbInstance.exec(
      `SELECT id, source, severity, title, message, timestamp, acknowledged 
       FROM alerts_log ORDER BY timestamp DESC LIMIT ${limit}`
    );
    if (!res || res.length === 0) return [];
    const rows = res[0].values;
    return rows.map((row) => ({
      id: String(row[0]),
      source: row[1] as any,
      severity: row[2] as any,
      title: String(row[3]),
      message: String(row[4]),
      timestamp: Number(row[5]),
      acknowledged: Boolean(row[6]),
    }));
  } catch (err) {
    console.error('[SQLite] Error fetching alerts:', err);
    return [];
  }
}

export function acknowledgeAlert(alertId: string): boolean {
  if (!dbInstance) return false;
  try {
    dbInstance.run(`UPDATE alerts_log SET acknowledged = 1 WHERE id = ?`, [alertId]);
    return true;
  } catch (err) {
    console.error('[SQLite] Error acknowledging alert:', err);
    return false;
  }
}

export function clearAlerts(): boolean {
  if (!dbInstance) return false;
  try {
    dbInstance.run(`DELETE FROM alerts_log`);
    return true;
  } catch (err) {
    console.error('[SQLite] Error clearing alerts:', err);
    return false;
  }
}

export function updateCollectorStatusInDb(status: CollectorStatus): void {
  if (!dbInstance) return;
  try {
    dbInstance.run(
      `INSERT OR REPLACE INTO collector_status 
       (source, display_name, enabled, is_live, last_attempt, last_success, last_error, latency_ms, item_count, endpoint_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        status.source,
        status.displayName,
        status.enabled ? 1 : 0,
        status.isLive ? 1 : 0,
        status.lastAttempt,
        status.lastSuccess,
        status.lastError,
        status.latencyMs,
        status.itemCount,
        status.endpointUrl,
      ]
    );
  } catch (err) {
    console.error('[SQLite] Error updating collector status in DB:', err);
  }
}

export function getMetricsHistory(
  source: string,
  metricName: string,
  fromTimestamp: number,
  limit: number = 200
): { timestamp: number; value: number }[] {
  if (!dbInstance) return [];
  try {
    const res = dbInstance.exec(
      `SELECT timestamp, value FROM metrics_timeseries 
       WHERE source = ? AND metric_name = ? AND timestamp >= ? 
       ORDER BY timestamp ASC LIMIT ?`,
      [source, metricName, fromTimestamp, limit]
    );
    if (!res || res.length === 0) return [];
    return res[0].values.map((r) => ({
      timestamp: Number(r[0]),
      value: Number(r[1]),
    }));
  } catch (err) {
    console.error('[SQLite] Error querying metrics history:', err);
    return [];
  }
}

export function recordEventFeed(source: string, eventType: string, details: string): void {
  if (!dbInstance) return;
  try {
    dbInstance.run(
      `INSERT INTO event_feed (source, event_type, details, timestamp) VALUES (?, ?, ?, ?)`,
      [source, eventType, details, Date.now()]
    );
  } catch (err) {
    console.error('[SQLite] Error recording event feed:', err);
  }
}

export function getRecentEvents(limit: number = 30): { id: number; source: string; eventType: string; details: string; timestamp: number }[] {
  if (!dbInstance) return [];
  try {
    const res = dbInstance.exec(`SELECT id, source, event_type, details, timestamp FROM event_feed ORDER BY timestamp DESC LIMIT ${limit}`);
    if (!res || res.length === 0) return [];
    return res[0].values.map((r) => ({
      id: Number(r[0]),
      source: String(r[1]),
      eventType: String(r[2]),
      details: String(r[3]),
      timestamp: Number(r[4]),
    }));
  } catch (err) {
    console.error('[SQLite] Error getting recent events:', err);
    return [];
  }
}

export function pruneOldMetrics(retainDays: number = 7): number {
  if (!dbInstance) return 0;
  try {
    const cutoff = Date.now() - retainDays * 24 * 60 * 60 * 1000;
    dbInstance.run(`DELETE FROM metrics_timeseries WHERE timestamp < ?`, [cutoff]);
    dbInstance.run(`DELETE FROM event_feed WHERE timestamp < ?`, [cutoff]);
    return 1;
  } catch (err) {
    console.error('[SQLite] Error pruning old metrics:', err);
    return 0;
  }
}

export function executeRawQuery(sql: string): { columns: string[]; values: any[][] } | null {
  if (!dbInstance) return null;
  try {
    const res = dbInstance.exec(sql);
    if (!res || res.length === 0) return { columns: [], values: [] };
    return {
      columns: res[0].columns,
      values: res[0].values,
    };
  } catch (err) {
    console.error('[SQLite] Raw query error:', err);
    throw err;
  }
}
