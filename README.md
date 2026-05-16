# NeuroWatch

NeuroWatch is now a production-oriented, two-tier application with a clean folder split:

- Frontend: Vite + React SPA (`frontend/`)
- Backend: FastAPI + SQLAlchemy + Alembic (`backend/`)
- Auth: secure httpOnly JWT cookie with a provider seam for future Firebase auth
- Session pipeline: typing + reaction + memory + voice ingestion, baseline comparison, local deterministic analysis fallback, optional OpenAI-enhanced analysis

## Prerequisites

- Node.js 18+
- Python 3.11+

## 1) Configure Environments

Copy values from `.env.example` into `.env` and set:

- `JWT_SECRET` to a long random value
- `OPENAI_API_KEY` only if you want AI/Whisper features (optional)
- `DATABASE_URL` to your managed Postgres URL for production (Neon URL formats like `postgresql://...` are supported)
- `VITE_AUTH_PROVIDER=firebase` and Firebase web config keys if using Firebase login
- `FIREBASE_SERVICE_ACCOUNT_JSON` (or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`) so backend can verify Firebase ID tokens

Generate a secure JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## 2) Install Dependencies

Frontend:

```bash
cd frontend
npm install
cd ..
```

If using Firebase in frontend:

```bash
npm --prefix frontend install firebase
```

Backend:

```bash
python -m pip install -r backend/requirements.txt
```

## 3) Run Database Migration

```bash
cd backend
alembic upgrade head
cd ..
```

### Using Neon Postgres

If you are moving from local SQLite to Neon:

1. Set `DATABASE_URL` in `.env` to your Neon connection string.
2. Install backend dependencies (includes Postgres driver):
   ```bash
   python -m pip install -r backend/requirements.txt
   ```
3. Run:
   ```bash
   cd backend
   alembic upgrade head
   cd ..
   ```

## 4) Run in Development

Run both frontend and backend together:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:frontend
npm run dev:backend
```

Frontend: [http://localhost:5173](http://localhost:5173)  
Backend API: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### Firebase auth flow

- Frontend signs in users with Firebase SDK.
- Frontend sends Firebase `id_token` to `POST /api/v1/auth/firebase`.
- Backend verifies token and sets secure httpOnly session cookie.
- Protected routes continue using the same cookie auth middleware.

## 5) Run Tests

```bash
python -m pytest
```

## Production Build

```bash
npm run build:frontend
python -m uvicorn app.main:app --port 8000 --app-dir backend
```

FastAPI will serve the built SPA from `frontend/dist/` when present.

## Deployment — AWS Lightsail (Ubuntu)

This project is deployed to a single AWS Lightsail Ubuntu instance using **nginx + systemd + gunicorn + uvicorn** (no Docker). On every push to `main`, GitHub Actions runs tests + frontend build, then SSHes into the Lightsail box and runs the release script.

Pieces:

- `deploy/lightsail/bootstrap.sh` — one-time server setup (nginx, Python, Node 20, certbot, ufw, fail2ban)
- `deploy/lightsail/deploy.sh` — application release: installs deps, builds frontend, runs migrations, restarts the service
- `deploy/lightsail/deploy-production.sh` — one-command pull + release (used by CI)
- `deploy/lightsail/rollback.sh` — rollback to the previous successful release
- `deploy/lightsail/enable-ssl.sh` — Let's Encrypt TLS provisioning
- `deploy/lightsail/neurowatch.service` — systemd unit running `gunicorn` with uvicorn workers
- `deploy/lightsail/nginx.neurowatch.conf` — nginx reverse proxy (80/443 → 127.0.0.1:8000)
- `.github/workflows/deploy-lightsail.yml` — CI/CD via GitHub Actions over SSH

Full step-by-step guide: `docs/lightsail-deployment.md`.

## Security Note

A plaintext OpenAI key previously existed in local `.env`. The repository now uses placeholders. Rotate that key in your OpenAI dashboard and replace it with a new one only in local environment files that are not committed.
  
