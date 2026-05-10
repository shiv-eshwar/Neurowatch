# NeuroWatch FastAPI Backend

## Stack

- FastAPI
- SQLAlchemy 2
- Alembic
- JWT cookie auth
- Pydantic v2
- SlowAPI rate limiting

## Run

From repository root:

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --reload --port 8000 --app-dir backend
```

If `frontend/dist` exists, FastAPI also serves the SPA at `/`.

## Database

Apply migrations:

```bash
cd backend
alembic upgrade head
```

## API Prefix

All API routes are under:

`/api/v1`

## Auth Provider Seam

Current provider is local JWT (`LocalAuthProvider`) in `app/services/auth_provider.py`.

To migrate to Firebase later:

1. Add a `FirebaseAuthProvider` implementing the `AuthProvider` interface.
2. Switch provider selection in `get_auth_provider()`.
3. Keep route contracts unchanged.
