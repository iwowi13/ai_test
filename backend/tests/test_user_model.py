"""Tests for the User model and the users table."""

import uuid

from sqlalchemy import text
from sqlmodel import Session, select

from app.db import get_engine
from app.models import User


def _unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:8]}@example.com"


def test_users_table_exists() -> None:
    """Migration created the ``users`` table with expected columns."""
    engine = get_engine()
    with engine.connect() as conn:
        cols = conn.execute(
            text(
                "select column_name from information_schema.columns "
                "where table_name = 'users' order by ordinal_position"
            )
        ).scalars().all()
    assert cols == ["id", "email", "hashed_password", "created_at"]


def test_user_insert_and_query_roundtrip() -> None:
    """A User can be inserted and read back via SQLModel."""
    engine = get_engine()
    email = _unique_email()
    with Session(engine) as session:
        user = User(email=email, hashed_password="not-a-real-hash")
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None
        assert user.created_at is not None

        found = session.exec(select(User).where(User.email == email)).one()
        assert found.id == user.id

        # Cleanup keeps the test idempotent against the shared dev db.
        session.delete(found)
        session.commit()
