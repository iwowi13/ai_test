"""Tests for the Post model and the posts table."""

import uuid

from sqlalchemy import text
from sqlmodel import Session, select

from app.db import get_engine
from app.models import Post, User


def _u(s: str) -> str:
    return f"{s}-{uuid.uuid4().hex[:8]}"


def test_posts_table_exists() -> None:
    """Migration created the ``posts`` table with expected columns."""
    engine = get_engine()
    with engine.connect() as conn:
        cols = conn.execute(
            text(
                "select column_name from information_schema.columns "
                "where table_name = 'posts' order by ordinal_position"
            )
        ).scalars().all()
    assert cols == [
        "id",
        "title",
        "slug",
        "body",
        "author_id",
        "created_at",
        "updated_at",
    ]


def test_post_requires_author_and_roundtrips() -> None:
    """A Post can be created against a real User and read back by slug."""
    engine = get_engine()
    slug = _u("hello")
    with Session(engine) as session:
        author = User(email=_u("author") + "@example.com", hashed_password="x")
        session.add(author)
        session.commit()
        session.refresh(author)
        assert author.id is not None

        post = Post(
            title="Hello, world",
            slug=slug,
            body="first post",
            author_id=author.id,
        )
        session.add(post)
        session.commit()
        session.refresh(post)
        assert post.id is not None

        found = session.exec(select(Post).where(Post.slug == slug)).one()
        assert found.author_id == author.id
        assert found.title == "Hello, world"

        # Cleanup keeps the test idempotent against the shared dev db.
        session.delete(found)
        session.delete(author)
        session.commit()
