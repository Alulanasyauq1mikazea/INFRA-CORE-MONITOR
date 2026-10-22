/**
 * CLI Tool to safely update CrowdSec / WAF configuration in NetWatch SQLite Database
 * Uses Node.js 22 built-in `node:sqlite` (no external npm dependencies required).
 *
 * Usage:
 *   node scripts/update-waf-creds.cjs [host_ip] [metrics_port] [lapi_port] [api_key]
 *
 * Example:
 *   node scripts/update-waf-creds.cjs 192.168.14.10 6060 8080
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.join(process.cwd(), 'data', 'netwatch.db');

if (!fs.existsSync(dbPath)) {
  console.error(`❌ File database tidak ditemukan di: ${dbPath}`);
  console.error('Pastikan Anda menjalankan perintah ini dari direktori root proyek NetWatch (/var/www/netwatch).');
  process.exit(1);
}

// Arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  try {
    const db = new DatabaseSync(dbPath);
    const row = db.prepare("SELECT * FROM data_sources WHERE category = 'waf_crowdsec' LIMIT 1").get();
    let creds = {};
    try { creds = JSON.parse(row.auth_credentials || '{}'); } catch {}
    console.log('----------------------------------------------------');
    console.log('🛡️ Konfigurasi CrowdSec WAF Saat Ini di Database SQLite:');
    console.log('----------------------------------------------------');
    console.log(`Host IP       : ${row.ip_address || '-'}`);
    console.log(`Port Metrics  : ${row.port || 6060}`);
    console.log(`Endpoint URL  : ${row.endpoint_url || '-'}`);
    console.log(`Port LAPI     : ${creds.lapiPort || 8080}`);
    console.log(`LAPI URL      : ${creds.lapiUrl || `http://${row.ip_address || '127.0.0.1'}:8080`}`);
    console.log(`API Key       : ${creds.apiKey ? '****** (tersimpan)' : '(tidak ada/none)'}`);
    console.log('----------------------------------------------------');
    console.log('Cara Mengubah Konfigurasi WAF via CLI:');
    console.log('  node scripts/update-waf-creds.cjs <host_ip> [metrics_port] [lapi_port] [api_key]');
    console.log('Contoh:');
    console.log('  node scripts/update-waf-creds.cjs 192.168.14.10 6060 8080');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Gagal membaca database:', err.message);
    process.exit(1);
  }
}

const newHost = args[0];
const newMetricsPort = args[1] ? parseInt(args[1], 10) : 6060;
const newLapiPort = args[2] ? parseInt(args[2], 10) : 8080;
const newApiKey = args[3] || '';

try {
  const db = new DatabaseSync(dbPath);
  const existing = db.prepare("SELECT * FROM data_sources WHERE category = 'waf_crowdsec' LIMIT 1").get();
  
  if (!existing) {
    console.error('❌ Data source waf_crowdsec tidak ditemukan di tabel data_sources.');
    process.exit(1);
  }

  const endpointUrl = `http://${newHost}:${newMetricsPort}/metrics`;
  const lapiUrl = `http://${newHost}:${newLapiPort}`;
  const now = new Date().toISOString();

  let existingCreds = {};
  try { existingCreds = JSON.parse(existing.auth_credentials || '{}'); } catch {}
  
  const updatedCreds = {
    ...existingCreds,
    apiKey: newApiKey || existingCreds.apiKey || '',
    lapiUrl,
    lapiPort: String(newLapiPort),
  };

  db.prepare(`
    UPDATE data_sources
    SET ip_address = ?,
        port = ?,
        endpoint_url = ?,
        auth_credentials = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    newHost,
    newMetricsPort,
    endpointUrl,
    JSON.stringify(updatedCreds),
    now,
    existing.id
  );

  // Sync to prometheus_targets
  try {
    db.prepare(`
      UPDATE prometheus_targets
      SET instance_ip = ?,
          endpoint = ?,
          updated_at = ?
      WHERE module = 'waf'
    `).run(newHost, endpointUrl, now);
  } catch {}

  console.log('✅ Konfigurasi WAF CrowdSec berhasil diperbarui di SQLite:');
  console.log(`   Host IP      : ${newHost}`);
  console.log(`   Metrics Port : ${newMetricsPort} (${endpointUrl})`);
  console.log(`   LAPI Port    : ${newLapiPort} (${lapiUrl})`);
  console.log('\nSilakan restart PM2 jika NetWatch berjalan di background:');
  console.log('   pm2 restart netwatch-pro');
} catch (err) {
  console.error('❌ Terjadi kesalahan saat memperbarui database:', err.message);
  process.exit(1);
}
