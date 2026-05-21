"""Tests for password hashing and JWT helpers."""

import time

import pytest

from app.security import (
    TokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_is_not_plaintext_and_verifies() -> None:
    plain = "correct horse battery staple"
    hashed = hash_password(plain)
    assert hashed != plain
    assert hashed.startswith("$2")  # bcrypt prefix
    assert verify_password(plain, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_hash_password_is_salted() -> None:
    """Two hashes of the same password differ (random salt)."""
    a = hash_password("same")
    b = hash_password("same")
    assert a != b
    assert verify_password("same", a)
    assert verify_password("same", b)


def test_token_roundtrip_carries_subject_and_claims() -> None:
    token = create_access_token("42")
    claims = decode_access_token(token)
    assert claims["sub"] == "42"
    assert "exp" in claims and "iat" in claims


def test_token_rejects_tampering() -> None:
    token = create_access_token("42")
    tampered = token[:-2] + ("AA" if token[-2:] != "AA" else "BB")
    with pytest.raises(TokenError):
        decode_access_token(tampered)


def test_token_rejects_expired() -> None:
    """A token whose expiry is already in the past must not decode."""
    # Negative expiry: ``exp`` is set to ~1 second ago.
    token = create_access_token("42", expires_minutes=-1)
    time.sleep(0.01)
    with pytest.raises(TokenError):
        decode_access_token(token)
