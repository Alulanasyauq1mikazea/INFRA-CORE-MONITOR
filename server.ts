import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getConfig,
  updateConfig,
  loadConfiguration,
  getDataSources,
  addDataSource,
  updateDataSource,
  deleteDataSource,
  getDataSourceById,
} from './server/config.js';
import { initDatabase, getRecentAlerts, acknowledgeAlert, clearAlerts, executeRawQuery, getRecentEvents } from './server/db.js';
import { initSocketServer } from './server/socket.js';
import { startCollectorLoop, runAllCollectors, getLatestSnapshot, testEndpoint } from './server/collectors/manager.js';
import {
  getAllNodes,
  createNode,
  updateNode,
  deleteNode,
  getAllVms,
  getVmById,
  createVm,
  updateVm,
  setVmPower,
  deleteVm,
  resetInventoryToDefaults,
  getAllStorages,
} from './server/collectors/proxmoxStore.js';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite database
  await initDatabase();

  // Initialize Socket.io
  initSocketServer(server);

  // Start background collector polling
  startCollectorLoop();

  // ==========================================
  // REST API Routes
  // ==========================================

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'SentinelPulse Monitoring Hub',
      timestamp: Date.now(),
      uptime: process.uptime(),
    });
  });

  // Get full current telemetry snapshot
  const handleTelemetry = async (req: express.Request, res: express.Response) => {
    let snapshot = getLatestSnapshot();
    if (!snapshot) {
      snapshot = await runAllCollectors();
    }
    res.json(snapshot);
  };

  app.get('/api/telemetry', handleTelemetry);
  app.get('/api/telemetry/snapshot', handleTelemetry);

  // Force an immediate refresh
  app.post('/api/telemetry/refresh', async (req, res) => {
    try {
      const snapshot = await runAllCollectors();
      res.json(snapshot);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Configuration management
  app.get('/api/config', (req, res) => {
    const config = getConfig();
    res.json(config);
  });

  app.post('/api/config', (req, res) => {
    try {
      const updated = updateConfig(req.body);
      // Trigger instant collection cycle with new settings
      runAllCollectors();
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Test custom endpoint connection
  app.post('/api/test-endpoint', async (req, res) => {
    const { type, url, auth } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const result = await testEndpoint(type || 'generic', url, auth);
    res.json(result);
  });

  // ==========================================
  // Data Sources & Routing Management (CRUD)
  // ==========================================

  app.get('/api/datasources', (req, res) => {
    try {
      const sources = getDataSources();
      res.json(sources);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/datasources', async (req, res) => {
    try {
      const { name, type, targetDashboard, endpoint } = req.body;
      if (!name || !type || !endpoint) {
        return res.status(400).json({ error: 'Name, type, and endpoint are required fields' });
      }

      const created = addDataSource({
        name: req.body.name,
        type: req.body.type,
        targetDashboard: req.body.targetDashboard || 'overview',
        endpoint: req.body.endpoint,
        authType: req.body.authType || 'none',
        username: req.body.username || '',
        password: req.body.password || '',
        token: req.body.token || '',
        apiKey: req.body.apiKey || '',
        pollIntervalMs: Number(req.body.pollIntervalMs) || 4000,
        timeoutMs: Number(req.body.timeoutMs) || 5000,
        enabled: req.body.enabled !== undefined ? Boolean(req.body.enabled) : true,
        notes: req.body.notes || '',
      });

      // Run immediate background collection sweep
      runAllCollectors();

      res.status(201).json({ success: true, dataSource: created });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/datasources/:id', (req, res) => {
    try {
      const updated = updateDataSource(req.params.id, req.body);
      res.json({ success: true, dataSource: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/datasources/:id', (req, res) => {
    try {
      const ok = deleteDataSource(req.params.id);
      if (!ok) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      res.json({ success: true, id: req.params.id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/datasources/:id/toggle', (req, res) => {
    try {
      const source = getDataSourceById(req.params.id);
      if (!source) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      const updated = updateDataSource(req.params.id, { enabled: !source.enabled });
      res.json({ success: true, dataSource: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/datasources/:id/test', async (req, res) => {
    try {
      const source = getDataSourceById(req.params.id);
      if (!source) {
        return res.status(404).json({ error: 'Data source not found' });
      }

      const authPayload: any = {};
      if (source.authType === 'basic') {
        authPayload.username = source.username;
        authPayload.password = source.password;
      } else if (source.authType === 'bearer') {
        authPayload.token = source.token;
      } else if (source.authType === 'apiKey') {
        authPayload.apiKey = source.apiKey || source.token;
        authPayload.token = source.token;
      }

      const probe = await testEndpoint(source.type, source.endpoint, authPayload);

      // Persist the test result to the data source record
      const updated = updateDataSource(req.params.id, {
        lastTestedAt: Date.now(),
        lastStatus: probe.success ? 'online' : 'offline',
        lastLatencyMs: probe.latencyMs,
        lastError: probe.success ? null : probe.message,
      });

      res.json({ success: probe.success, result: probe, dataSource: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Alerts Management
  app.get('/api/alerts', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = getRecentAlerts(limit);
    res.json(alerts);
  });

  app.post('/api/alerts/:id/ack', (req, res) => {
    const ok = acknowledgeAlert(req.params.id);
    res.json({ success: ok });
  });

  app.delete('/api/alerts', (req, res) => {
    const ok = clearAlerts();
    res.json({ success: ok });
  });

  app.post('/api/alerts/clear', (req, res) => {
    const ok = clearAlerts();
    res.json({ success: ok });
  });

  // Event feed
  app.get('/api/events', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 30;
    const events = getRecentEvents(limit);
    res.json(events);
  });

  // ==========================================
  // Proxmox VE Inventory & Management (CRUD)
  // ==========================================
  
  // Nodes (Host Servers)
  app.get('/api/proxmox/nodes', (req, res) => {
    res.json(getAllNodes());
  });

  app.post('/api/proxmox/nodes', async (req, res) => {
    try {
      const node = createNode(req.body);
      const snapshot = await runAllCollectors();
      res.status(201).json({ success: true, node, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/proxmox/nodes/:name', async (req, res) => {
    try {
      const node = updateNode(req.params.name, req.body);
      const snapshot = await runAllCollectors();
      res.json({ success: true, node, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/proxmox/nodes/:name', async (req, res) => {
    try {
      deleteNode(req.params.name);
      const snapshot = await runAllCollectors();
      res.json({ success: true, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Storages (ZFS, LVM, Directory, etc.)
  app.get('/api/proxmox/storages', (req, res) => {
    res.json(getAllStorages());
  });

  // VMs & LXC Containers (Guests)
  app.get('/api/proxmox/vms', (req, res) => {
    res.json(getAllVms());
  });

  app.post('/api/proxmox/vms', async (req, res) => {
    try {
      const vm = createVm(req.body);
      const snapshot = await runAllCollectors();
      res.status(201).json({ success: true, vm, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/proxmox/vms/:vmid', async (req, res) => {
    try {
      const vm = updateVm(Number(req.params.vmid), req.body);
      const snapshot = await runAllCollectors();
      res.json({ success: true, vm, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/proxmox/vms/:vmid/power', async (req, res) => {
    try {
      const { action } = req.body;
      if (!action || !['start', 'stop', 'restart'].includes(action)) {
        return res.status(400).json({ error: 'Action must be start, stop, or restart' });
      }
      const vm = setVmPower(Number(req.params.vmid), action);
      const snapshot = await runAllCollectors();
      res.json({ success: true, vm, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/proxmox/vms/:vmid', async (req, res) => {
    try {
      deleteVm(Number(req.params.vmid));
      const snapshot = await runAllCollectors();
      res.json({ success: true, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/proxmox/reset', async (req, res) => {
    try {
      resetInventoryToDefaults();
      const snapshot = await runAllCollectors();
      res.json({ success: true, snapshot });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Raw SQLite Inspector / Query
  app.post('/api/sqlite/query', (req, res) => {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query string required' });
    }

    // Safety: allow SELECT only for raw query viewer
    const trimmed = sql.trim().toLowerCase();
    if (!trimmed.startsWith('select') && !trimmed.startsWith('pragma') && !trimmed.startsWith('explain')) {
      return res.status(403).json({ error: 'Only read-only queries (SELECT / PRAGMA) are allowed via raw query API.' });
    }

    try {
      const result = executeRawQuery(sql);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // Vite Integration (Dev vs Prod)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SentinelPulse] Server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[SentinelPulse] Fatal bootstrap error:', err);
});
