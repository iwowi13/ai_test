"""Post model — blog entries authored by a User."""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Post(SQLModel, table=True):
    """A blog post. ``slug`` is the URL identifier and must be unique."""

    __tablename__ = "posts"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=200)
    slug: str = Field(index=True, unique=True, max_length=200)
    body: str = Field(default="")
    image: str | None = Field(default=None, max_length=255)
    author_id: int = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
