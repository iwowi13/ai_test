"""CORS middleware behavior for the Angular dev server."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_preflight_allowed_origin_echoes_back() -> None:
    """Preflight from the configured Angular origin should succeed."""
    response = client.options(
        "/auth/register",
        headers={
            "Origin": "http://localhost:4200",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:4200"


def test_preflight_unlisted_origin_not_echoed() -> None:
    """Preflight from an origin not in the allowlist must not be echoed back."""
    response = client.options(
        "/auth/register",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.headers.get("access-control-allow-origin") != "http://evil.example.com"
