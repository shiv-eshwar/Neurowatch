#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${1:-/opt/neurowatch}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "==> Deploying NeuroWatch from ${APP_DIR}"
cd "$APP_DIR"

if [[ ! -f ".env" ]]; then
  echo "ERROR: ${APP_DIR}/.env not found. Create it before deploying."
  exit 1
fi

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "ERROR: ${PYTHON_BIN} not found."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found. Run deploy/lightsail/bootstrap.sh first."
  exit 1
fi

echo "==> Installing backend dependencies"
"$PYTHON_BIN" -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt

echo "==> Installing frontend dependencies"
npm ci --prefix frontend

echo "==> Building frontend"
npm --prefix frontend run build

echo "==> Running database migrations"
(
  cd backend
  ../.venv/bin/alembic upgrade head
)

echo "==> Installing systemd service"
sudo install -m 644 deploy/lightsail/neurowatch.service /etc/systemd/system/neurowatch.service
sudo systemctl daemon-reload
sudo systemctl enable neurowatch
sudo systemctl restart neurowatch

echo "==> Installing nginx site config"
sudo install -m 644 deploy/lightsail/nginx.neurowatch.conf /etc/nginx/sites-available/neurowatch
sudo ln -sf /etc/nginx/sites-available/neurowatch /etc/nginx/sites-enabled/neurowatch
if [[ -f /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi
sudo nginx -t
sudo systemctl reload nginx

echo "==> Deployment complete"
echo "Service health:"
sudo systemctl --no-pager status neurowatch | sed -n '1,10p'
