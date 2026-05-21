"""SQLModel ORM models. Importing this package registers all tables on
``SQLModel.metadata`` so Alembic autogenerate can see them.
"""

from app.models.post import Post
from app.models.user import User

__all__ = ["Post", "User"]
