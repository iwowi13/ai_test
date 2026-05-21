# Project Context

- **Owner:** iwowi
- **Project:** Full-stack blog (learning project). Angular frontend + FastAPI backend + Postgres DB. Email/password auth, blog CRUD, timestamps. Step-by-step git commits with explanations. README.md for both frontend and backend.
- **Stack:** Angular, FastAPI (Python), PostgreSQL
- **Created:** 2026-05-20

## Learnings

<!-- Append new learnings below. -->
- 2026-05-20: Architecture chosen — `backend/` (FastAPI + SQLModel + Alembic, JWT via passlib/python-jose, images on filesystem under `backend/uploads/`) and `frontend/` (Angular standalone + Router + HttpClient + JWT interceptor). Postgres runs via root `docker-compose.yml` for simplicity. Build plan drafted in 26 steps across 4 phases (Foundation → Backend → Frontend public → Admin & polish); backend goes end-to-end before frontend touches real data.
- 2026-05-20: Step 1 done — scaffold + Postgres compose committed. Postgres 16-alpine, creds blog/blog/blog (fine for a learning project; real secrets go in `.env`, which is gitignored). `.env.example` is committed as the template. `backend/uploads/` is gitignored — it's runtime data, not source.
