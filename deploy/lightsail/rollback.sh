#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${1:-/opt/neurowatch}"
TARGET_REF="${2:-}"
DEPLOY_META_DIR=".deploy"
DEPLOY_HISTORY_FILE="${DEPLOY_META_DIR}/deploy-history.log"
CURRENT_SUCCESSFUL_FILE="${DEPLOY_META_DIR}/current_successful_commit"

echo "==> Starting rollback"
echo "    app_dir: ${APP_DIR}"

if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: App directory not found: ${APP_DIR}"
  exit 1
fi

cd "$APP_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: ${APP_DIR} is not a git repository."
  exit 1
fi

if [[ -z "$TARGET_REF" ]]; then
  if [[ ! -f "$DEPLOY_HISTORY_FILE" ]]; then
    echo "ERROR: No deploy history found at ${DEPLOY_HISTORY_FILE}."
    echo "Provide a target commit/tag explicitly: rollback.sh /opt/neurowatch <commit>"
    exit 1
  fi

  mapfile -t HISTORY_LINES < "$DEPLOY_HISTORY_FILE"
  if (( ${#HISTORY_LINES[@]} < 2 )); then
    echo "ERROR: Need at least 2 successful deploys to auto-rollback."
    echo "Provide a target commit/tag explicitly: rollback.sh /opt/neurowatch <commit>"
    exit 1
  fi

  PREVIOUS_LINE="${HISTORY_LINES[${#HISTORY_LINES[@]}-2]}"
  TARGET_REF="$(echo "$PREVIOUS_LINE" | awk -F'|' '{print $3}')"
fi

if [[ -z "$TARGET_REF" ]]; then
  echo "ERROR: Could not resolve rollback target."
  exit 1
fi

echo "==> Rolling back to ${TARGET_REF}"
git fetch --all --tags
git reset --hard "$TARGET_REF"

echo "==> Rebuilding and restarting services"
bash deploy/lightsail/deploy.sh "$APP_DIR"

ROLLED_BACK_COMMIT="$(git rev-parse HEAD)"
mkdir -p "$DEPLOY_META_DIR"
echo "$ROLLED_BACK_COMMIT" > "$CURRENT_SUCCESSFUL_FILE"
printf '%s|rollback|%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$ROLLED_BACK_COMMIT" >> "$DEPLOY_HISTORY_FILE"

echo "==> Rollback complete at commit ${ROLLED_BACK_COMMIT}"
