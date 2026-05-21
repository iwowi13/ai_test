"""Password hashing and JWT helpers.

Two concerns, one module — both are tiny and both belong to "auth primitives".

Passwords use bcrypt via passlib; tokens use HS256 (or whatever
``JWT_ALGORITHM`` says) via python-jose. Plaintext passwords NEVER leave
this module.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings


class TokenError(Exception):
    """Raised when a token is missing, malformed, expired, or tampered with."""


# bcrypt is the only scheme we use; passlib's CryptContext lets us add
# more later (e.g., argon2) without breaking existing hashes.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return a bcrypt hash for ``plain``. The plaintext is never stored."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True iff ``plain`` matches the stored bcrypt ``hashed`` value."""
    return _pwd_context.verify(plain, hashed)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    """Encode a JWT for ``subject`` (typically the user id as a string).

    The token carries ``sub``, ``iat``, and ``exp`` claims. Expiry defaults
    to the configured ``JWT_EXPIRE_MINUTES``.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(
        minutes=expires_minutes
        if expires_minutes is not None
        else settings.jwt_expire_minutes
    )
    payload = {"sub": subject, "iat": now, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode + verify a JWT. Raises ``TokenError`` on any failure."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise TokenError(str(exc)) from exc
