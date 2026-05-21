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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
