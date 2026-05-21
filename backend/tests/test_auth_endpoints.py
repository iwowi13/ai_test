"""Tests for /auth/register and /auth/login.

Each test uses a unique email and cleans up after itself so we don't
pollute the dev database.
"""

from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.db import get_engine
from app.main import create_app
from app.models.user import User
from app.security import create_access_token, decode_access_token


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def fresh_email() -> Iterator[str]:
    """Yield a unique email and delete that user from the DB afterwards."""
    email = f"test-{uuid4()}@example.com"
    try:
        yield email
    finally:
        with Session(get_engine()) as session:
            session.exec(delete(User).where(User.email == email))
            session.commit()


def test_register_success(client: TestClient, fresh_email: str) -> None:
    resp = client.post(
        "/auth/register",
        json={"email": fresh_email, "password": "supersecret"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == fresh_email
    assert isinstance(body["id"], int)
    assert "created_at" in body
    # Password (plain or hashed) must not be echoed back.
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_duplicate_email(client: TestClient, fresh_email: str) -> None:
    first = client.post(
        "/auth/register",
        json={"email": fresh_email, "password": "supersecret"},
    )
    assert first.status_code == 201

    second = client.post(
        "/auth/register",
        json={"email": fresh_email, "password": "anotherpass"},
    )
    assert second.status_code == 409


def test_register_short_password(client: TestClient) -> None:
    # Use a unique email; a 422 means no row was created so no cleanup needed.
    resp = client.post(
        "/auth/register",
        json={"email": f"test-{uuid4()}@example.com", "password": "short"},
    )
    assert resp.status_code == 422


def test_login_success(client: TestClient, fresh_email: str) -> None:
    password = "supersecret"
    reg = client.post(
        "/auth/register",
        json={"email": fresh_email, "password": password},
    )
    assert reg.status_code == 201
    user_id = reg.json()["id"]

    resp = client.post(
        "/auth/login",
        json={"email": fresh_email, "password": password},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]

    payload = decode_access_token(body["access_token"])
    assert payload["sub"] == str(user_id)


def test_login_wrong_password(client: TestClient, fresh_email: str) -> None:
    reg = client.post(
        "/auth/register",
        json={"email": fresh_email, "password": "supersecret"},
    )
    assert reg.status_code == 201

    resp = client.post(
        "/auth/login",
        json={"email": fresh_email, "password": "wrongpass1"},
    )
    assert resp.status_code == 401


def test_login_unknown_email(client: TestClient) -> None:
    resp = client.post(
        "/auth/login",
        json={"email": f"missing-{uuid4()}@example.com", "password": "whatever1"},
    )
    assert resp.status_code == 401


def test_me_success(client: TestClient, fresh_email: str) -> None:
    password = "supersecret"
    reg = client.post("/auth/register", json={"email": fresh_email, "password": password})
    assert reg.status_code == 201
    user_id = reg.json()["id"]

    login = client.post("/auth/login", json={"email": fresh_email, "password": password})
    token = login.json()["access_token"]

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == user_id
    assert body["email"] == fresh_email


def test_me_no_token(client: TestClient) -> None:
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_bad_token(client: TestClient) -> None:
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert resp.status_code == 401


def test_me_expired_token(client: TestClient, fresh_email: str) -> None:
    # Register so the user exists; otherwise we couldn't tell expired from missing.
    reg = client.post(
        "/auth/register",
        json={"email": fresh_email, "password": "supersecret"},
    )
    assert reg.status_code == 201
    user_id = reg.json()["id"]

    expired = create_access_token(subject=str(user_id), expires_minutes=-1)
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert resp.status_code == 401
