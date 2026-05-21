"""Application settings, loaded once and cached.

Uses pydantic-settings so env vars are typed and validated at startup,
instead of scattered ``os.getenv`` calls with stringly-typed defaults.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Reads from the repo-root ``.env`` file."""

    database_url: str = ""
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Origins allowed by CORS. Env var ``CORS_ORIGINS`` accepts a comma-
    # separated string (e.g. ``http://localhost:4200,https://app.example.com``)
    # and is parsed into a list. Explicit list (not ``*``) is required because
    # ``allow_credentials=True`` is incompatible with the wildcard origin.
    cors_origins: list[str] = ["http://localhost:4200"]

    # ``../.env`` because the app is installed from ``backend/`` but the
    # canonical .env lives at the repo root (shared with docker-compose).
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, v: object) -> object:
        """Accept comma-separated strings from env vars; pass lists through."""
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (built once per process)."""
    return Settings()
