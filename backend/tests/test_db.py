"""Smoke tests for the database connection and Alembic wiring."""

from sqlalchemy import text

from app.db import get_engine


def test_engine_connects_and_runs_select_one() -> None:
    """The engine built from DATABASE_URL can talk to Postgres."""
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("select 1")).scalar_one()
    assert result == 1


def test_alembic_current_runs() -> None:
    """``alembic current`` works against the configured database.

    No migrations exist yet (added in Step 6+), so this just confirms
    env.py loads the URL from settings without crashing.
    """
    import subprocess
    import sys
    from pathlib import Path

    backend_dir = Path(__file__).resolve().parents[1]
    proc = subprocess.run(
        [sys.executable, "-m", "alembic", "current"],
        cwd=backend_dir,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert proc.returncode == 0, f"alembic failed: {proc.stderr}"
