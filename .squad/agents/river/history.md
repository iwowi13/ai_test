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
- **Step 26 (2026-05-21) — final gate for v0.1:** All three suites green on the same commit Mal approved — backend `pytest -q` 36/36, frontend `npm test` 49/49, `npm run build` clean (478.42 kB initial / 129.41 kB transfer; lazy chunks per route). Phase 3 specs reviewed: each component has at least one happy + one failure/edge path, `PostsService` mocked end-to-end (no real HTTP), reactive-form validators asserted where forms exist, `authGuard` exercised on both branches with `returnUrl` preserved. Carry-forwards to v0.2 logged in the inbox file (token-expired flow, concurrent edit, large-body rendering, image-upload-failure rollback) — flagged, not blocked. Lesson: when the prior reviewer already inventoried sanity counts on the same HEAD, my job is the *spec-shape* audit, not re-running for the sake of it — but I re-ran anyway because the gate is the test, not the claim.
