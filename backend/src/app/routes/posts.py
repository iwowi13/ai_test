"""Posts routes — public reads only at this step."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db import get_session
from app.models.post import Post
from app.schemas.post import PostOut

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=list[PostOut])
def list_posts(session: Session = Depends(get_session)) -> list[Post]:
    """Return all posts, newest first. No pagination yet (out of scope)."""
    return list(session.exec(select(Post).order_by(Post.created_at.desc())).all())


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, session: Session = Depends(get_session)) -> Post:
    """Fetch one post by id. 404 if it doesn't exist."""
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    return post
