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
├── alembic.ini             # migrations config
├── alembic/versions/       # users, posts, post.image migrations
├── src/
│   └── app/
│       ├── config.py       # Settings (pydantic-settings)
│       ├── db.py           # engine + session
│       ├── deps.py         # get_current_user dependency
│       ├── security.py     # password hashing + JWT helpers
│       ├── main.py         # create_app() + /uploads static mount
│       ├── models/         # User, Post (SQLModel)
│       ├── schemas/        # Pydantic request/response shapes
│       └── routes/         # auth + posts routers
├── tests/                  # pytest suite (36 tests)
└── uploads/                # runtime image storage (gitignored)
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

## API surface

See the Posts and Auth API contracts in `../.squad/decisions.md`. Highlights:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /posts`, `GET /posts/{id}` — public reads
- `POST/PATCH/DELETE /posts` — author-only writes
- `POST /posts/{id}/image` — multipart upload (5 MB cap, `image/*` only)
- `/uploads/*` — FastAPI static mount serving uploaded images

## Contributing

Run the linter before committing:

```powershell
ruff check .
```

`pip install -e ".[dev]"` does an **editable install** (changes in `src/`
are picked up live) **with the `dev` optional-deps group** (pytest, httpx,
ruff). That's why one command sets up everything you need.
