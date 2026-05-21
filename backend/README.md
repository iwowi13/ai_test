# ai_test backend

FastAPI service for the blog learning project. Python 3.11+, `src/` layout,
pydantic-settings for config, pytest for tests.

## Quick start (Windows PowerShell)

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

> If activation fails with an execution-policy error, run once per user:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

## Verify

```powershell
curl http://localhost:8000/health
# {"ok": true}
```

Or open <http://localhost:8000/health> in a browser. Interactive docs:
<http://localhost:8000/docs>.

## Run tests

```powershell
pytest
```

## Project layout

```
backend/
├── pyproject.toml          # deps + tooling (ruff, pytest)
├── .env.example            # copy to repo-root .env
├── src/
│   └── app/
│       ├── __init__.py
│       ├── config.py       # Settings (pydantic-settings) + get_settings()
│       └── main.py         # create_app() + FastAPI instance
└── tests/
    ├── __init__.py
    └── test_health.py
```

We use the **`src/` layout**: source lives under `src/app/`, and the package
is installed (editable) into the venv. This prevents accidental imports of
local files instead of the installed package — the standard for modern
Python projects.

`create_app()` is an **app factory**: tests can build a fresh app, and it
gives us one clean place to wire routers/middleware as the project grows.

## Environment variables

The app reads from the repo-root `.env` file (see `.env.example` here, which
mirrors the root one). Variables:

| Var | Meaning | Default |
|-----|---------|---------|
| `DATABASE_URL` | SQLAlchemy URL for Postgres | *(empty until step 5)* |
| `JWT_SECRET` | Signing secret for auth tokens | `dev-secret` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_EXPIRE_MINUTES` | Token lifetime | `60` |

## Where things will go (later steps)

- `src/app/models/` — SQLModel tables (`User`, `Post`) — step 6–7
- `src/app/routes/` — auth + posts routers — step 9+
- `src/app/auth/` — password hashing + JWT helpers — step 8
- `alembic/` — migrations — step 5

## Contributing

Run the linter before committing:

```powershell
ruff check .
```

`pip install -e ".[dev]"` does an **editable install** (changes in `src/`
are picked up live) **with the `dev` optional-deps group** (pytest, httpx,
ruff). That's why one command sets up everything you need.
