import json
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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

    rate_limit_auth: str = "10/minute"
    rate_limit_default: str = "60/minute"

    @property
    def secure_cookies(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origin_list(self) -> List[str]:
        value = self.cors_origins
        if value.startswith("["):
            return json.loads(value)
        return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
