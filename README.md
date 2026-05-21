# ai_test

Full-stack learning blog.

**Stack:** Angular (frontend) · FastAPI + Python (backend) · PostgreSQL (Docker)

## Quick start

```bash
docker compose up -d        # starts Postgres on localhost:5432
```

Then see [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md)
for app-specific run instructions (added in later steps).

Copy `.env.example` to `.env` before running the backend:

```bash
cp .env.example .env
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
