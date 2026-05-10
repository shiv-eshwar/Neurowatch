from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.models import session, user  # noqa: F401


def init_db() -> None:
    # For local SQLite development, keep zero-friction table bootstrap.
    # For Postgres/production, schema should be managed only via Alembic migrations.
    if get_settings().normalized_database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
