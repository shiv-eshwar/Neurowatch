#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${1:-/opt/neurowatch}"
BRANCH="${2:-main}"
DEPLOY_META_DIR=".deploy"
DEPLOY_HISTORY_FILE="${DEPLOY_META_DIR}/deploy-history.log"
CURRENT_SUCCESSFUL_FILE="${DEPLOY_META_DIR}/current_successful_commit"

echo "==> Production deploy starting"
echo "    app_dir: ${APP_DIR}"
echo "    branch:  ${BRANCH}"

if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: App directory not found: ${APP_DIR}"
  exit 1
fi

cd "$APP_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: ${APP_DIR} is not a git repository."
  exit 1
fi

echo "==> Pulling latest code"
mkdir -p "$DEPLOY_META_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
TARGET_COMMIT="$(git rev-parse HEAD)"

echo "==> Building + migrating + restarting services"
bash deploy/lightsail/deploy.sh "$APP_DIR"

echo "$TARGET_COMMIT" > "$CURRENT_SUCCESSFUL_FILE"
printf '%s|%s|%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$BRANCH" "$TARGET_COMMIT" >> "$DEPLOY_HISTORY_FILE"

echo "==> Production deploy finished"
