# NeuroWatch

NeuroWatch is now a production-oriented, two-tier application with a clean folder split:

- Frontend: Vite + React SPA (`frontend/`)
- Backend: FastAPI + SQLAlchemy + Alembic (`backend/`)
- Auth: secure httpOnly JWT cookie with a provider seam for future Firebase auth
- Session pipeline: typing + reaction + memory + voice ingestion, baseline comparison, local deterministic analysis fallback, optional OpenAI-enhanced analysis

## Prerequisites

- Node.js 18+
- Python 3.11+

## 1) Configure Environment

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

## GitHub -> Cloud Run deployment (no Dockerfile)

This repository includes CI/CD at `.github/workflows/deploy-cloud-run.yml`.
It deploys to Cloud Run using `gcloud run deploy --source backend` (Buildpacks), not a custom Dockerfile.

### One-time setup

1. In Google Cloud, enable APIs:
   - Cloud Run Admin API
   - Cloud Build API
   - Artifact Registry API
   - Secret Manager API

2. Create a deployer service account and grant roles:
   - `roles/run.admin`
   - `roles/cloudbuild.builds.editor`
   - `roles/artifactregistry.admin`
   - `roles/secretmanager.admin`
   - `roles/iam.serviceAccountUser` (for runtime service account usage)

3. In GitHub repository settings, add these secrets:
   - `GCP_SA_KEY` (JSON key for deployer service account)
   - `GCP_PROJECT_ID`
   - `GCP_REGION` (for example `asia-south1`)
   - `CLOUD_RUN_SERVICE` (for example `neurowatch-app`)
   - `CLOUD_RUN_RUNTIME_SA` (optional but recommended runtime service account email)
   - `CORS_ORIGINS` (public frontend URL)
   - `FIREBASE_PROJECT_ID`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `OPENAI_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`

### What the workflow does

- Builds frontend (`frontend/dist`)
- Copies static assets into `backend/frontend/dist`
- Runs Alembic migrations
- Syncs required values to Secret Manager
- Deploys Cloud Run service from source

After setup, deploy by pushing to `main` or manually running the workflow from GitHub Actions.

## GitHub -> AWS Lightsail deployment

For VM-based deployment on Lightsail (without Docker), use:

- `deploy/lightsail/bootstrap.sh` (one-time server setup)
- `deploy/lightsail/deploy.sh` (application release)
- `deploy/lightsail/deploy-production.sh` (one-command pull + release)
- `deploy/lightsail/rollback.sh` (rollback to previous stable release)
- `deploy/lightsail/enable-ssl.sh` (Let's Encrypt TLS)
- `.github/workflows/deploy-lightsail.yml` (GitHub Actions SSH deployment)

Detailed guide: `docs/lightsail-deployment.md`.
These scripts build both frontend and backend, run migrations, and restart services.

## Security Note

A plaintext OpenAI key previously existed in local `.env`. The repository now uses placeholders. Rotate that key in your OpenAI dashboard and replace it with a new one only in local environment files that are not committed.
  