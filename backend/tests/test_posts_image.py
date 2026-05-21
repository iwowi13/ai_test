"""Tests for POST /posts/{id}/image."""

import io
from collections.abc import Iterator
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete, select

from app.db import get_engine
from app.main import create_app
from app.models.post import Post
from app.models.user import User


PNG_1x1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def created_emails() -> Iterator[list[str]]:
    """Track emails created during a test; remove their posts + users after."""
    emails: list[str] = []
    uploaded_paths: list[Path] = []
    try:
        yield emails
    finally:
        with Session(get_engine()) as session:
            for email in emails:
                user = session.exec(select(User).where(User.email == email)).first()
                if user is not None:
                    # Find any image files attached to this user's posts.
                    posts = session.exec(
                        select(Post).where(Post.author_id == user.id)
                    ).all()
                    for p in posts:
                        if p.image:
                            uploaded_paths.append(
                                Path("uploads") / Path(p.image).name
                            )
                    session.exec(delete(Post).where(Post.author_id == user.id))
                    session.exec(delete(User).where(User.id == user.id))
            session.commit()
        for path in uploaded_paths:
            path.unlink(missing_ok=True)


def _make_user(client: TestClient, emails: list[str]) -> str:
    email = f"test-{uuid4()}@example.com"
    password = "supersecret"
    client.post("/auth/register", json={"email": email, "password": password})
    emails.append(email)
    login = client.post("/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_post(client: TestClient, token: str) -> dict:
    resp = client.post(
        "/posts",
        json={"title": f"Img post {uuid4()}", "body": "x"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    return resp.json()


def test_upload_image_requires_auth(
    client: TestClient, created_emails: list[str]
) -> None:
    token = _make_user(client, created_emails)
    post = _create_post(client, token)

    resp = client.post(
        f"/posts/{post['id']}/image",
        files={"file": ("a.png", io.BytesIO(PNG_1x1), "image/png")},
    )
    assert resp.status_code == 401


def test_upload_image_other_user_forbidden(
    client: TestClient, created_emails: list[str]
) -> None:
    token_a = _make_user(client, created_emails)
    token_b = _make_user(client, created_emails)
    post = _create_post(client, token_a)

    resp = client.post(
        f"/posts/{post['id']}/image",
        files={"file": ("a.png", io.BytesIO(PNG_1x1), "image/png")},
        headers=_auth(token_b),
    )
    assert resp.status_code == 403


def test_upload_image_success(
    client: TestClient, created_emails: list[str]
) -> None:
    token = _make_user(client, created_emails)
    post = _create_post(client, token)

    resp = client.post(
        f"/posts/{post['id']}/image",
        files={"file": ("a.png", io.BytesIO(PNG_1x1), "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["image"] is not None
    assert body["image"].startswith("/uploads/")
    assert body["image"].endswith(".png")

    # File exists on disk under backend/uploads/
    on_disk = Path("uploads") / Path(body["image"]).name
    assert on_disk.exists(), f"missing upload file at {on_disk}"

    # GET /posts/{id} returns the same image path.
    detail = client.get(f"/posts/{post['id']}").json()
    assert detail["image"] == body["image"]


def test_upload_rejects_non_image(
    client: TestClient, created_emails: list[str]
) -> None:
    token = _make_user(client, created_emails)
    post = _create_post(client, token)

    resp = client.post(
        f"/posts/{post['id']}/image",
        files={"file": ("a.txt", io.BytesIO(b"hello"), "text/plain")},
        headers=_auth(token),
    )
    assert resp.status_code == 400
