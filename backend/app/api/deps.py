from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    auth_user = getattr(request.state, "auth_user", None)
    if not auth_user:
        return None
    return db.get(User, auth_user.id)


def require_user(current_user: User | None = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return current_user
