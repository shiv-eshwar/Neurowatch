# NeuroWatch — AWS Lightsail Deployment Guide

Production deployment runs on a single Ubuntu Lightsail instance with:

- **nginx** — terminates HTTPS (Let's Encrypt), serves the built SPA from disk, proxies `/api/*` to FastAPI, gzips, caches hashed assets immutably.
- **systemd** (`neurowatch.service`) — supervises the app process; restarts on failure; sandboxed.
- **gunicorn** with **uvicorn workers** — production WSGI/ASGI runner.
- **Neon Postgres** — managed database (off-box).
- **GitHub Actions** — CI (tests + frontend build) → SSH deploy on every push to `main`.

```
                       Internet
                         │  443/80
                         ▼
                ┌─────────────────┐
                │      nginx      │
                │  TLS, gzip, SPA │
                └────┬───────┬────┘
                     │       │ proxy_pass /api/*
       static /assets│       ▼
                     │   ┌──────────────────┐
                     │   │ gunicorn (×N)    │
                     │   │ uvicorn workers  │
                     │   │ FastAPI app      │
                     │   └─────┬────────────┘
                     ▼         │
              frontend/dist    ▼
                          Neon Postgres
```

---

## 1) Lightsail console — networking

Before SSHing in, in the AWS Lightsail console:

1. Create an Ubuntu 22.04+ instance with **at least 2 GB RAM** (1 GB is too tight for the `vite build` step).
2. **Attach a Static IP** to the instance — your IP changes on stop/start otherwise.
3. Networking → firewall:
   - Allow `80/tcp` and `443/tcp` from `0.0.0.0/0`.
   - Restrict `22/tcp` to your own IP/CIDR.
4. (Optional) Point your domain's `A` record to the Static IP. Without a domain, you can still reach the app via `http://<static-ip>/` but you cannot enable TLS.

---

## 2) One-time server bootstrap

SSH in (as `ubuntu`), clone the repo and run bootstrap:

```bash
sudo mkdir -p /opt/neurowatch
sudo chown "$USER:$USER" /opt/neurowatch
cd /opt/neurowatch

git clone --depth 1 --branch main https://github.com/<you>/<repo>.git .
bash deploy/lightsail/bootstrap.sh
```

`bootstrap.sh` installs nginx, Python 3.11+, Node 20, certbot (snap), ufw, fail2ban, and `unattended-upgrades` for automatic security patches.

---

## 3) Create the production `.env`

Create `/opt/neurowatch/.env`. **deploy.sh enforces `chmod 600`** so the secrets never leak via world-readable file modes.

```env
ENVIRONMENT=production

# --- Database (use the same Neon URL you use locally) ---
DATABASE_URL=postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require

# --- Auth ---
JWT_SECRET=<run: python3 -c "import secrets; print(secrets.token_urlsafe(48))">
JWT_ISSUER=neurowatch
JWT_TTL_SECONDS=2592000
AUTH_PROVIDER=firebase

# --- OpenAI (optional) ---
OPENAI_API_KEY=sk-proj-...

# --- CORS: MUST match the public origin the browser uses ---
CORS_ORIGINS=https://your-domain.com

# --- Firebase Admin (backend) ---
FIREBASE_PROJECT_ID=neurowatch-2d520
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"neurowatch-2d520", ... }'

# --- Firebase Web SDK (built into the frontend at vite build time) ---
VITE_AUTH_PROVIDER=firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=neurowatch-2d520.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neurowatch-2d520
VITE_FIREBASE_STORAGE_BUCKET=neurowatch-2d520.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

# --- gunicorn tuning (optional) ---
# GUNICORN_WORKERS=2
# GUNICORN_TIMEOUT=120
```

**Critical rules**

| Rule | Why |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` is wrapped in **single quotes** | The value contains `{`, `:`, `,`, and `\n` escapes. Single quotes preserve them as literal characters. |
| `CORS_ORIGINS` exactly matches the URL the browser hits | No trailing slash. Mismatch → preflight failures, login fails silently. |
| Use a fresh `JWT_SECRET` | Don't reuse dev secrets. Generate with the command above. |
| In Firebase Console → Authentication → Settings → Authorized domains | **Add your production domain.** Else Google sign-in popup returns `auth/unauthorized-domain`. |

---

## 4) First deploy

```bash
cd /opt/neurowatch
bash deploy/lightsail/deploy.sh /opt/neurowatch
```

What `deploy.sh` does:

1. Locks `.env` to `chmod 600`.
2. Creates `/opt/neurowatch/.venv` and installs backend Python deps.
3. `npm ci --prefix frontend` + `vite build`.
4. Runs `alembic upgrade head` against Postgres.
5. Templates and installs `/etc/systemd/system/neurowatch.service`.
6. Templates and installs `/etc/nginx/sites-available/neurowatch` → enables site.
7. `nginx -t` validation.
8. Restarts the service, reloads nginx.
9. Smoke-tests `http://127.0.0.1:8000/api/v1/health`.

Manual verification:

```bash
curl -i http://127.0.0.1:8000/api/v1/health
curl -i http://localhost/api/v1/health     # via nginx
curl -i http://localhost/                  # SPA index.html
sudo systemctl status neurowatch --no-pager
sudo nginx -t
```

If `/api/v1/health` returns `{"status":"ok"}` on both ports, you're live on HTTP.

---

## 5) Enable HTTPS

Only after your DNS record resolves to the Lightsail Static IP:

```bash
bash deploy/lightsail/enable-ssl.sh your-domain.com you@example.com true
```

This calls `certbot --nginx` with `--redirect --hsts --staple-ocsp`. certbot rewrites the nginx config to:

- Listen on `443` with the Let's Encrypt cert.
- Redirect `80` → `443`.
- Add HSTS.
- Renew automatically (via the snap systemd timer).

Validate auto-renew:

```bash
sudo certbot renew --dry-run
```

---

## 6) GitHub Actions CI/CD

Workflow file: `.github/workflows/deploy-lightsail.yml`. Trigger: every push to `main` (docs-only commits ignored).

Required GitHub secrets (Repo Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `LIGHTSAIL_HOST` | Static IP or domain |
| `LIGHTSAIL_USER` | `ubuntu` |
| `LIGHTSAIL_SSH_KEY` | Full private key contents (PEM, including BEGIN/END lines) |
| `LIGHTSAIL_REPO_URL` | `https://github.com/<you>/<repo>.git` — for **private repos** use `https://<user>:<PAT>@github.com/<you>/<repo>.git` |
| `LIGHTSAIL_BRANCH`   | optional, default `main` |
| `LIGHTSAIL_APP_DIR`  | optional, default `/opt/neurowatch` |
| `LIGHTSAIL_SSH_PORT` | optional, default `22` |

Pipeline behavior:

1. CI runner: install backend deps → run pytest integration tests → install + build frontend (gates the deploy).
2. CI runner SSHes into Lightsail with the provided key.
3. On the box: `git fetch + reset --hard origin/main` → `deploy/lightsail/deploy.sh`.
4. Smoke test passes → green build.

A failing test or build on the runner blocks the deploy; the running site stays untouched.

---

## 7) Day-2 operations

| Action | Command |
|---|---|
| One-command pull + redeploy (on the box) | `bash deploy/lightsail/deploy-production.sh /opt/neurowatch main` |
| Rollback to previous successful deploy   | `bash deploy/lightsail/rollback.sh /opt/neurowatch` |
| Rollback to a specific commit/tag        | `bash deploy/lightsail/rollback.sh /opt/neurowatch <commit-sha>` |
| Tail app logs                            | `sudo journalctl -u neurowatch -n 200 --no-pager -f` |
| Tail nginx error log                     | `sudo tail -f /var/log/nginx/error.log` |
| Restart app                              | `sudo systemctl restart neurowatch` |
| Reload nginx after config edit           | `sudo nginx -t && sudo systemctl reload nginx` |
| Force-renew TLS                          | `sudo certbot renew --force-renewal` |
| Increase worker count                    | Set `GUNICORN_WORKERS=3` in `/opt/neurowatch/.env`, then `sudo systemctl restart neurowatch` |

---

## 8) Hardening checklist

- [x] Host firewall (`ufw`) limited to SSH + Nginx Full.
- [x] Lightsail console firewall restricts SSH to your IP.
- [x] `fail2ban` enabled (defaults cover SSH brute-force).
- [x] `unattended-upgrades` enabled for automatic security patches.
- [x] `.env` is `chmod 600` (re-enforced on every deploy).
- [x] systemd unit uses `ProtectSystem=full`, `ProtectHome`, `PrivateTmp`, `ProtectKernel*`, `RestrictNamespaces`, `NoNewPrivileges`.
- [x] gunicorn `--max-requests 1000 --max-requests-jitter 100` recycles workers to avoid slow memory leaks.
- [x] nginx hides version (`server_tokens off`), denies dotfiles, sets security headers.
- [x] Long immutable cache only for content-hashed `/assets/*`; `index.html` is `no-cache`.
- [x] TLS via certbot with HSTS and OCSP stapling.
- [ ] Take a periodic Lightsail snapshot (manual or automated).
- [ ] Rotate `JWT_SECRET`, `OPENAI_API_KEY`, and the Firebase service account if any of them were ever committed.

---

## 9) Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` from nginx | gunicorn not running or crashed | `sudo systemctl status neurowatch` + `sudo journalctl -xeu neurowatch` |
| `401 Unauthorized` on `/api/v1/auth/firebase` | Token expired / clock skew / wrong project | The improved error message now appends the real cause; check `journalctl -u neurowatch -n 50`. Sync clock: `sudo timedatectl set-ntp true`. |
| Google sign-in popup: `auth/unauthorized-domain` | Production domain not in Firebase Authorized domains | Firebase Console → Authentication → Settings → Authorized domains → add domain |
| `nginx: [emerg] open() ".../frontend/dist/index.html" failed` | Frontend not built or wrong `__APP_DIR__` | Run `bash deploy/lightsail/deploy.sh /opt/neurowatch` again |
| Frontend reloads ignore changes | Browser cached `index.html` | Hard refresh (Ctrl-Shift-R); we send `Cache-Control: no-cache` so this should be rare |
| `Permission denied` from nginx on static files | `/opt/neurowatch` or its tree is not world-readable | `sudo chmod o+rx /opt/neurowatch /opt/neurowatch/frontend /opt/neurowatch/frontend/dist` |
| Out of memory during `vite build` on 1 GB instance | Lightsail plan too small | Resize to 2 GB or build in CI and rsync `frontend/dist` |
