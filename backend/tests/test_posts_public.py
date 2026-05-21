"""Tests for public post reads: GET /posts and GET /posts/{id}."""

from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.db import get_engine
from app.main import create_app
from app.models.post import Post
from app.models.user import User
from app.security import hash_password


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def seeded_post() -> Iterator[tuple[int, int, str, str]]:
    """Create a user + post directly in the DB; remove both in teardown.

    Yields (user_id, post_id, title, slug) as plain values so the test
    doesn't touch detached ORM instances after the session closes.
    """
    email = f"test-{uuid4()}@example.com"
    slug = f"seeded-{uuid4()}"
    title = "A seeded post"
    body_text = "Hello from a fixture."

    with Session(get_engine()) as session:
        user = User(email=email, hashed_password=hash_password("supersecret"))
        session.add(user)
        session.commit()
        session.refresh(user)
        user_id = user.id

        post = Post(title=title, slug=slug, body=body_text, author_id=user_id)
        session.add(post)
        session.commit()
        session.refresh(post)
        post_id = post.id

    try:
        yield user_id, post_id, title, slug
    finally:
        with Session(get_engine()) as session:
            session.exec(delete(Post).where(Post.id == post_id))
            session.exec(delete(User).where(User.id == user_id))
            session.commit()


def test_list_posts_empty_ok(client: TestClient) -> None:
    # Dev DB is shared, so we just assert the contract: 200 + list.
    resp = client.get("/posts")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_post_by_id(
    client: TestClient, seeded_post: tuple[int, int, str, str]
) -> None:
    user_id, post_id, title, slug = seeded_post
    resp = client.get(f"/posts/{post_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == post_id
    assert body["title"] == title
    assert body["slug"] == slug
    assert body["body"] == "Hello from a fixture."
    assert body["author_id"] == user_id
    assert "created_at" in body
    assert "updated_at" in body


def test_get_post_not_found(client: TestClient) -> None:
    resp = client.get("/posts/999999999")
    assert resp.status_code == 404
