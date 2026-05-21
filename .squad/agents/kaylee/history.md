# Project Context

- **Owner:** iwowi
- **Project:** Full-stack blog (learning project). Angular frontend + FastAPI backend + Postgres DB. Email/password auth, blog CRUD, timestamps. Step-by-step git commits with explanations. README.md for both frontend and backend.
- **Stack:** Angular, FastAPI (Python), PostgreSQL
- **Created:** 2026-05-20

## Learnings

<!-- Append new learnings below. -->

- **Step 2 (2026-05-20):** Backend bootstrapped. Uses **`src/` layout** (`backend/src/app/`) installed editable, **app-factory pattern** (`create_app()` in `main.py`), **pydantic-settings** `Settings` reading repo-root `.env` (path `../.env` from `backend/`). Python 3.11+ in `pyproject.toml` with `setuptools` build backend; dev extras = pytest + httpx + ruff. Ruff configured: line 100, select `E,F,I,B,UP`. Pytest configured: `testpaths=["tests"]`, `pythonpath=["src"]`.
- **Local environment note:** `py` launcher is NOT installed on iwowi's machine — system Python is Anaconda 3.13 at `C:\ProgramData\anaconda3`. Use `python -m venv .venv` directly, not `py -3.11`. README still recommends `py -3.11` for portability; venv was created with whatever `python` resolved to (3.13.5 in this case) and tests pass.
- **Health contract:** `GET /health` → `{"ok": true}` (boolean). Smoke test lives at `backend/tests/test_health.py` using `fastapi.testclient.TestClient`.
