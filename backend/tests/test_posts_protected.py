"""Tests for protected post writes: POST, PATCH, DELETE /posts."""

from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete, select

from app.db import get_engine
from app.main import create_app
from app.models.post import Post
from app.models.user import User


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def created_emails() -> Iterator[list[str]]:
    """Track emails created during a test; remove their posts + users after."""
    emails: list[str] = []
    try:
        yield emails
    finally:
        with Session(get_engine()) as session:
            for email in emails:
                user = session.exec(select(User).where(User.email == email)).first()
                if user is not None:
                    session.exec(delete(Post).where(Post.author_id == user.id))
                    session.exec(delete(User).where(User.id == user.id))
            session.commit()


def _make_user(client: TestClient, emails: list[str]) -> tuple[str, str]:
    """Register + login a fresh user; return (email, token)."""
    email = f"test-{uuid4()}@example.com"
    password = "supersecret"
    reg = client.post("/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 201
    emails.append(email)
    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    return email, login.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_post_requires_auth(client: TestClient) -> None:
    resp = client.post("/posts", json={"title": "no auth", "body": "x"})
    assert resp.status_code == 401


def test_create_post_success(
    client: TestClient, created_emails: list[str]
) -> None:
    email, token = _make_user(client, created_emails)
    me = client.get("/auth/me", headers=_auth(token)).json()

    title = f"Hello world {uuid4()}"
    resp = client.post(
        "/posts",
        json={"title": title, "body": "first body"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == title
    assert body["body"] == "first body"
    assert body["author_id"] == me["id"]
    # slug should be lowercased and hyphenated
    assert " " not in body["slug"]
    assert body["slug"] == body["slug"].lower()


def test_create_post_slug_collision(
    client: TestClient, created_emails: list[str]
) -> None:
    _, token = _make_user(client, created_emails)
    title = f"Same Title {uuid4()}"  # unique across runs, identical between the two creates

    a = client.post("/posts", json={"title": title, "body": "a"}, headers=_auth(token))
    b = client.post("/posts", json={"title": title, "body": "b"}, headers=_auth(token))
    assert a.status_code == 201
    assert b.status_code == 201

    slug_a = a.json()["slug"]
    slug_b = b.json()["slug"]
    assert slug_b == f"{slug_a}-2"


def test_patch_post_own(
    client: TestClient, created_emails: list[str]
) -> None:
    _, token = _make_user(client, created_emails)
    created = client.post(
        "/posts",
        json={"title": f"Patch me {uuid4()}", "body": "old"},
        headers=_auth(token),
    ).json()

    before_updated = created["updated_at"]
    resp = client.patch(
        f"/posts/{created['id']}",
        json={"body": "new body"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    after = resp.json()
    assert after["body"] == "new body"
    assert after["updated_at"] != before_updated


def test_patch_post_other_user_forbidden(
    client: TestClient, created_emails: list[str]
) -> None:
    _, token_a = _make_user(client, created_emails)
    _, token_b = _make_user(client, created_emails)

    created = client.post(
        "/posts",
        json={"title": f"A's post {uuid4()}", "body": "a"},
        headers=_auth(token_a),
    ).json()

    resp = client.patch(
        f"/posts/{created['id']}",
        json={"body": "hax"},
        headers=_auth(token_b),
    )
    assert resp.status_code == 403


def test_delete_post_own(
    client: TestClient, created_emails: list[str]
) -> None:
    _, token = _make_user(client, created_emails)
    created = client.post(
        "/posts",
        json={"title": f"Bye {uuid4()}", "body": "x"},
        headers=_auth(token),
    ).json()

    resp = client.delete(f"/posts/{created['id']}", headers=_auth(token))
    assert resp.status_code == 204

    follow = client.get(f"/posts/{created['id']}")
    assert follow.status_code == 404


def test_delete_post_other_user_forbidden(
    client: TestClient, created_emails: list[str]
) -> None:
    _, token_a = _make_user(client, created_emails)
    _, token_b = _make_user(client, created_emails)

    created = client.post(
        "/posts",
        json={"title": f"Mine {uuid4()}", "body": "a"},
        headers=_auth(token_a),
    ).json()

    resp = client.delete(f"/posts/{created['id']}", headers=_auth(token_b))
    assert resp.status_code == 403
