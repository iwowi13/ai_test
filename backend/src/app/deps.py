"""Shared FastAPI dependencies.

``get_current_user`` is the gate for every protected endpoint: it decodes
the JWT, looks the user up, and 401s on anything wrong. Endpoints just
declare ``current_user: User = Depends(get_current_user)`` and forget
about the plumbing.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.db import get_session
from app.models.user import User
from app.security import TokenError, decode_access_token

# tokenUrl is purely for OpenAPI's "Authorize" button — our real login
# endpoint accepts JSON, not the OAuth2 form body, but the scheme still
# tells Swagger UI where to send users.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Session = Depends(get_session),
) -> User:
    """Resolve the bearer token to a ``User`` or raise 401."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
    except TokenError as exc:
        raise credentials_exception from exc

    sub = payload.get("sub")
    if sub is None:
        raise credentials_exception
    try:
        user_id = int(sub)
    except (TypeError, ValueError) as exc:
        raise credentials_exception from exc

    user = session.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user
