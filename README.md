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

## Security Note

A plaintext OpenAI key previously existed in local `.env`. The repository now uses placeholders. Rotate that key in your OpenAI dashboard and replace it with a new one only in local environment files that are not committed.
  