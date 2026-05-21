"""Pydantic schemas for posts endpoints."""

from datetime import datetime

from pydantic import BaseModel


class PostOut(BaseModel):
    """Public post shape — matches the model 1:1 for now."""

    id: int
    title: str
    slug: str
    body: str
    author_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
