# Squad Decisions

## 2026-05-20 — Project kickoff

### Initial scope
**By:** iwowi (via Squad init)
**What:** Full-stack blog learning project. Stack: Angular + FastAPI + Postgres.

**Data model**
- `User`: id, email, password_hash, created_at
- `Post`: id, title, image, content, author_id, created_at, updated_at

**Public pages**
- Home: carousel of post images; each slide overlays first ~500 chars of content; click → detail
- Detail: image (top) → title → date → content
- About
- Login / Logout (email + password)

**Admin (login-gated)**
- List posts with Edit + Delete buttons
- Create / Edit post

**Backend surface**
- Auth: register, login, logout, JWT
- Posts CRUD + image upload/serving
- Postgres + Alembic migrations

**Process rules**
- Step-by-step git commits with explanatory commit messages
- Tests must pass before any commit (River is the gate)
- `frontend/README.md` and `backend/README.md` kept current
- Explain the "why" as we go — user is learning

---

### Architectural decisions (Mal, Lead)

| Area | Choice | Why |
|------|--------|-----|
| Repo layout | `backend/` (Python) + `frontend/` (Angular) at root | Matches house style; clean separation |
| Backend framework | FastAPI | Async, typed, fast to learn, great docs |
| ORM | SQLModel (SQLAlchemy + Pydantic in one) | One model definition serves DB + API schemas |
| Migrations | Alembic | Industry standard; pairs with SQLModel |
| Auth | `passlib[bcrypt]` for hashing + `python-jose` for JWT | Standard FastAPI auth recipe |
| DB | Postgres via `docker compose up` (one `docker-compose.yml` at root) | One command up/down; no local install fiddling |
| Image storage | Filesystem under `backend/uploads/`, served via FastAPI static mount | Simpler than blobs in DB; path stored in `Post.image` |
| Frontend | Angular standalone components + Router + `HttpClient` | Modern Angular; no NgModules |
| Frontend HTTP | Plain `HttpClient` + a small `ApiService` per resource | No state library needed at this scope |
| Frontend auth | JWT in `localStorage` + HTTP interceptor | Plain and obvious; good for learning |
| Carousel | One small library (e.g. `ng-bootstrap` carousel or `swiper`) — Inara picks | Don't roll our own |
| Tests | Backend: `pytest` + `httpx` against FastAPI TestClient. Frontend: default Karma/Jasmine for one or two key components | Just enough to gate commits |
| CI | None | Out of scope — learning project |

---

### Build plan — 26 steps in 4 phases

**Phase 0 — Foundation**
1. Repo scaffold + root README + `.gitignore` + `docker-compose.yml` for Postgres — *Mal*
2. Backend bootstrap: `pyproject.toml`/venv, FastAPI hello, `GET /health` — *Kaylee*
3. Frontend bootstrap: `ng new frontend` (standalone, routing, no SSR) — *Inara*
4. Test harness: `pytest` configured + trivial `/health` test; confirm `ng test` works — *River*

**Phase 1 — Backend: data, auth, posts**
5. DB connection + Alembic init (`DATABASE_URL` env var) — *Kaylee*
6. `User` model + migration — *Kaylee*
7. `Post` model + migration (FK to user) — *Kaylee*
8. Password hashing + JWT helpers in `auth/security.py` + unit tests — *Kaylee*
9. `POST /auth/register`, `POST /auth/login` returning JWT — *Kaylee*
10. `get_current_user` dependency + `GET /auth/me` — *Kaylee*
11. Public reads: `GET /posts`, `GET /posts/{id}` — *Kaylee*
12. Protected writes: `POST/PATCH/DELETE /posts` (author = current user) — *Kaylee*
13. `POST /posts/{id}/image` (multipart) → `backend/uploads/`; static mount at `/uploads` — *Kaylee*
14. Backend review + commit gate — *Mal + River*

**Phase 2 — Frontend: public site**
15. API service + environment config (`apiBase`, `PostsService`, `AuthService` skeletons) — *Inara*
16. Routing + shell: `/`, `/posts/:id`, `/about`, `/login`, `/admin/...` + nav header — *Inara*
17. Home page with carousel (image + first ~500 chars overlay; click → detail) — *Inara*
18. Post detail page (image → title → date → content) — *Inara*
19. About page — *Inara*
20. Login / Logout (form → `POST /auth/login`; JWT in `localStorage`; `AuthInterceptor`) — *Inara*
21. Frontend review + commit gate — *Mal + River*

