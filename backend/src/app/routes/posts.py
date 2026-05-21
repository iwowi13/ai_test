"""Posts routes — public reads + author-only writes."""

import mimetypes
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_user
from app.models.post import Post
from app.models.user import User
from app.schemas.post import PostCreate, PostOut, PostUpdate

router = APIRouter(prefix="/posts", tags=["posts"])


_SLUG_RE = re.compile(r"[^a-z0-9]+")
_UPLOAD_DIR = Path("uploads")
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
_UPLOAD_CHUNK = 64 * 1024


def _slugify(title: str) -> str:
    """Lowercase, replace runs of non-alphanum with ``-``, trim hyphens."""
    return _SLUG_RE.sub("-", title.lower()).strip("-") or "post"


def _unique_slug(session: Session, base: str) -> str:
    """Append ``-2``, ``-3``, ... until the slug is free."""
    slug = base
    n = 1
    while session.exec(select(Post).where(Post.slug == slug)).first() is not None:
        n += 1
        slug = f"{base}-{n}"
    return slug


def _get_or_404(session: Session, post_id: int) -> Post:
    post = session.get(Post, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    return post


def _require_author(post: Post, user: User) -> None:
    if post.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not the post author",
        )


@router.get("", response_model=list[PostOut])
def list_posts(session: Session = Depends(get_session)) -> list[Post]:
    """Return all posts, newest first. No pagination yet (out of scope)."""
    return list(session.exec(select(Post).order_by(Post.created_at.desc())).all())


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, session: Session = Depends(get_session)) -> Post:
    """Fetch one post by id. 404 if it doesn't exist."""
    return _get_or_404(session, post_id)


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    body: PostCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Post:
    """Create a post owned by the current user. Slug auto-derived."""
    slug = _unique_slug(session, _slugify(body.title))
    post = Post(
        title=body.title,
        slug=slug,
        body=body.body,
        author_id=current_user.id,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post


@router.patch("/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    body: PostUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Post:
    """Patch a post. Only the author may edit it."""
    post = _get_or_404(session, post_id)
    _require_author(post, current_user)

    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(post, field, value)
    post.updated_at = datetime.now(timezone.utc)

    session.add(post)
    session.commit()
    session.refresh(post)
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Delete a post. Only the author may delete it."""
    post = _get_or_404(session, post_id)
    _require_author(post, current_user)
    session.delete(post)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{post_id}/image", response_model=PostOut)
async def upload_post_image(
    post_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Post:
    """Attach an image to a post. Author only, image/* only, 5 MB max."""
    post = _get_or_404(session, post_id)
    _require_author(post, current_user)

    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    ext = mimetypes.guess_extension(content_type) or ".bin"
    # mimetypes returns .jpe for image/jpeg on some platforms; normalize.
    if ext == ".jpe":
        ext = ".jpg"

    _UPLOAD_DIR.mkdir(exist_ok=True)
    dest = _UPLOAD_DIR / f"{post_id}{ext}"

    total = 0
    with dest.open("wb") as out:
        while True:
            chunk = await file.read(_UPLOAD_CHUNK)
            if not chunk:
                break
            total += len(chunk)
            if total > _MAX_UPLOAD_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File too large (max 5 MB)",
                )
            out.write(chunk)

    post.image = f"/uploads/{post_id}{ext}"
    post.updated_at = datetime.now(timezone.utc)
    session.add(post)
    session.commit()
    session.refresh(post)
    return post

