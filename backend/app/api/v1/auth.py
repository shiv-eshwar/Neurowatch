from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.middleware.auth import AUTH_COOKIE_NAME
from app.middleware.rate_limit import limiter
from app.models.user import User
from app.schemas.auth import AuthCredentials, AuthResponse, FirebaseAuthRequest, SignupRequest, UserResponse
from app.services.auth_provider import AuthError, authenticate_with_firebase_token, get_auth_provider

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_kwargs():
    settings = get_settings()
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": settings.secure_cookies,
        "max_age": settings.jwt_ttl_seconds,
        "path": "/",
    }


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at or datetime.now(timezone.utc),
    )


@router.post("/signup", response_model=AuthResponse)
@limiter.limit(get_settings().rate_limit_auth)
def signup(request: Request, payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user, token = get_auth_provider().signup(db, payload)
    except AuthError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    db_user = db.get(User, user.id)
    response.set_cookie(AUTH_COOKIE_NAME, token, **_cookie_kwargs())
    return AuthResponse(user=_to_user_response(db_user))


@router.post("/login", response_model=AuthResponse)
@limiter.limit(get_settings().rate_limit_auth)
def login(request: Request, payload: AuthCredentials, response: Response, db: Session = Depends(get_db)):
    try:
        user, token = get_auth_provider().login(db, payload)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    db_user = db.get(User, user.id)
    response.set_cookie(AUTH_COOKIE_NAME, token, **_cookie_kwargs())
    return AuthResponse(user=_to_user_response(db_user))


@router.post("/firebase", response_model=AuthResponse)
@limiter.limit(get_settings().rate_limit_auth)
def login_with_firebase(
    request: Request,
    payload: FirebaseAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        user, token = authenticate_with_firebase_token(db, payload.id_token)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    db_user = db.get(User, user.id)
    response.set_cookie(AUTH_COOKIE_NAME, token, **_cookie_kwargs())
    return AuthResponse(user=_to_user_response(db_user))


@router.post("/logout")
def logout(response: Response):
    response.set_cookie(AUTH_COOKIE_NAME, "", httponly=True, samesite="lax", max_age=0, path="/")
    return {"ok": True}


@router.get("/me", response_model=AuthResponse)
def me(current_user: User | None = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return AuthResponse(user=_to_user_response(current_user))
