"""Pydantic schemas for posts endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class PostOut(BaseModel):
    """Public post shape — matches the model 1:1 for now."""

    id: int
    title: str
    slug: str
    body: str
    image: str | None = None
    author_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PostCreate(BaseModel):
    """Body for ``POST /posts``. Slug is derived from the title server-side."""

    title: str = Field(min_length=1, max_length=200)
    body: str = ""


class PostUpdate(BaseModel):
    """Body for ``PATCH /posts/{id}``. All fields optional."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = None