**Phase 3 — Admin & polish**
22. `authGuard` (functional) on `/admin/**`; redirect when logged out — *Inara*
23. Admin list posts with Edit + Delete (Delete confirms) — *Inara*
24. Admin create post (title, content, image upload; `POST /posts` then `POST /posts/:id/image`) — *Inara*
25. Admin edit post (pre-filled form; `PATCH`; optional image replace) — *Inara*
26. Final review + docs pass; tag `v0.1` — *Mal + River*

**Out of scope (deliberately):** CI/CD, app Dockerfiles, prod deploy, roles/permissions beyond logged-in, comments/tags/search/pagination, SSR/PWA/i18n, email verification, password reset.

**Commit cadence:** one commit per numbered step. Message format:
```
<phase>.<step>: <title>

<one paragraph: what changed and why>
<one line: how to verify>
```
Tests must pass before each commit. River is the gate.

---

### Step 1 executed
**By:** Mal
**What:** Repo scaffolded (`backend/`, `frontend/` placeholders), root `README.md`, `.gitignore`, `.env.example`, `docker-compose.yml` for Postgres. Committed.
**Verify:** `docker compose up -d` starts Postgres; folders exist; tree clean after commit.

### 2026-05-20 — Auth endpoints API contract (Kaylee)

**Owner:** Kaylee
**For:** Inara (frontend)

#### `POST /auth/register`

Request body (JSON):
```json
{ "email": "user@example.com", "password": "min8chars" }
```

Success — `201 Created`:
```json
{ "id": 1, "email": "user@example.com", "created_at": "2026-05-20T20:00:00Z" }
```

The password (plain or hashed) is **never** returned.

Errors:
- `409 Conflict` — email already registered (`{"detail": "Email already registered"}`).
- `422 Unprocessable Entity` — Pydantic validation failure (bad email format, password shorter than 8 chars, missing field).

#### `POST /auth/login`

Request body (JSON):
```json
{ "email": "user@example.com", "password": "min8chars" }
```

Success — `200 OK`:
```json
{ "access_token": "<JWT>", "token_type": "bearer" }
```

Errors:
- `401 Unauthorized` — unknown email **or** wrong password (same response for both, by design — no user enumeration).
- `422 Unprocessable Entity` — malformed body.

#### Token usage (forward-looking)

- The `access_token` is a JWT signed HS256 with the server's `JWT_SECRET`. Claims: `sub` = user id (string), `iat`, `exp`. Default lifetime: `JWT_EXPIRE_MINUTES` (see backend `.env`).
- For future protected endpoints, send it in the `Authorization` header:
  ```
  Authorization: Bearer <access_token>
  ```
- Frontend should treat the token as opaque — don't decode it client-side for auth decisions.

#### Not yet built

`GET /auth/me` is **Step 10** — not available yet.

---

### 2026-05-20 — Posts API contract (Kaylee)

All endpoints below. Auth = JWT bearer in `Authorization: Bearer <token>` header (token from POST /auth/login).

#### GET /posts
- Auth: no
- Response 200: `PostOut[]` ordered by created_at DESC

#### GET /posts/{id}
- Auth: no
- Response 200: `PostOut`
- 404: missing

#### POST /posts
- Auth: required
- Body: `{title: string, body: string}`
- Response 201: `PostOut` (slug auto-generated from title, collisions get -N suffix; author_id = current user)
- 401: no/bad token | 422: validation

#### PATCH /posts/{id}
- Auth: required
- Body: `{title?: string, body?: string}` (partial)
- Response 200: `PostOut` (updated_at refreshed)
- 401 / 404 / 403 (not author)

#### DELETE /posts/{id}
- Auth: required
- Response 204
- 401 / 404 / 403

#### POST /posts/{id}/image
- Auth: required
- Multipart form: field `file` = image
- Limits: 5 MB max, content_type must start with `image/`
- Response 200: `PostOut` with updated `image` field
- 401 / 404 / 403 / 400 (non-image) / 413 (too large)

#### PostOut shape
`{id, title, slug, body, image: string | null, author_id, created_at, updated_at}`

The `image` field is a path like `/uploads/{id}{ext}` — served by the FastAPI static mount at `/uploads`. Hit it directly with the apiBase prefix.

---

### 2026-05-20 — Step 14 backend review verdict (Mal)

**Date:** 2026-05-20
**Reviewing:** Phase 1 backend (Steps 5–13), commits `5d82e6a..90c5eb6`
**Verdict:** APPROVED WITH NOTES

#### Findings

**Scope discipline — clean.**
- No pagination, search, tags, roles, email verification, password reset, CI, or app Dockerfiles. Out-of-scope list respected.
- `GET /posts` explicitly notes "no pagination yet (out of scope)" in the docstring. Good.

