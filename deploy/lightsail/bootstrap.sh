#!/usr/bin/env bash
##
## One-time bootstrap for a fresh Ubuntu 22.04 / 24.04 Lightsail instance.
## Installs the full runtime stack (nginx, Python 3.11+, Node 20, certbot,
## fail2ban, unattended-upgrades, ufw) and configures the host firewall.
##
## Idempotent: safe to re-run after partial failures.
##
set -Eeuo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "ERROR: Do not run bootstrap.sh as root. Run as the deploy user (e.g. 'ubuntu')." >&2
  exit 1
fi

log() { printf '\n==> %s\n' "$*"; }

log "Updating apt indexes + upgrading installed packages"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

log "Installing base system packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  git \
  curl \
  ca-certificates \
  rsync \
  gnupg \
  build-essential \
  python3 \
  python3-venv \
  python3-pip \
  python3-dev \
  libpq-dev \
  nginx \
  ufw \
  fail2ban \
  unattended-upgrades \
  snapd

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js 20 LTS via NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

log "Verifying versions"
python3 --version
node --version
npm --version
nginx -v

log "Installing certbot via snap (recommended path)"
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

log "Enabling unattended security upgrades"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null
sudo systemctl enable --now unattended-upgrades

log "Configuring host firewall (ufw)"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

log "Enabling system services"
sudo systemctl enable --now nginx
sudo systemctl enable --now fail2ban

log "Bootstrap complete."
cat <<'EOM'

Next steps:
  1. Verify Lightsail console firewall: 80/tcp and 443/tcp open from anywhere;
     22/tcp restricted to your IP.
  2. Create /opt/neurowatch/.env with production values (chmod 600 enforced by deploy.sh).
  3. Run:  bash deploy/lightsail/deploy.sh /opt/neurowatch
  4. (Optional) Provision TLS:
       bash deploy/lightsail/enable-ssl.sh your-domain.com you@example.com
EOM
