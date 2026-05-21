# Project Context

- **Owner:** iwowi
- **Project:** Full-stack blog (learning project). Angular frontend + FastAPI backend + Postgres DB. Email/password auth, blog CRUD, timestamps. Step-by-step git commits with explanations. README.md for both frontend and backend.
- **Stack:** Angular, FastAPI (Python), PostgreSQL
- **Created:** 2026-05-20

## Learnings

<!-- Append new learnings below. -->

- **Step 4 (2026-05-20, backfilled — commit `bb7e993`):** Verified both test gates green on a clean scaffold — backend `pytest -q` → 1 passed, frontend `ng test --watch=false --browsers=ChromeHeadless` → 2/2 SUCCESS.
- **Pre-commit checklist** is documented in `commands.txt` at repo root and is the contract for every future commit: tests must pass before code lands. River is the gate.
- **Step 21 (2026-05-21) — reviewer-rejection lockout:** Applied a 1-line build fix in `admin.component.ts` after Mal blocked Phase 2 on NG2008 (missing `admin.component.scss`). Inara was locked out as the original author, so River dropped the orphan `styleUrl` line. Verified: `npm test` 31/31 SUCCESS, `npm run build` clean. Lesson: when a reviewer rejects, the fixer must not be the author — keeps the review loop honest.
