# ai_test

Full-stack learning blog — **v0.1**.

**Stack:** Angular 20 (frontend) · FastAPI + Python 3.11 (backend) · PostgreSQL 16 (Docker)

Features: public home page with a Swiper carousel, per-post detail, About page, JWT login, and a login-gated admin UI for create / edit / delete with image upload.

## Quick start

```powershell
# 1. Start Postgres
docker compose up -d

# 2. Backend (http://localhost:8000)
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# 3. Frontend (http://localhost:4200) — new terminal
cd frontend
npm install
npm start
```

Copy `.env.example` to `.env` before running the backend:

```powershell
cp .env.example .env
```

Full instructions: [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md).

## Tests

```powershell
# Backend (from backend/, venv active)
pytest

# Frontend (from frontend/)
npm test -- --watch=false --browsers=ChromeHeadless
```

## Repo layout

```
ai_test/
├─ backend/          FastAPI + SQLModel + Alembic
├─ frontend/         Angular (standalone components)
├─ .squad/           Squad team config (see .squad/team.md)
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

## Team

This project is built using the [Squad](https://github.com/bradygaster/squad) framework.
See [`.squad/team.md`](.squad/team.md) for who does what.
