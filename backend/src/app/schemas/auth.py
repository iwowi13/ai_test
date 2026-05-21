"""Pydantic schemas for the auth endpoints.

Kept separate from SQLModel table classes so the wire format can evolve
without touching the database shape.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    """Body for ``POST /auth/register``."""

    email: EmailStr
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    """Body for ``POST /auth/login``."""

    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Public user shape — never includes the password hash."""

    id: int
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    """JWT bearer token response."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