**Layering — clean.**
- `routes/` only handle HTTP shape and delegate.
- Hashing + JWT live in [`security.py`](backend/src/app/security.py); auth gating lives in [`deps.py`](backend/src/app/deps.py).
- Models are pure SQLModel; schemas are pure Pydantic. No business logic leaking.

**API contract vs. code — matches.**
- All six endpoints in the Posts API contract above line up with [`routes/posts.py`](backend/src/app/routes/posts.py): paths, methods, status codes, error codes, multipart field name (`file`), 5 MB limit, `image/*` check, `image` path shape `/uploads/{id}{ext}`.
- Auth contract (register/login/me) matches [`routes/auth.py`](backend/src/app/routes/auth.py).
- One minor mismatch — see Non-blocking notes.

**Auth pattern — consistent.**
- Every protected endpoint uses `current_user: User = Depends(get_current_user)`.
- 401 on missing/bad/expired token (via `OAuth2PasswordBearer` + `TokenError`).
- 404 before 403 in [`routes/posts.py`](backend/src/app/routes/posts.py) (`_get_or_404` then `_require_author`) — correct order, doesn't leak existence to non-authors past the 401 layer.
- 403 only when the post exists and the caller is authenticated but not the author.

**Data model — correct.**
- `User`: id, email (unique indexed), hashed_password, created_at. ✓
- `Post`: id, title, slug (unique indexed), body, image (nullable), author_id (FK, indexed), created_at, updated_at. ✓
- Migration chain is linear and correct:
  - `a52457de39a1` (users) → `down_revision = None`
  - `82a03ca6e275` (posts) → `down_revision = 'a52457de39a1'`
  - `d1d533cd24c6` (add image) → `down_revision = '82a03ca6e275'`
- `image` column added as a separate migration rather than retrofitted — good discipline.

**Image upload safety — good.**
- Content-type must start with `image/` → 400 otherwise.
- 5 MB cap enforced by streaming in 64 KB chunks and short-circuiting + deleting the partial file on overflow → 413. No DoS via huge upload.
- Filename derived from `post_id` + a mimetype-guessed extension (`.jpe` normalized to `.jpg`). **User input never touches the filesystem path** → no path traversal.
- Author-only (403 otherwise).

**Secrets / config — acceptable for a learning project.**
- `JWT_SECRET` read via `pydantic-settings` from `../.env` then `.env`. No hardcoded keys in source.
- Default is `"dev-secret"` (see Non-blocking notes).

**Testing surface — covered.**
- Auth: register success / duplicate / short password; login success / wrong password / unknown email; me success / no token / bad token / expired token.
- Posts: public list+detail tests (`test_posts_public.py`), protected create/patch/delete with own + other-user-forbidden, image upload requires-auth + other-user-forbidden + (presumably) happy path.
- Every endpoint has at least one happy + one failure test.

**Naming / style — fine.**
- `body` (post content) vs. `body` (FastAPI request body parameter) is the one shadow, but it's local and obvious.
- Schemas live next to routes via `app.schemas.*`; clear separation from table models.

#### Blocking issues

None. Phase 2 is cleared to start.

#### Non-blocking notes

1. **Contract nit — `body` is optional.** Posts API contract shows `POST /posts` body as `{title: string, body: string}`, but [`PostCreate`](backend/src/app/schemas/post.py) has `body: str = ""` (default empty). Inara should know she can omit `body`. Suggest reading the contract as `body?: string` (or `body: string` with note "defaults to empty"). Not a code change.
2. **Orphan image files on re-upload.** If a post's image is replaced with a file of a different extension (`.jpg` → `.png`), the old file at `uploads/{id}.jpg` is left on disk. Cleanup is a one-liner but out of scope here.
3. **`JWT_SECRET` default.** `"dev-secret"` is fine for local dev, but in a real deploy you'd want config to refuse to start if the secret is the default. Mark as future-work; not in scope for v0.1.
4. **`mimetypes.guess_extension` is platform-dependent.** Acceptable — the content-type is still validated and the path is derived from `post_id`. Just be aware: a Windows dev box and a Linux box may produce slightly different stored extensions for the same upload.
5. **`PATCH /posts/{id}` allows empty payload.** With all fields optional and no "at least one field" check, an empty `{}` PATCH still updates `updated_at`. Harmless, possibly even useful (touch). Worth a line in the contract for Inara: "PATCH with `{}` is allowed and refreshes `updated_at`."
6. **`get_post` is by id only.** Slug exists on the model but isn't a lookup key. That matches the contract (`/posts/{id}`), so no action — just flagging in case Phase 2 wants slug URLs later.

#### Handoff to Inara

