"""FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

    # CORS: registered BEFORE routers so preflight OPTIONS are handled for
    # every route. Explicit origin list (not "*") because allow_credentials
    # is True — Starlette refuses to echo "*" with credentials.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
