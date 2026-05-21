# Squad Team

> ai_test — Full-stack learning blog (Angular + FastAPI + Postgres)

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| 🏗️ Mal | Lead / Architect | [charter](agents/mal/charter.md) | active |
| ⚛️ Inara | Frontend Dev (Angular) | [charter](agents/inara/charter.md) | active |
| 🔧 Kaylee | Backend Dev (FastAPI / Postgres) | [charter](agents/kaylee/charter.md) | active |
| 🧪 River | Tester / Quality | [charter](agents/river/charter.md) | active |
| 📋 Scribe | Session logger (silent) | [charter](agents/scribe/charter.md) | active |
| 🔄 Ralph | Work monitor | — | active |

## Project Context

- **Project:** ai_test — Learning project. Full-stack blog.
- **Stack:** Angular (frontend), FastAPI + Python (backend), PostgreSQL
- **Created:** 2026-05-20
- **Casting Universe:** Firefly

## Scope

### Data model
- **User:** id, email, password_hash, created_at
- **Post:** id, title, image (url/path), content, author_id, created_at, updated_at

### Public pages (Angular)
- **Home:** carousel of post images; each slide shows centered text (first ~500 chars of post); click → detail view
- **Post detail:** image on top → title → date → full content
- **About**
- **Login / Logout** (email + password)

### Admin pages (login-gated)
- List of posts with Edit + Delete buttons
- Create post
- Edit post

### Backend (FastAPI)
- Auth: register, login, logout, JWT sessions
- Posts CRUD: list, get-one, create, update, delete
- Image upload + serving
- Postgres with Alembic migrations

### Quality gates
- Tests run before every commit (River approves)
- Step-by-step git commits with explanatory messages
- `frontend/README.md` and `backend/README.md` kept current
