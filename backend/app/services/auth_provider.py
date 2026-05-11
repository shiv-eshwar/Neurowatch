import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, try_decode_access_token, verify_password
from app.models.user import User
from app.schemas.auth import AuthCredentials, SignupRequest

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    from firebase_admin import credentials
except Exception:  # noqa: BLE001
    firebase_admin = None
    firebase_auth = None
    credentials = None

logger = logging.getLogger(__name__)


class AuthError(Exception):
    pass


@dataclass
class AuthenticatedUser:
    id: str
    email: str
    display_name: str | None


class AuthProvider(ABC):
    @abstractmethod
    def signup(self, db: Session, payload: SignupRequest) -> tuple[AuthenticatedUser, str]:
        raise NotImplementedError

    @abstractmethod
    def login(self, db: Session, payload: AuthCredentials) -> tuple[AuthenticatedUser, str]:
        raise NotImplementedError

    @abstractmethod
    def verify_token(self, token: str) -> AuthenticatedUser | None:
        raise NotImplementedError


class LocalAuthProvider(AuthProvider):
    def signup(self, db: Session, payload: SignupRequest) -> tuple[AuthenticatedUser, str]:
        existing = db.scalar(select(User).where(User.email == payload.email))
        if existing:
            raise AuthError("An account already exists for that email.")

        user = User(
            email=payload.email,
            display_name=payload.display_name,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user_id=user.id, email=user.email, display_name=user.display_name)
        return AuthenticatedUser(id=user.id, email=user.email, display_name=user.display_name), token

    def login(self, db: Session, payload: AuthCredentials) -> tuple[AuthenticatedUser, str]:
        user = db.scalar(select(User).where(User.email == payload.email))
        if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
            raise AuthError("Incorrect email or password.")

        user.last_login_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user_id=user.id, email=user.email, display_name=user.display_name)
        return AuthenticatedUser(id=user.id, email=user.email, display_name=user.display_name), token

    def verify_token(self, token: str) -> AuthenticatedUser | None:
        claims = try_decode_access_token(token)
        if not claims:
            return None
        sub = claims.get("sub")
        if not isinstance(sub, str):
            return None
        return AuthenticatedUser(
            id=sub,
            email=claims.get("email") or "",
            display_name=claims.get("display_name"),
        )


@lru_cache(maxsize=1)
def _get_firebase_app():
    if firebase_admin is None or firebase_auth is None or credentials is None:
        raise AuthError("firebase-admin is not installed on the backend runtime.")

    settings = get_settings()
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    service_account_json = settings.firebase_service_account_json
    if service_account_json:
        try:
            cert_data = json.loads(service_account_json)
            return firebase_admin.initialize_app(credentials.Certificate(cert_data))
        except json.JSONDecodeError as exc:
            raise AuthError("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.") from exc

    if settings.firebase_client_email and settings.firebase_private_key_normalized and settings.firebase_project_id:
        cert_data = {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "client_email": settings.firebase_client_email,
            "private_key": settings.firebase_private_key_normalized,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        return firebase_admin.initialize_app(credentials.Certificate(cert_data))

    if settings.firebase_project_id:
        # Cloud environments can use application default credentials.
        return firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

    raise AuthError(
        "Firebase Admin credentials are missing. Configure FIREBASE_SERVICE_ACCOUNT_JSON or "
        "FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY."
    )


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    settings = get_settings()

    admin_error: Exception | None = None
    fallback_error: Exception | None = None

    try:
        app = _get_firebase_app()
        decoded = firebase_auth.verify_id_token(id_token, app=app, check_revoked=False)
        return decoded
    except AuthError as exc:
        admin_error = exc
        logger.error("Firebase Admin init failed: %s", exc)
    except Exception as exc:  # noqa: BLE001
        admin_error = exc
        logger.warning(
            "firebase_admin.verify_id_token rejected token: %s: %s",
            exc.__class__.__name__,
            exc,
        )

    if settings.firebase_project_id:
        try:
            request_adapter = google_requests.Request()
            decoded = google_id_token.verify_firebase_token(
                id_token,
                request_adapter,
                audience=settings.firebase_project_id,
            )
            if decoded:
                return decoded
        except Exception as exc:  # noqa: BLE001
            fallback_error = exc
            logger.warning(
                "google.oauth2.id_token fallback rejected token: %s: %s",
                exc.__class__.__name__,
                exc,
            )

    cause = admin_error or fallback_error
    detail = f" ({cause.__class__.__name__}: {cause})" if cause else ""
    raise AuthError(
        "Invalid or expired Firebase ID token. Confirm frontend and backend use the same Firebase project "
        "and that FIREBASE_PROJECT_ID is configured." + detail
    )


def authenticate_with_firebase_token(db: Session, id_token: str) -> tuple[AuthenticatedUser, str]:
    decoded = verify_firebase_id_token(id_token)
    email = decoded.get("email")
    if not isinstance(email, str) or not email.strip():
        raise AuthError("Firebase token does not include an email.")

    normalized_email = email.strip().lower()
    display_name = decoded.get("name")
    if not isinstance(display_name, str):
        display_name = None

    user = db.scalar(select(User).where(User.email == normalized_email))
    if not user:
        user = User(
            email=normalized_email,
            display_name=display_name,
            password_hash=None,
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if display_name and user.display_name != display_name:
            user.display_name = display_name
        user.last_login_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user_id=user.id, email=user.email, display_name=user.display_name)
    return AuthenticatedUser(id=user.id, email=user.email, display_name=user.display_name), token


def get_auth_provider() -> AuthProvider:
    # Reserved seam for a future FirebaseAuthProvider.
    return LocalAuthProvider()
