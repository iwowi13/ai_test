# Project Context

- **Owner:** iwowi
- **Project:** Full-stack blog (learning project). Angular frontend + FastAPI backend + Postgres DB. Email/password auth, blog CRUD, timestamps. Step-by-step git commits with explanations. README.md for both frontend and backend.
- **Stack:** Angular, FastAPI (Python), PostgreSQL
- **Created:** 2026-05-20

## Learnings

<!-- Append new learnings below. -->

- **Step 3 (2026-05-20, backfilled — commit `aef9954`):** Built the Angular 20 standalone scaffold under `frontend/` via `ng new` with routing on, SCSS styles, no SSR, and zone-based change detection (zoneless is too new and most tutorials still target zone-based — better fit for a learning project). Skipped nested git so the project lives inside this repo.
- **Test runner:** Default Karma + Jasmine. The CI gate / pre-commit command is `ng test --watch=false --browsers=ChromeHeadless` (run from `frontend/`). Greenfield scaffold ships with 2 passing specs in `app.spec.ts`.
- **Build smoke check:** `npx ng build --configuration=development` from `frontend/` should report "Application bundle generation complete."