Phase 1 backend is solid and the Posts API contract above is accurate — build against it directly. Two small things to internalize: (a) `body` on `POST /posts` is optional and defaults to `""`; (b) image URLs come back as `/uploads/{id}{ext}` and need to be prefixed with `apiBase` to load from the FastAPI static mount, not from the Angular dev server. JWT goes in `Authorization: Bearer <token>` on every write endpoint; 401 = re-login, 403 = "not your post" (show a friendly error, don't bounce to login), 404 = "gone" (probably navigate away). Start with Step 15 (API service + environment config) — no surprises waiting for you in the backend.

---

### 2026-05-20 — Step 14 test quality verdict (River)

**Date:** 2026-05-20
**Suite result:** 36 passed in 18.03s
**Verdict:** APPROVED WITH NOTES

#### Coverage matrix

| Endpoint | Tested | Missing |
|---|---|---|
| `POST /auth/register` | 201 happy, 409 duplicate, 422 short password | 422 bad email format, 422 missing field, case-insensitive duplicate (e.g. `Foo@x.com` vs `foo@x.com`) |
| `POST /auth/login` | 200 happy, 401 wrong password, 401 unknown email | 422 malformed body |
| `GET /auth/me` | 200 happy, 401 no token, 401 bad token, 401 expired | — (solid) |
| `GET /posts` | 200 + list shape | (no assertion that seeded post appears in list) |
| `GET /posts/{id}` | 200 happy, 404 missing | — |
| `POST /posts` | 401 no auth, 201 happy, slug collision `-2` | 422 empty/missing title, unicode title slug behavior, very long title |
| `PATCH /posts/{id}` | 200 own, 403 other user | 401 no token, 404 missing post, title-only patch, no-op empty body |
| `DELETE /posts/{id}` | 204 own (+ 404 after), 403 other user | 401 no token, 404 missing post |
| `POST /posts/{id}/image` | 401 no auth, 403 other user, 200 happy + file on disk + GET reflects path, 400 non-image | 404 missing post, 413 over 5 MB, 422 wrong multipart field name, overwrite-on-reupload behavior |

#### DB pollution check

All API-level tests use unique `uuid4()` emails + fixtures with `finally` blocks → clean.

Two model tests do cleanup **inside the test body** rather than `finally`. If the test fails mid-way the row leaks. Low risk (unique emails) but worth tightening:

- [backend/tests/test_user_model.py](backend/tests/test_user_model.py#L31-L40) — `session.delete(found); session.commit()` after assertions, not in teardown.
- [backend/tests/test_post_model.py](backend/tests/test_post_model.py#L48-L62) — same pattern.

`backend/uploads/` was empty (apart from `.gitkeep`) after the full run → image teardown in [backend/tests/test_posts_image.py](backend/tests/test_posts_image.py#L30-L57) works correctly.

#### Blocking gaps

None. Phase 1 contract is exercised — happy path + at least one failure path per endpoint, auth boundaries enforced, no test artifacts left behind.

#### Suggested additional tests (non-blocking)

1. **Auth hardening** — invalid-email 422, missing-field 422, case-insensitive email duplicate.
2. **Posts 404 on write** — PATCH/DELETE on non-existent id (currently only GET tests 404).
3. **Posts 401 on write** — PATCH/DELETE without token (only POST tests 401).
4. **Slug edge cases** — unicode title (`"Café déjà vu"`), all-punctuation title (should fall back to `"post"`), very long title.
5. **Image 413** — upload > 5 MB triggers the size guard in [routes/posts.py](backend/src/app/routes/posts.py#L155-L165).
6. **Image overwrite** — second upload to same post replaces the file (filename is `{post_id}.{ext}`, so an `.png` → `.jpg` reupload would leave the old `.png` on disk — likely a real bug worth a regression test).
7. **Image 404** — upload to non-existent post id.
8. **List ordering** — `GET /posts` returns newest-first (route claims it, no test).
9. **Convert the two model tests above to `try/finally` cleanup** for defense in depth.
10. **Path-cwd assumption** — `_UPLOAD_DIR = Path("uploads")` in routes and tests is relative to cwd. Fine when pytest is run from `backend/`, fragile otherwise. Not a test bug per se, but worth flagging to Mal.

#### Handoff

Green light for Phase 2 — backend test gate is **open**.

---

## Build plan tracking

- **Phase 0 — Foundation (Steps 1–4):** ✅ complete.
- **Phase 1 — Backend (Steps 5–14):** ✅ **COMPLETE** — Steps 5–14 done, **36/36 tests green**, both gates passed (Mal + River, APPROVED WITH NOTES, 0 blocking issues).
- **Phase 2 — Frontend public site (Steps 15–21):** cleared to start — Inara owns.
- **Phase 3 — Admin & polish (Steps 22–26):** not started.

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
