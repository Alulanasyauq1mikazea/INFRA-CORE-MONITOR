# NetWatch Pro (OmniGuard-Live)

**Enterprise Real-Time Network & Infrastructure Telemetry, MikroTik RouterOS Live Traffic Monitor & AI Cyber Defense System**

- **Repository**: [https://github.com/Alulanasyauq1mikazea/NetWach](https://github.com/Alulanasyauq1mikazea/NetWach)
- **Tech Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Express.js Backend + Google Gemini AI Analytics + Recharts + Leaflet Map
- **Deployment Target**: Node.js 20/22 LTS | Linux (Ubuntu / Debian Server) | Proxmox VE | PM2 / Systemd

---

## 📋 Daftar Isi

1. [Ringkasan Arsitektur & Fitur](#-ringkasan-arsitektur--fitur)
2. [Topologi Jaringan & Infrastruktur](#-topologi-jaringan--infrastruktur)
3. [Integrasi Real-Time MikroTik RouterOS](#-integrasi-real-time-mikrotik-routeros)
4. [Integrasi Proxmox VE 4-Node Cluster](#-integrasi-proxmox-ve-4-node-cluster)
5. [Integrasi CrowdSec WAF & GeoIP Threat Map](#-integrasi-crowdsec-waf--geoip-threat-map)
6. [Struktur Repositori](#-struktur-repositori)
7. [Prasyarat Sistem](#-prasyarat-sistem)
8. [Panduan Instalasi Cepat](#-panduan-instalasi-cepat)
   - [Opsi A: Instalasi Otomatis (setup.sh)](#opsi-a-instalasi-otomatis-rekomendasi)
   - [Opsi B: Instalasi Manual Step-by-Step](#opsi-b-instalasi-manual-step-by-step)
9. [Konfigurasi Lingkungan (.env)](#-konfigurasi-lingkungan-env)
10. [Instruksi Menjalankan Aplikasi](#-instruksi-menjalankan-aplikasi)
    - [Mode Pengembangan (Development)](#mode-pengembangan-development)
    - [Mode Produksi dengan PM2 (Rekomendasi)](#mode-produksi-dengan-pm2-rekomendasi)
    - [Mode Produksi dengan Systemd Service](#mode-produksi-dengan-systemd-service)
11. [Kredensial Default Login](#-kredensial-default-login)
12. [Pengujian & Validasi API](#-pengujian--validasi-api)
13. [Panduan Debugging & Solusi Masalah](#-panduan-debugging--solusi-masalah)
14. [Spesifikasi Dependensi](#-spesifikasi-dependensi)

---

## 🌟 Ringkasan Arsitektur & Fitur

- 🛰️ **MikroTik RouterOS Live Traffic (WinBox Precision)**: Sinkronisasi register internal `POST /rest/interface/monitor-traffic` secara langsung setiap detik untuk mendapatkan nilai `rx-bits-per-second`, `tx-bits-per-second`, dan laju `packets-per-second` yang 100% presisi dan identik dengan WinBox.
- 🖥️ **Proxmox VE 4-Node Cluster Live Telemetry**: Monitoring multi-node Proxmox (`PVE-Informatika (Master)`, `PVE-Server - Dekanat`, `PVE-Teknik (fatek)`, dan `PVE-Simlitabmas`) meliputi utilisasi CPU Cores, RAM realtime, kapasitas ZFS/LVM Storage Pool (`Hardisk2,3,4`, `local-lvm`), serta status VM/LXC guest dengan dukungan notasi ilmiah Prometheus exporter.
- 🛡️ **CrowdSec WAF & GeoIP Threat Map**: Visualisasi mitigasi ancaman LAPI (`http://192.168.77.77:8080`), pemetaan serangan global SQLi, XSS, Path Traversal, dan Brute Force secara real-time pada peta Leaflet interaktif.
- 🌐 **Website Uptime & SSL Certificate Monitor**: Pemantauan latensi (ms), HTTP response codes, status ketersediaan, dan sisa masa aktif sertifikat SSL pada domain universitas.
- 🤖 **AI Predictive Analytics (Google Gemini 2.5)**: Prediksi lonjakan trafik bandwidth, analisis anomali pola serangan, estimasi waktu kapasitas storage habis, dan rekomendasi audit keamanan otomatis.
- 🔔 **Multi-Channel Alerting**: Notifikasi instan via Telegram Bot dan SMTP Email ketika metrik kritis terlampaui.
- 📜 **Audit Log & InfluxDB Sync**: Pencatatan aktivitas operasional administrator, konfigurasi perangkat, dan sinkronisasi log terpusat.

---

## 🗺️ Topologi Jaringan & Infrastruktur

```text
                                  [ INTERNET GATEWAY ]
                                           │
                           [ MikroTik CCR1036-12G-4S ]
                        192.168.5.1 (REST API / Port 80)
                                           │
             ┌─────────────────────────────┼─────────────────────────────┐
             │                             │                             │
    [ Core Network ]              [ Monitoring VM ]              [ WAF / Security VM ]
      192.168.77.1                 192.168.77.30                  192.168.77.77
 (SNMP Exporter Target)       • Prometheus :9090             • CrowdSec LAPI :8080
                              • SNMP Exporter :9117          • Metrics Exporter :6060
                              • Node Exporter :9100          • Nginx Metrics :9113
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             │                                                           │
 [ PVE Node 1: Informatika ]                                 [ PVE Node 2: Dekanat ]
       192.168.14.222                                              192.168.77.29
  (ZFS Hardisk2,3,4, local-lvm)                                 (local-lvm 23.45 TB)
             │                                                           │
 [ PVE Node 3: Fatek (Teknik) ]                              [ PVE Node 4: Simlitabmas ]
       192.168.77.30 / 192.168.77.242                              192.168.77.99
       (local-lvm 17.93 TB)                                    (local-lvm 100.9 GB)
```

---

## 🛰️ Integrasi Real-Time MikroTik RouterOS

NetWatch Pro mendukung 2 metode penarikan metrik:

### 1. Mode RouterOS REST API (Rekomendasi Utama — 100% Persis WinBox)
Mengambil register kernel instan dari MikroTik RouterOS v7 via HTTP Basic Auth:

```bash
curl -u netwatch:26112012 -X POST "http://192.168.5.1/rest/interface/monitor-traffic" \
  -H "Content-Type: application/json" \
  -d '{"interface": "ether1_Internet", "once": ""}'
```

**Contoh Output Terverifikasi:**
```json
[
  {
    "name": "ether1_Internet",
    "rx-bits-per-second": "8918160",
    "tx-bits-per-second": "1056936",
    "rx-packets-per-second": "1122",
    "tx-packets-per-second": "509"
  }
]
```
*Hasil di NetWatch Pro: **8.92 Mbps (RX)** dan **1.06 Mbps (TX)** secara real-time.*

### 2. Mode Prometheus SNMP Exporter
Membaca counter 64-bit `ifHCInOctets` & `ifHCOutOctets` melalui Prometheus Exporter:

```bash
curl -s "http://192.168.77.30:9117/snmp?module=mikrotik&target=192.168.77.1"
```

---

## 🖥️ Integrasi Proxmox VE 4-Node Cluster

NetWatch Pro memonitor seluruh node Proxmox VE menggunakan Prometheus Proxmox Exporter (`pve-exporter` port `9221` atau proxy `server.ts`):

- **PVE-Informatika (Master)**: `192.168.14.222` (ZFS Pool `Hardisk2`, `Hardisk3`, `Hardisk4`, `local-lvm`, `local`)
- **PVE-Server - Dekanat**: `192.168.77.29` (`local-lvm` 23.45 TB)
- **PVE-Teknik (fatek)**: `192.168.77.242` / `192.168.77.30` (`local-lvm` 17.93 TB)
- **PVE-Simlitabmas**: `192.168.77.99` (`local-lvm` 100.9 GB)

Parsing metrik mendukung format bilangan floating-point eksponensial (`1.9583860736e+10` -> ~19.58 GB RAM) dan mendeteksi kondisi guest VM (`qemu/...`, `lxc/...`) secara dinamis.

---

## 🛡️ Integrasi CrowdSec WAF & GeoIP Threat Map

- **CrowdSec LAPI Endpoint**: `http://192.168.77.77:8080/v1/decisions`
- **Prometheus Metrics Endpoint**: `http://192.168.77.77:6060/metrics`
- **Tipe Serangan yang Dimonitor**:
  - `crowdsecurity/http-bf-wordpress_bf` (Brute Force Login)
  - `crowdsecurity/http-sqli-probing` (SQL Injection)
  - `crowdsecurity/http-xss-probing` (Cross-Site Scripting)
  - `crowdsecurity/http-path-traversal-probing` (Directory Traversal)
  - `crowdsecurity/http-crawl-non_statics` (Malicious Bot / Scraper)

---

## 📂 Struktur Repositori

```text
NetWach/
├── .env.example                 # Template variabel lingkungan sistem
├── package.json                 # Konfigurasi dependensi Node.js & scripts
├── setup.sh                     # Skrip otomatisasi instalasi Linux/macOS
├── tsconfig.json                # Konfigurasi TypeScript
├── vite.config.ts               # Konfigurasi bundler Vite & Tailwind v4
├── server.ts                    # Backend Express API & Proxy Server
├── index.html                   # HTML entry point
├── metadata.json                # Metadata platform AI Studio
└── src/
    ├── main.tsx                 # React DOM mount point
    ├── App.tsx                  # Root layout & route state manager
    ├── index.css                # Tailwind global stylesheet (@import "tailwindcss")
    ├── types.ts                 # Definisi tipe & interface TypeScript
    ├── data/
    │   ├── mockMetrics.ts       # Fallback dataset & skenario simulasi
    │   └── proxmoxClusterData.ts# Data baseline cluster Proxmox & VM inventory
    ├── utils/
    │   ├── apiHelpers.ts        # Helper request REST API & JWT handling
    │   ├── geoip.ts             # Resolusi koordinat IP dan negara
    │   ├── networkCalc.ts       # Kalkulasi format bandwidth (bps, Kbps, Mbps, Gbps)
    │   ├── prometheusParser.ts  # Parser metrik OpenMetrics Prometheus
    │   ├── pveTelemetrySchema.ts# Skema telemetri Proxmox VE
    │   └── worldMapData.ts      # GeoJSON koordinat serangan global
    └── components/
        ├── OverviewDashboard.tsx      # Dashboard utama rangkuman telemetri
        ├── ProxmoxClusterWidget.tsx   # Panel interaktif cluster Proxmox 4-node
        ├── MikroTikMonitor.tsx        # Panel RouterOS & live table interface
        ├── ServerVmMonitor.tsx        # Detail status Linux & guest VM Proxmox
        ├── WafMonitor.tsx             # Tabel mitigasi & daftar blokir WAF CrowdSec
        ├── GeoIpThreatMap.tsx         # Peta ancaman interaktif Leaflet
        ├── WebsiteMonitor.tsx         # Health check website & sertifikat SSL
        ├── AlertsAndNotify.tsx        # Konfigurasi notifikasi Telegram & Email
        ├── ApiSyncCenter.tsx          # Pengujian & sinkronisasi integrasi REST API
        ├── PrometheusGrafanaConfig.tsx# Generator config Prometheus & Grafana dashboard
        ├── PrometheusSchemaDictionary.tsx # Kamus metrik Prometheus lengkap
        ├── PrometheusTargetManager.tsx# Manajemen target scrape dinamis
        ├── PredictiveAnalytics.tsx    # Analisis prediksi AI Google Gemini
        ├── AuditLogViewer.tsx         # Log audit & query InfluxDB
        ├── BackupManager.tsx          # Manajemen file backup sistem
        ├── MonthlyReports.tsx         # Export laporan performa bulanan
        ├── TechDocsAndGuide.tsx       # Dokumentasi interaktif in-app
        ├── DeviceManager.tsx          # Manajemen inventaris perangkat jaringan
        ├── LoginPage.tsx              # Autentikasi Super Admin & Viewer
        ├── TwoFactorAuthModal.tsx     # Modal verifikasi 2FA
        ├── Navbar.tsx                 # Header navigasi & status bar
        ├── Sidebar.tsx                # Menu navigasi samping
        └── mikrotik/
            └── MikroTikLiveTrafficGraphPanel.tsx  # Panel grafik bandwidth real-time
```

---

## ⚙️ Prasyarat Sistem

| Komponen | Versi Minimal | Keterangan |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` (Disarankan **Node 20 LTS** atau **Node 22 LTS**) | Runtime JavaScript/TypeScript |
| **npm** atau **bun** | `>= 9.0.0` (npm) / `>= 1.0.0` (bun) | Package Manager |
| **Sistem Operasi** | Linux (Ubuntu 22.04 / 24.04, Debian), macOS, WSL2 | Didukung penuh |
| **Proxmox VE** | `>= 7.x / 8.x` | Dengan Prometheus `pve-exporter` |
| **MikroTik RouterOS** | `>= v7.x` | Paket `www` aktif (REST API) |

---

## 🚀 Panduan Instalasi Cepat

### Opsi A: Instalasi Otomatis (Rekomendasi)

Jalankan perintah berikut di terminal server Linux Anda:

```bash
git clone https://github.com/Alulanasyauq1mikazea/NetWach.git
cd NetWach
chmod +x setup.sh
./setup.sh
```

Skrip `setup.sh` secara otomatis:
1. Memeriksa ketersediaan Node.js & npm.
2. Menyalin `.env.example` ke `.env` (jika belum ada).
3. Menginstal seluruh modul via `npm install`.
4. Menjalankan verifikasi tipe TypeScript (`npm run lint`).
5. Membangun bundle produksi (`npm run build`).

---

### Opsi B: Instalasi Manual Step-by-Step

1. **Clone Repositori:**
   ```bash
   git clone https://github.com/Alulanasyauq1mikazea/NetWach.git
   cd NetWach
   ```

2. **Salin File Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Instal Dependensi Node.js:**
   ```bash
   npm install
   ```

4. **Kompilasi Build Produksi:**
   ```bash
   npm run build
   ```

---

## 🔑 Konfigurasi Lingkungan (.env)

Edit file `.env` di root direktori sesuai IP dan kredensial jaringan Anda:

```env
# ==============================================================================
# NETWATCH PRO - ENVIRONMENT CONFIGURATION
# ==============================================================================

# Port Server & Environment
PORT=3000
NODE_ENV=production

# Google Gemini API Key (Opsional - Untuk Prediksi AI)
GEMINI_API_KEY=""

# URL Akses Server Lokal
APP_URL="http://192.168.14.10:3000"

# MikroTik RouterOS Live Connection (CCR1036-12G-4S)
MIKROTIK_HOST="192.168.5.1"
MIKROTIK_USER="netwatch"
MIKROTIK_PASS="26112012"
MIKROTIK_PORT="8728"
MIKROTIK_API_PORT="8728"
MIKROTIK_REST_PORT="80"
MIKROTIK_USE_SSL="false"

# Prometheus SNMP Exporter
SNMP_EXPORTER_HOST="192.168.77.30"
SNMP_EXPORTER_PORT="9117"
SNMP_TARGET_ROUTER="192.168.77.1"

# CrowdSec WAF & Prometheus Server
CROWDSEC_LAPI_URL="http://192.168.77.77:8080"
CROWDSEC_METRICS_URL="http://192.168.77.77:6060/metrics"
PROMETHEUS_URL="http://192.168.77.30:9090"
VICTORIAMETRICS_URL="http://192.168.77.30:8428"
NODE_EXPORTER_URL="http://192.168.77.30:9100/metrics"

# Proxmox VE Cluster Exporters
PROXMOX_DEKANAT_HOST="192.168.77.29"
PROXMOX_DEKANAT_EXPORTER="http://192.168.77.29:9221/pve"
PROXMOX_TEKNIK_HOST="192.168.77.242"
PROXMOX_TEKNIK_EXPORTER="http://192.168.77.242:9221/pve"
PROXMOX_LABTI_HOST="192.168.14.222"
PROXMOX_LABTI_EXPORTER="http://192.168.14.222:9221/pve"

# Telegram Notifikasi Bot (Opsional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Email SMTP (Opsional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

---

## 💻 Instruksi Menjalankan Aplikasi

### Mode Pengembangan (Development)

```bash
npm run dev
```
Akses aplikasi melalui browser di **`http://localhost:3000`** (atau `http://IP_SERVER:3000`).

---

### Mode Produksi dengan PM2 (Rekomendasi)

PM2 adalah process manager terbaik untuk menjaga NetWatch Pro tetap berjalan 24/7 dan otomatis hidup kembali saat server reboot:

1. **Instal PM2 secara global:**
   ```bash
   sudo npm install -g pm2
   ```

2. **Jalankan NetWatch Pro:**
   ```bash
   npm run build
   pm2 start dist/server.cjs --name "netwatch-pro"
   ```

3. **Simpan state PM2 agar auto-start saat reboot:**
   ```bash
   pm2 save
   pm2 startup
   ```

4. **Perintah manajemen PM2 yang berguna:**
   ```bash
   pm2 status                  # Melihat status aplikasi
   pm2 logs netwatch-pro       # Melihat log realtime
   pm2 restart netwatch-pro    # Restart aplikasi
   ```

---

### Mode Produksi dengan Systemd Service

1. **Buat file service systemd:**
   ```bash
   sudo nano /etc/systemd/system/netwatch.service
   ```

2. **Isikan konfigurasi berikut:**
   ```ini
   [Unit]
   Description=NetWatch Pro Telemetry & Monitoring Service
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/netwatch
   ExecStart=/usr/bin/node /var/www/netwatch/dist/server.cjs
   Restart=always
   RestartSec=5
   Environment=NODE_ENV=production
   Environment=PORT=3000

   [Install]
   WantedBy=multi-user.target
   ```

3. **Aktifkan dan jalankan service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now netwatch
   sudo systemctl status netwatch
   ```

---

## 🔐 Kredensial Default Login

| Peran (Role) | Username | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `daswafx` atau `admin` | `admin123` | Akses Penuh (Konfigurasi, Rule WAF, Backup, API Sync, Manajemen Target) |
| **Viewer (Read Only)** | `viewer` atau `guest` | `viewer123` | Monitoring & Dashboard Status saja |

---

## 🧪 Pengujian & Validasi API

- **Validasi Sintaks & Tipe TypeScript:**
  ```bash
  npm run lint
  ```

- **Uji Backend Health Check:**
  ```bash
  curl -i http://localhost:3000/api/health
  ```

- **Uji Real-Time MikroTik Traffic Stream:**
  ```bash
  curl -i "http://localhost:3000/api/mikrotik/traffic?interface=ether1_Internet&source=rest_api"
  ```

- **Uji Proxy Metrik Proxmox VE Exporter:**
  ```bash
  curl -i http://localhost:3000/api/proxmox/pve-exporter/metrics
  ```

- **Uji CrowdSec LAPI Decisions:**
  ```bash
  curl -i http://localhost:3000/api/crowdsec/decisions
  ```

---

## 🛠️ Panduan Debugging & Solusi Masalah

### 1. Port 3000 Sudah Digunakan (`EADDRINUSE`)
```bash
npx kill-port 3000
# atau
sudo fuser -k 3000/tcp
```

### 2. MikroTik REST API Tidak Merespons
- Pastikan service `www` (port 80) aktif di MikroTik:
  ```routeros
  /ip service print
  /ip service enable www
  ```
- Pastikan user `netwatch` memiliki hak akses `read` dan `api`:
  ```routeros
  /user group print
  /user print
  ```

### 3. Metrik RAM / Disk Proxmox Menampilkan Nilai Ganjil
- Proxmox Exporter mengirimkan nilai dalam notasi eksponensial (`1.95e+10`). Parser terintegrasi di `server.ts` dan `src/utils/pveTelemetrySchema.ts` telah mengonversi byte tersebut ke format GB/TB secara presisi.
- Pastikan `pve-exporter` berjalan di port `9221` pada node target Proxmox.

### 4. CrowdSec LAPI Menolak Koneksi
- Pastikan header LAPI Key terkonfigurasi di file `.env` atau parameter query URL, dan endpoint `http://192.168.77.77:8080` dapat dijangkau dari host aplikasi.

---

## 📦 Spesifikasi Dependensi

### Node.js Packages (`package.json`)
- **`express` (`^4.21.2`)**: Server API REST & static asset dispatcher
- **`react` (`^19.0.1`) & `react-dom`**: Framework antarmuka komponen modern
- **`@tailwindcss/vite` (`^4.1.14`) & `tailwindcss`**: Framework styling utility-first generasi terbaru v4
- **`lucide-react` (`^0.546.0`)**: Paket icon antarmuka responsif
- **`motion` (`^12.23.24`)**: Library animasi transisi fluid
- **`recharts` (`^3.10.1`)**: Visualisasi grafik bandwidth real-time & time-series
- **`leaflet` (`^1.9.4`) & `react-leaflet`**: Visualisasi peta serangan GeoIP interaktif
- **`@google/genai` (`^2.4.0`)**: Integrasi Google Gemini AI SDK
- **`dotenv` (`^17.2.3`)**: Pemuatan variabel lingkungan dari `.env`
- **`tsx` (`^4.21.0`) & `esbuild`**: Eksekusi & kompilasi backend TypeScript tingkat produksi

---

## 📄 Lisensi & Kontributor

- **Pengembang**: [@Alulanasyauq1mikazea](https://github.com/Alulanasyauq1mikazea)
- **Institusi**: Universitas Musamus Merauke
- **Lisensi**: MIT License
