/**
 * CLI Tool to safely update MikroTik credentials in NetWatch SQLite Database
 * Uses Node.js 22 built-in `node:sqlite` (no external npm dependencies required).
 *
 * Usage:
 *   node scripts/update-mikrotik-creds.cjs <username> <password> [host_ip] [port]
 *
 * Example:
 *   node scripts/update-mikrotik-creds.cjs netwatch "@1Qaz2wsx" 192.168.5.1 80
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
    const row = db.prepare("SELECT * FROM data_sources WHERE id = 'ds-mikrotik-gw'").get();
    let creds = {};
    try { creds = JSON.parse(row.auth_credentials || '{}'); } catch {}
    console.log('----------------------------------------------------');
    console.log('📌 Konfigurasi MikroTik Saat Ini di Database SQLite:');
    console.log('----------------------------------------------------');
    console.log(`Host IP     : ${row.ip_address || '-'}`);
    console.log(`Port REST   : ${row.port || 80}`);
    console.log(`Username    : ${creds.username || '(belum disetel)'}`);
    console.log(`Password    : ${creds.password ? '****** (tersimpan)' : '(kosong)'}`);
    console.log('----------------------------------------------------');
    console.log('Cara Mengubah Kredensial:');
    console.log('  node scripts/update-mikrotik-creds.cjs <username> <password> [host_ip] [port]');
    console.log('Contoh:');
    console.log('  node scripts/update-mikrotik-creds.cjs netwatch "@1Qaz2wsx" 192.168.5.1 80');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Gagal membaca database:', err.message);
    process.exit(1);
  }
}

const newUsername = args[0];
const newPassword = args[1] !== undefined ? args[1] : '';
const newHost = args[2] || null;
const newPort = args[3] ? parseInt(args[3], 10) : null;

try {
  const db = new DatabaseSync(dbPath);

  // 1. Get current data source
  const row = db.prepare("SELECT * FROM data_sources WHERE id = 'ds-mikrotik-gw'").get();
  
  if (!row) {
    console.error("❌ Data source dengan id 'ds-mikrotik-gw' tidak ditemukan di database.");
    process.exit(1);
  }

  let existingCreds = {};
  try {
    existingCreds = JSON.parse(row.auth_credentials || '{}');
  } catch {}

  const updatedCreds = {
    ...existingCreds,
    username: newUsername,
    password: newPassword,
    snmpCommunity: existingCreds.snmpCommunity || 'public',
  };

  const effectiveHost = newHost || row.ip_address || '192.168.5.1';
  const effectivePort = newPort || row.port || 80;
  const effectiveEndpoint = `http://${effectiveHost}:${effectivePort}/rest`;

  // Update data_sources
  db.prepare(`
    UPDATE data_sources 
    SET auth_credentials = ?,
        ip_address = ?,
        port = ?,
        endpoint_url = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'ds-mikrotik-gw'
  `).run(
    JSON.stringify(updatedCreds),
    effectiveHost,
    effectivePort,
    effectiveEndpoint
  );

  // Sync to prometheus target instance_ip if mikrotik module
  try {
    db.prepare(`
      UPDATE prometheus_targets 
      SET instance_ip = ?,
          endpoint = 'http://192.168.77.30:9117/snmp?module=mikrotik&target=' || ?
      WHERE mapped_module = 'mikrotik' OR job = 'mikrotik'
    `).run(effectiveHost, effectiveHost);
  } catch {}

  console.log('----------------------------------------------------');
  console.log('✅ BERHASIL MEMPERBARUI KREDENSIAL MIKROTIK DI SQLITE!');
  console.log('----------------------------------------------------');
  console.log(`📌 Target ID   : ds-mikrotik-gw`);
  console.log(`📌 Host IP     : ${effectiveHost}`);
  console.log(`📌 Port REST   : ${effectivePort}`);
  console.log(`📌 Username    : ${newUsername}`);
  console.log(`📌 Password    : ${'*'.repeat(newPassword.length)} (${newPassword.length} karakter)`);
  console.log(`📌 Endpoint    : ${effectiveEndpoint}`);
  console.log('----------------------------------------------------');
  console.log('💡 Langkah selanjutnya:');
  console.log('   Jika menggunakan PM2 : pm2 restart netwatch-pro');
  console.log('   Jika manual          : jalankan npm run dev atau node dist/server.cjs');
  console.log('----------------------------------------------------');
} catch (err) {
  console.error('❌ Gagal memperbarui database SQLite:', err.message);
  process.exit(1);
}
