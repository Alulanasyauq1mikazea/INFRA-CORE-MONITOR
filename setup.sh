#!/usr/bin/env bash
# ==============================================================================
# NetWatch Pro (OmniGuard-Live) - Enterprise Deployment & Automation Script
# Universitas Musamus Merauke
# ==============================================================================

set -euo pipefail

# Warna Terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

APP_NAME="netwatch-pro"
DEFAULT_PORT=3000
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}==============================================================================${NC}"
echo -e "${BLUE}   🛰️  NETWATCH PRO (OmniGuard-Live) - ENTERPRISE SETUP & DEPLOYMENT${NC}"
echo -e "${BLUE}   Universitas Musamus Merauke - Network & Security Telemetry Center${NC}"
echo -e "${CYAN}==============================================================================${NC}\n"

# ------------------------------------------------------------------------------
# 1. Pengecekan Hak Akses & Lingkungan OS
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/8] Memeriksa Lingkungan Sistem Operasi...${NC}"
OS_TYPE="$(uname -s)"
case "${OS_TYPE}" in
    Linux*)     OS_NAME="Linux" ;;
    Darwin*)    OS_NAME="macOS" ;;
    *)          OS_NAME="UNKNOWN:${OS_TYPE}" ;;
esac
echo -e "  ✅ Sistem Operasi: ${GREEN}${OS_NAME}${NC} ($(uname -m))"

# ------------------------------------------------------------------------------
# 2. Pengecekan Runtime (Node.js, npm/bun, git, curl)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[2/8] Memeriksa Ketersediaan Tool & Runtime...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "  ${RED}❌ Node.js TIDAK ditemukan!${NC}"
    echo -e "  👉 Silakan install Node.js 20 LTS via NodeSource:"
    echo -e "     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo -e "     sudo apt-get install -y nodejs"
    exit 1
