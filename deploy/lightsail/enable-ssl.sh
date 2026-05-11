#!/usr/bin/env bash
##
## Provision a Let's Encrypt TLS certificate for the NeuroWatch nginx site.
## Idempotent: re-running renews / re-attaches the cert.
##
## Usage:
##   bash deploy/lightsail/enable-ssl.sh <domain> <email> [include-www:true|false]
##
set -Eeuo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <domain> <email> [include-www:true|false]" >&2
  exit 1
fi

DOMAIN="$1"
EMAIL="$2"
INCLUDE_WWW="${3:-true}"

command -v certbot >/dev/null 2>&1 || {
  echo "ERROR: certbot not found. Run deploy/lightsail/bootstrap.sh first." >&2
  exit 1
}

echo "==> Validating nginx config before requesting cert"
sudo nginx -t

CERTBOT_ARGS=(--nginx -d "$DOMAIN" --agree-tos --email "$EMAIL" --redirect --hsts --staple-ocsp --non-interactive)
if [[ "$INCLUDE_WWW" == "true" ]]; then
  CERTBOT_ARGS+=(-d "www.${DOMAIN}")
fi

echo "==> Requesting certificate for ${DOMAIN}"
sudo certbot "${CERTBOT_ARGS[@]}"

echo "==> Testing automatic renewal"
sudo certbot renew --dry-run

echo "==> TLS enabled for https://${DOMAIN}"
