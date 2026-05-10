import json
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[3] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "NeuroWatch API"
    api_prefix: str = "/api/v1"
    environment: str = "development"

    database_url: str = "sqlite+pysqlite:///./backend/data/neurowatch.db"
    jwt_secret: str = "change-me"
    jwt_issuer: str = "neurowatch"
    jwt_ttl_seconds: int = 60 * 60 * 24 * 30
    auth_provider: str = "local"

    openai_api_key: str | None = None
    cors_origins: str = "http://localhost:5173"
    firebase_project_id: str | None = None
    firebase_service_account_json: str | None = None
    firebase_client_email: str | None = None
    firebase_private_key: str | None = None

    rate_limit_auth: str = "10/minute"
    rate_limit_default: str = "60/minute"

    @property
    def normalized_database_url(self) -> str:
        """
        Accept provider URLs like postgresql:// and map to SQLAlchemy psycopg dialect.
        """
        value = self.database_url.strip()
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        return value

    @property
    def secure_cookies(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def firebase_private_key_normalized(self) -> str | None:
        if not self.firebase_private_key:
            return None
        return self.firebase_private_key.replace("\\n", "\n")

    @property
    def cors_origin_list(self) -> List[str]:
        value = self.cors_origins
        if value.startswith("["):
            return json.loads(value)
        return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
