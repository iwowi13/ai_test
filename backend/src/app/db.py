"""Database engine and session factory.

One engine per process (cached). ``get_session`` is a FastAPI dependency
that yields a SQLModel ``Session`` and ensures it is closed afterwards.
"""

from collections.abc import Iterator
from functools import lru_cache

from sqlmodel import Session, create_engine
from sqlalchemy.engine import Engine

from app.config import get_settings


@lru_cache
def get_engine() -> Engine:
    """Return a cached SQLAlchemy engine built from ``DATABASE_URL``."""
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.example to .env at the repo root."
        )
    # ``pool_pre_ping`` avoids stale connections after the db restarts.
    return create_engine(settings.database_url, pool_pre_ping=True, echo=False)


def get_session() -> Iterator[Session]:
    """FastAPI dependency: yield a session, close it on request teardown."""
    with Session(get_engine()) as session:
        yield session