fi
NODE_VER=$(node -v)
NODE_MAJOR=$(echo "$NODE_VER" | tr -d 'v' | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "  ${RED}❌ Versi Node.js ($NODE_VER) terlalu lama. Minimal Node.js 18 (Disarankan Node 20 LTS).${NC}"
    exit 1
fi
echo -e "  ✅ Node.js: ${GREEN}${NODE_VER}${NC} (Didukung)"

# Package Manager
if command -v npm &> /dev/null; then
    NPM_VER=$(npm -v)
    echo -e "  ✅ npm: ${GREEN}v${NPM_VER}${NC}"
fi

# Git & Curl
if command -v git &> /dev/null; then
    echo -e "  ✅ git: ${GREEN}$(git --version)${NC}"
fi
if command -v curl &> /dev/null; then
    echo -e "  ✅ curl: ${GREEN}Tersedia${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Konfigurasi Variabel Lingkungan (.env)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/8] Menyiapkan Konfigurasi Lingkungan (.env)...${NC}"
if [ ! -f "${PROJECT_DIR}/.env" ]; then
    if [ -f "${PROJECT_DIR}/.env.example" ]; then
        echo -e "  📋 File .env belum ada. Menyalin dari .env.example..."
        cp "${PROJECT_DIR}/.env.example" "${PROJECT_DIR}/.env"
        echo -e "  ✅ File ${GREEN}.env${NC} berhasil dibuat."
    else
        echo -e "  ${RED}❌ File .env.example tidak ditemukan!${NC}"
        exit 1
    fi
else
    echo -e "  ℹ️  File ${GREEN}.env${NC} sudah ada. Melanjutkan tanpa overwrite."
fi

# ------------------------------------------------------------------------------
# 4. Instalasi Dependensi Node.js
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[4/8] Menginstal Dependensi NPM (Modern React 19 + Tailwind v4 + Express)...${NC}"
cd "${PROJECT_DIR}"
npm install --legacy-peer-deps || npm install

# ------------------------------------------------------------------------------
# 5. Type-Checking & Validasi Kode TypeScript
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[5/8] Menjalankan Validasi Tipe Data & Linter TypeScript...${NC}"
if npm run lint; then
    echo -e "  ✅ Type-checking lulus 100% tanpa error!"
else
    echo -e "  ${RED}❌ Ditemukan kesalahan TypeScript saat kompilasi! Harap periksa kode sebelum build.${NC}"
    exit 1
fi

# ------------------------------------------------------------------------------
# 6. Kompilasi Build Produksi (Vite + esbuild Bundle Backend)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[6/8] Membangun Bundle Produksi (Frontend Dist + dist/server.cjs)...${NC}"
npm run build

if [ -f "${PROJECT_DIR}/dist/server.cjs" ] && [ -f "${PROJECT_DIR}/dist/index.html" ]; then
    echo -e "  ✅ Bundle frontend & backend berhasil dikompilasi ke ${GREEN}dist/${NC}"
else
    echo -e "  ${RED}❌ Hasil kompilasi tidak lengkap!${NC}"
    exit 1
fi

# ------------------------------------------------------------------------------
# 7. Deteksi Process Manager & Firewall Port
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[7/8] Pengecekan Process Manager & Port 3000...${NC}"

# Periksa PM2
if command -v pm2 &> /dev/null; then
    echo -e "  ✅ PM2 terdeteksi: ${GREEN}$(pm2 -v)${NC}"
    PM2_INSTALLED=true
else
    echo -e "  ℹ️  PM2 belum terpasang secara global. (Bisa dipasang dengan: ${CYAN}sudo npm install -g pm2${NC})"
    PM2_INSTALLED=false
fi

# Pengecekan port conflict
if command -v ss &> /dev/null; then
    if ss -tuln | grep -q ":${DEFAULT_PORT} "; then
        echo -e "  ⚠️  ${YELLOW}Peringatan: Port ${DEFAULT_PORT} sedang digunakan oleh proses lain!${NC}"
    fi
fi

# ------------------------------------------------------------------------------
# 8. Opsi Deployment Interaktif
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[8/8] Konfirmasi Peluncuran Service...${NC}"

echo -e "\n${CYAN}==============================================================================${NC}"
echo -e "${GREEN}🎉 PROSES INSTALASI & BUILD NETWATCH PRO BERHASIL SELESAI!${NC}"
echo -e "${CYAN}==============================================================================${NC}"

echo -e "\nPilih cara menjalankan NetWatch Pro:"
echo -e "  ${GREEN}1)${NC} Jalankan langsung via PM2 (Background 24/7 + Auto-Restart) [Rekomendasi Server]"
echo -e "  ${GREEN}2)${NC} Jalankan dalam Mode Development (Live reload: npm run dev)"
echo -e "  ${GREEN}3)${NC} Buat file Systemd Service (/etc/systemd/system/netwatch.service)"
echo -e "  ${GREEN}4)${NC} Selesai / Jalankan manual nanti\n"

read -p "Masukkan pilihan Anda (1-4) [Default: 1]: " -n 1 -r CHOICE || true
echo ""

CHOICE=${CHOICE:-1}

case "$CHOICE" in
    1)
        if [ "$PM2_INSTALLED" = false ]; then
            echo -e "📦 Memasang PM2 secara global..."
            sudo npm install -g pm2 || npm install -g pm2
        fi
        echo -e "🚀 Memulai NetWatch Pro dengan PM2..."
        pm2 stop "$APP_NAME" 2>/dev/null || true
        pm2 delete "$APP_NAME" 2>/dev/null || true
        pm2 start "${PROJECT_DIR}/dist/server.cjs" --name "$APP_NAME" --update-env
        pm2 save
        echo -e "\n✅ ${GREEN}NetWatch Pro berhasil berjalan di PM2!${NC}"
        echo -e "👉 Buka dashboard di: ${CYAN}http://localhost:${DEFAULT_PORT}${NC}"
        echo -e "👉 Cek log realtime : ${CYAN}pm2 logs ${APP_NAME}${NC}"
        ;;
    2)
        echo -e "🚀 Menjalankan dev server..."
        npm run dev
        ;;
    3)
        SERVICE_FILE="/etc/systemd/system/netwatch.service"
        CURRENT_USER="$(whoami)"
        echo -e "📝 Membuat file systemd service..."
        sudo bash -c "cat <<EOF > ${SERVICE_FILE}
[Unit]
Description=NetWatch Pro Telemetry & Monitoring Service
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${PROJECT_DIR}
ExecStart=$(which node) ${PROJECT_DIR}/dist/server.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${DEFAULT_PORT}

[Install]
WantedBy=multi-user.target
EOF"
        sudo systemctl daemon-reload
        sudo systemctl enable --now netwatch
        echo -e "✅ Systemd service ${GREEN}netwatch.service${NC} berhasil diaktifkan!"
        sudo systemctl status netwatch --no-pager
        ;;
    *)
        echo -e "\nℹ️  Anda dapat menjalankan aplikasi secara manual kapan saja dengan:"
        echo -e "   • Dev  : ${CYAN}npm run dev${NC}"
        echo -e "   • Prod : ${CYAN}pm2 start dist/server.cjs --name netwatch-pro${NC}"
        echo -e "   • URL  : ${CYAN}http://localhost:3000${NC}\n"
        ;;
esac
