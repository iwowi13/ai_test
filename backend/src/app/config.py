"""Application settings, loaded once and cached.

Uses pydantic-settings so env vars are typed and validated at startup,
instead of scattered ``os.getenv`` calls with stringly-typed defaults.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Reads from the repo-root ``.env`` file."""

    database_url: str = ""
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # ``../.env`` because the app is installed from ``backend/`` but the
    # canonical .env lives at the repo root (shared with docker-compose).
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (built once per process)."""
    return Settings()
