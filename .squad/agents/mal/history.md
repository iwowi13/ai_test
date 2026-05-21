# Project Context

- **Owner:** iwowi
- **Project:** Full-stack blog (learning project). Angular frontend + FastAPI backend + Postgres DB. Email/password auth, blog CRUD, timestamps. Step-by-step git commits with explanations. README.md for both frontend and backend.
- **Stack:** Angular, FastAPI (Python), PostgreSQL
- **Created:** 2026-05-20

## Learnings

<!-- Append new learnings below. -->
- 2026-05-20: Architecture chosen — `backend/` (FastAPI + SQLModel + Alembic, JWT via passlib/python-jose, images on filesystem under `backend/uploads/`) and `frontend/` (Angular standalone + Router + HttpClient + JWT interceptor). Postgres runs via root `docker-compose.yml` for simplicity. Build plan drafted in 26 steps across 4 phases (Foundation → Backend → Frontend public → Admin & polish); backend goes end-to-end before frontend touches real data.
- 2026-05-20: Step 1 done — scaffold + Postgres compose committed. Postgres 16-alpine, creds blog/blog/blog (fine for a learning project; real secrets go in `.env`, which is gitignored). `.env.example` is committed as the template. `backend/uploads/` is gitignored — it's runtime data, not source.
- 2026-05-21: Step 26 final review — APPROVED for v0.1. Phase 3 admin UI (Steps 22–25) clean: `authGuard` is a functional `CanActivateFn` returning `UrlTree` with `returnUrl`, guards all three admin routes, every route lazy-loaded. Create/edit components use the LoginComponent reactive-form shape (signal-based `submitting`/`errorMsg`, `finalize` reset) and `switchMap` to chain optional `uploadImage` after the create/update. Client-side 5 MB + `image/*` validation mirrors the backend so users get fast feedback. Delete uses native `confirm()` — agreed acceptable for a learning project, swap for a dialog when a design system lands. Whole-product sanity: 49/49 frontend specs, 36/36 backend tests, prod build clean. Did docs pass: root README now has a v0.1 quick start + test commands; frontend README admin section reflects the real (built) UI; backend README dropped its stale "later steps" block. Did NOT tag — River's verdict file wasn't in `.squad/decisions/inbox/` when I finished, so per the gate rule the coordinator owns the tag step. Carry-forwards documented in the verdict file: native-confirm delete, prod env URL placeholder, no request-cancellation on route change.

## Learnings — 2026-05-21 v0.1 ship
- Closing pattern works: parallel Mal + River verdicts, tag only when both APPROVED
- Reviewer-lockout rule held twice this project (Step 21 NG2008, no others)
- Silent-success bit ~5 times total — filesystem-check + continuation spawn is reliable
- Carry-forwards for v0.2 captured by River (token-expired, concurrent edit, large body, image-upload rollback)
