#!/usr/bin/env bash
##
## NeuroWatch release script. Performs an idempotent build + restart:
##   1. preflight checks (.env, tooling)
##   2. install / upgrade backend Python deps in repo-local .venv
##   3. install + build frontend (Vite -> frontend/dist)
##   4. run Alembic migrations
##   5. render & install systemd unit
##   6. render & install nginx site (with __APP_DIR__ substituted)
##   7. restart neurowatch.service + reload nginx
##   8. smoke-test 127.0.0.1:8000/api/v1/health
##
## Usage:  bash deploy/lightsail/deploy.sh [APP_DIR]
##
set -Eeuo pipefail

APP_DIR="${1:-/opt/neurowatch}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
RUN_USER="${DEPLOY_RUN_USER:-${SUDO_USER:-$USER}}"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "ERROR: Do not run deploy.sh as root. Use the deploy user (e.g. 'ubuntu')." >&2
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: APP_DIR does not exist: $APP_DIR" >&2
  exit 1
fi

APP_DIR="$(realpath "$APP_DIR")"

log() { printf '\n==> %s\n' "$*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }

log "Deploying NeuroWatch from ${APP_DIR} (user=${RUN_USER})"
cd "$APP_DIR"

## --------------------------------------------------------------------------
## 1) Preflight
## --------------------------------------------------------------------------
[[ -f ".env" ]] || fail "${APP_DIR}/.env not found. Create it before deploying."
command -v "$PYTHON_BIN" >/dev/null 2>&1 || fail "${PYTHON_BIN} not found."
command -v npm          >/dev/null 2>&1 || fail "npm not found. Run deploy/lightsail/bootstrap.sh first."
command -v nginx        >/dev/null 2>&1 || fail "nginx not found. Run deploy/lightsail/bootstrap.sh first."

[[ -f "deploy/lightsail/neurowatch.service"   ]] || fail "neurowatch.service template missing."
[[ -f "deploy/lightsail/nginx.neurowatch.conf" ]] || fail "nginx.neurowatch.conf template missing."

log "Locking down .env permissions (owner=${RUN_USER}, mode=600)"
sudo chown "${RUN_USER}:${RUN_USER}" .env
sudo chmod 600 .env

## --------------------------------------------------------------------------
## 2) Backend deps
## --------------------------------------------------------------------------
log "Creating / refreshing Python virtualenv"
if [[ ! -d ".venv" ]]; then
  "$PYTHON_BIN" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt

## --------------------------------------------------------------------------
## 3) Frontend build
## --------------------------------------------------------------------------
log "Installing frontend dependencies (npm ci)"
npm ci --prefix frontend

log "Building frontend (vite build)"
npm --prefix frontend run build

[[ -f "frontend/dist/index.html" ]] || fail "frontend build did not produce frontend/dist/index.html"

## --------------------------------------------------------------------------
## 4) Database migrations
## --------------------------------------------------------------------------
log "Running Alembic migrations"
(
  cd backend
  ../.venv/bin/alembic upgrade head
)

## --------------------------------------------------------------------------
## 5) systemd unit
## --------------------------------------------------------------------------
log "Installing systemd unit"
SERVICE_TMP="$(mktemp)"
sed \
  -e "s|__APP_DIR__|${APP_DIR}|g" \
  -e "s|__RUN_USER__|${RUN_USER}|g" \
  "deploy/lightsail/neurowatch.service" > "$SERVICE_TMP"
sudo install -m 644 "$SERVICE_TMP" /etc/systemd/system/neurowatch.service
rm -f "$SERVICE_TMP"
sudo systemctl daemon-reload
sudo systemctl enable neurowatch

## --------------------------------------------------------------------------
## 6) nginx site (with templated __APP_DIR__)
## --------------------------------------------------------------------------
log "Installing nginx site"
NGINX_TMP="$(mktemp)"
sed -e "s|__APP_DIR__|${APP_DIR}|g" \
  "deploy/lightsail/nginx.neurowatch.conf" > "$NGINX_TMP"
sudo install -m 644 "$NGINX_TMP" /etc/nginx/sites-available/neurowatch
rm -f "$NGINX_TMP"
sudo ln -sf /etc/nginx/sites-available/neurowatch /etc/nginx/sites-enabled/neurowatch
if [[ -e /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

log "Validating nginx config"
sudo nginx -t

## --------------------------------------------------------------------------
## 7) Restart / reload
## --------------------------------------------------------------------------
log "Restarting neurowatch.service"
if ! sudo systemctl restart neurowatch; then
  echo "----- neurowatch.service failed to start -----" >&2
  sudo systemctl --no-pager status neurowatch || true
  sudo journalctl -xeu neurowatch --no-pager | tail -n 120 || true
  exit 1
fi

log "Reloading nginx"
sudo systemctl reload nginx

## --------------------------------------------------------------------------
## 8) Smoke test
## --------------------------------------------------------------------------
log "Smoke-testing the API"
sleep 2
ATTEMPTS=0
until curl -fsS --max-time 5 http://127.0.0.1:8000/api/v1/health >/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if (( ATTEMPTS >= 10 )); then
    echo "----- /api/v1/health did not become healthy in time -----" >&2
    sudo systemctl --no-pager status neurowatch || true
    sudo journalctl -xeu neurowatch --no-pager | tail -n 80 || true
    exit 1
  fi
  sleep 1
done

log "Deployment complete."
echo "Service status:"
sudo systemctl --no-pager --lines=5 status neurowatch | sed -n '1,12p' || true
echo
echo "Reach the site from your browser at: http://<your-static-ip>/"
echo "After DNS + TLS: bash deploy/lightsail/enable-ssl.sh <your-domain> <your-email>"
