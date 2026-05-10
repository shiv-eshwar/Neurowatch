#!/usr/bin/env bash
set -Eeuo pipefail

echo "==> Updating apt packages"
sudo apt update
sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y

echo "==> Installing base packages"
sudo apt install -y git nginx python3 python3-venv python3-pip snapd ufw fail2ban rsync curl

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "==> Installing certbot"
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

echo "==> Configuring firewall"
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw --force enable

echo "==> Enabling services"
sudo systemctl enable nginx
sudo systemctl enable fail2ban
sudo systemctl restart nginx
sudo systemctl restart fail2ban

echo "==> Bootstrap complete"
echo "Remember to also configure Lightsail networking firewall (22 restricted, 80/443 open)."
