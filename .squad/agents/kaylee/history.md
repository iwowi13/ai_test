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
- **Steps 2, 5, 6, 7, 8 (2026-05-20, backfilled):** Built the backend spine end-to-end.
  - **Step 2 (`4b264ce`):** `pyproject.toml` (src layout, app-factory, pydantic-settings) + `GET /health` + pytest harness.
  - **Step 5 (`5d82e6a`):** `app/db.py` cached SQLModel engine + `get_session` FastAPI dep; Alembic scaffolded with `env.py` reading `DATABASE_URL` from `app.config.get_settings()` so `.ini` and app share one source of truth.
  - **Step 6 (`90f3a0c`):** `User` SQLModel (id, unique indexed email, hashed_password, created_at) + first Alembic revision. Set `target_metadata = SQLModel.metadata` and added `import sqlmodel` to `script.py.mako` so future autogen revisions resolve `sqlmodel.sql.sqltypes.AutoString`.
  - **Step 7 (`305658a`):** `Post` SQLModel (FK → `users.id`, indexed slug + author_id, timestamps) + second migration.
  - **Step 8 (`4811b72`):** `app/security.py` — `hash_password`/`verify_password` (passlib+bcrypt), `create_access_token`/`decode_access_token` (HS256 via python-jose), `TokenError` for missing/expired/tampered.
  - **Gotcha — bcrypt pin:** Had to pin `bcrypt<4.1` in `pyproject.toml`. `passlib` 1.7.4 reads `bcrypt.__about__` at import time, which bcrypt removed in 4.1+; without the pin passlib explodes on the first hash call.
