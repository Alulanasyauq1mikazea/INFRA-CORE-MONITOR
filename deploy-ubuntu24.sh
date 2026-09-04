#!/usr/bin/env bash
# ==============================================================================
# SentinelPulse - Automated Ubuntu 24.04 LTS Plug-and-Play Installer
# ==============================================================================
set -euo pipefail

echo -e "\033[1;36m"
cat << "EOF"
  ____             _   _            _ _____       _          
 / ___|  ___ _ __ | |_(_)_ __   ___| |  __ \ _   _| |___  ___ 
 \___ \ / _ \ '_ \| __| | '_ \ / _ \ | |__) | | | | / __|/ _ \
  ___) |  __/ | | | |_| | | | |  __/ |  ___/| |_| | \__ \  __/
 |____/ \___|_| |_|\__|_|_| |_|\___|_|_|     \__,_|_|___/\___|
                                                              
  Real-Time Infrastructure Monitoring Hub for Ubuntu 24.04 LTS
EOF
echo -e "\033[0m"

# 1. Verify root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "\033[1;33m[!] Please run this installer with sudo or as root:\033[0m"
  echo "    sudo bash deploy-ubuntu24.sh"
  exit 1
fi

echo -e "\033[1;32m[1/6] Updating system packages on Ubuntu 24.04 LTS...\033[0m"
apt-get update -y && apt-get install -y curl wget git ca-certificates gnupg lsb-release ufw

# 2. Check and Install Docker & Docker Compose if missing
if ! command -v docker &> /dev/null; then
  echo -e "\033[1;32m[2/6] Installing official Docker engine & Compose plugin...\033[0m"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo -e "\033[1;32m[2/6] Docker is already installed.\033[0m"
fi

# 3. Setup Persistent Directories & Permissions
echo -e "\033[1;32m[3/6] Setting up workspace directories and SQLite storage...\033[0m"
mkdir -p ./data
chmod 777 ./data

# 4. Initialize Configuration
echo -e "\033[1;32m[4/6] Initializing configuration files...\033[0m"
if [ ! -f "config.json" ]; then
  if [ -f "config.example.json" ]; then
    cp config.example.json config.json
    echo "  -> Created config.json from template."
  fi
fi

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "  -> Created .env from template."
  fi
fi

# 5. Configure Firewall (UFW)
echo -e "\033[1;32m[5/6] Ensuring port 3000 is open on UFW...\033[0m"
if ufw status | grep -q "Status: active"; then
  ufw allow 3000/tcp comment 'SentinelPulse Dashboard'
  echo "  -> Firewall rule added: 3000/tcp ALLOW"
else
  echo "  -> UFW is inactive. Port 3000 will be open by default."
fi

# 6. Build and Launch Container
echo -e "\033[1;32m[6/6] Building and starting SentinelPulse container...\033[0m"
docker compose down || true
docker compose up -d --build

# Get primary IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "\033[1;32m=================================================================\033[0m"
echo -e "\033[1;32m[SUCCESS] SentinelPulse is running and ready for monitoring!\033[0m"
echo -e "Access your dashboard at: \033[1;36mhttp://${SERVER_IP}:3000\033[0m (or http://localhost:3000)"
echo ""
echo "Useful Commands:"
echo "  - View live logs:     docker compose logs -f"
echo "  - Restart dashboard:  docker compose restart"
echo "  - Stop dashboard:     docker compose down"
echo "  - Edit configuration: nano config.json  (or edit via Web UI)"
echo -e "\033[1;32m=================================================================\033[0m"
