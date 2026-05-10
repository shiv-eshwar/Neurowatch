#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: bash deploy/lightsail/enable-ssl.sh <domain> <email> [include-www:true|false]"
  exit 1
fi

DOMAIN="$1"
EMAIL="$2"
INCLUDE_WWW="${3:-true}"

echo "==> Validating nginx config before certbot"
sudo nginx -t

CERTBOT_ARGS=(--nginx -d "$DOMAIN" --agree-tos --email "$EMAIL" --redirect --non-interactive)
if [[ "$INCLUDE_WWW" == "true" ]]; then
  CERTBOT_ARGS+=(-d "www.${DOMAIN}")
fi

echo "==> Requesting certificate for ${DOMAIN}"
sudo certbot "${CERTBOT_ARGS[@]}"

echo "==> SSL enabled. Testing renewal dry-run"
sudo certbot renew --dry-run
