from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, try_decode_access_token, verify_password
from app.models.user import User
from app.schemas.auth import AuthCredentials, SignupRequest


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


def get_auth_provider() -> AuthProvider:
    # Reserved seam for a future FirebaseAuthProvider.
    return LocalAuthProvider()
