"""FastAPI application entry point."""

from fastapi import FastAPI

from app.config import get_settings


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

    return app


app = create_app()
