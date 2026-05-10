# Lightsail Production Deployment

This project deploys to a plain Ubuntu Lightsail instance using:

- `systemd` (`neurowatch.service`) for app process management
- `gunicorn + uvicorn` for FastAPI production serving
- `nginx` reverse proxy on ports 80/443
- Let's Encrypt TLS via certbot
- GitHub Actions SSH deployment

## 1) Lightsail + DNS best practices

- Attach a **Static IP** to the instance.
- Point your domain `A` record to that Static IP.
- In Lightsail networking firewall:
  - allow `80` and `443` from all
  - restrict `22` (SSH) to your IP/CIDR only
- Also keep OS firewall enabled (`ufw`) with only SSH + Nginx Full allowed.

## 2) One-time server bootstrap

SSH into the instance and run:

```bash
sudo mkdir -p /opt/neurowatch
sudo chown "$USER:$USER" /opt/neurowatch
cd /opt/neurowatch

# clone once (replace with your repo URL)
git clone --depth 1 --branch main <YOUR_GITHUB_REPO_URL> .

# install base packages and security defaults
bash deploy/lightsail/bootstrap.sh
```

## 3) Create production environment file

Create `/opt/neurowatch/.env` with production values:

```env
ENVIRONMENT=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_ISSUER=neurowatch
JWT_TTL_SECONDS=2592000
OPENAI_API_KEY=
CORS_ORIGINS=https://your-domain.com
AUTH_PROVIDER=firebase
FIREBASE_PROJECT_ID=neurowatch-2d520
FIREBASE_SERVICE_ACCOUNT_JSON={...}
VITE_AUTH_PROVIDER=firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

## 4) First deploy on server

```bash
cd /opt/neurowatch
bash deploy/lightsail/deploy.sh /opt/neurowatch
```

If you cloned into a nested path (for example `/opt/neurowatch/Neurowatch`), use:

```bash
cd /opt/neurowatch/Neurowatch
bash deploy/lightsail/deploy.sh "$(pwd)"
```

Verify:

```bash
curl -i http://127.0.0.1:8000/api/v1/health
sudo systemctl status neurowatch --no-pager
sudo nginx -t
```

## 4.1) One-command update deploys (recommended)

For every later release, use one command on the server:

```bash
cd /opt/neurowatch
bash deploy/lightsail/deploy-production.sh /opt/neurowatch main
```

For nested clone paths, run from repo root:

```bash
bash deploy/lightsail/deploy-production.sh "$(pwd)" main
```

This script performs:

- `git fetch` + checkout/reset to latest branch commit
- dependency install
- frontend build
- Alembic migration
- systemd service restart
- nginx config test + reload

## 4.2) Roll back to a previous stable release

Automatic rollback to prior successful deploy:

```bash
cd /opt/neurowatch
bash deploy/lightsail/rollback.sh /opt/neurowatch
```

Rollback to a specific commit/tag:

```bash
cd /opt/neurowatch
bash deploy/lightsail/rollback.sh /opt/neurowatch <commit-or-tag>
```

The rollback script:

- resets repository to target commit
- runs full deploy pipeline
- records rollback event in `.deploy/deploy-history.log`

## 5) Enable HTTPS

After DNS is propagated:

```bash
cd /opt/neurowatch
bash deploy/lightsail/enable-ssl.sh your-domain.com your-email@example.com true
```

certbot on snap configures auto-renew. Validate with:

```bash
sudo certbot renew --dry-run
```

## 6) GitHub Actions auto-deploy

Workflow file: `.github/workflows/deploy-lightsail.yml`

Add these GitHub secrets:

- `LIGHTSAIL_HOST` (public IP or domain)
- `LIGHTSAIL_USER` (usually `ubuntu`)
- `LIGHTSAIL_SSH_KEY` (private key content)
- `LIGHTSAIL_SSH_PORT` (optional, default 22)
- `LIGHTSAIL_APP_DIR` (optional, default `/opt/neurowatch`)
- `LIGHTSAIL_REPO_URL` (full clone URL; for private repos use token-enabled URL)
- `LIGHTSAIL_BRANCH` (optional, default `main`)

Then push to `main` or run the workflow manually.

## 7) Operational checks

- App health: `https://your-domain.com/api/v1/health`
- Logs:
  - `sudo journalctl -u neurowatch -n 200 --no-pager`
  - `sudo tail -n 200 /var/log/nginx/error.log`
- Restart:
  - `sudo systemctl restart neurowatch`
  - `sudo systemctl reload nginx`

## 8) Security follow-up

- Rotate any exposed credentials (Neon, OpenAI, Firebase service account).
- Keep system patched:
  - `sudo apt update && sudo apt upgrade -y`
- Keep SSH restricted in Lightsail firewall.
