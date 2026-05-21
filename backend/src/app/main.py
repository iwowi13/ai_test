"""FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routes.auth import router as auth_router
from app.routes.posts import router as posts_router


def create_app() -> FastAPI:
    """Build and return the FastAPI app.

    App-factory pattern: lets tests build a fresh app, and gives us a
    clean place to wire config / routers / middleware as they arrive.
    """
    settings = get_settings()
    app = FastAPI(title="ai_test backend", version="0.1.0")

    # Touch settings so misconfiguration fails at startup, not on first request.
    _ = settings

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    app.include_router(auth_router)
    app.include_router(posts_router)

    # Serve uploaded post images. Directory is created on first boot so
    # FastAPI's StaticFiles doesn't blow up on a fresh checkout.
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    return app


app = create_app()
