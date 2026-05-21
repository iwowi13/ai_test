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

### 2026-05-21 — Frontend decisions (Inara)

Decisions made while building the public site (services, page-not-found, home/carousel, post-detail, about, login + interceptor). Recording here so Mal/River can sanity-check them before the Step 21 gate.

#### Carousel: `swiper-element` web component

- **Library:** `swiper` (in `frontend/package.json` — version `^12.1.4` at time of writing). Imported as `swiper/element/bundle`, registered **once** in `main.ts` *before* `bootstrapApplication(...)`.
- **Why the web-component build, not the Angular module:** Swiper's official Angular wrapper has been deprecated for a while; the web-component (`<swiper-container>` / `<swiper-slide>`) is the supported path. Works with Angular standalone components by declaring `schemas: [CUSTOM_ELEMENTS_SCHEMA]` on any component whose template uses the tag.
- **Test impact:** Specs for any component that templates `<swiper-container>` must also set `schemas: [CUSTOM_ELEMENTS_SCHEMA]` in `TestBed.configureTestingModule({...})`, otherwise Angular's template compiler errors on the unknown element.

#### Token storage: `localStorage` under key `ai_test_jwt`

- Token is read from `localStorage` in `AuthService`'s constructor and stored in a `signal<string | null>`. Hydrating from storage means a page refresh keeps the user logged in.
- All `localStorage` reads/writes are wrapped in `try/catch` because some browser modes (private windows, tests with storage cleared mid-flight) can throw on access.
- `logout()` clears both the signal and `localStorage`.
- **If we ever need XSS-resistant storage:** revisit and consider httpOnly cookie + same-site protections. For a learning project this is fine.

#### snake_case → camelCase mapping in the service layer

- Backend returns `author_id`, `created_at`, `updated_at`, `access_token`, etc.
- We map to camelCase **once**, at the service boundary (`posts.service.ts`, `auth.service.ts`), via tiny `mapPost` / `mapUser` functions and typed `PostOut` / `UserOut` interfaces that live alongside the service.
- The rest of the app (models in `frontend/src/app/models`, components, templates) only ever sees camelCase. Keeps templates clean (`{{ post.createdAt | date }}`) and means a future API rename only touches the service file.
- **Exception:** `TokenResponse` keeps `access_token` because the service reads it once into the token signal and discards the shape immediately.

#### Placeholder image: inline SVG at `/placeholder.svg`

- File: `frontend/public/placeholder.svg`, served at `/placeholder.svg` by Angular's dev server / build.
- A neutral grey rectangle with the text "No image". Inline SVG = no extra network round-trip, no broken-image icon if the file is missing.
- `HomeComponent.imageFor(post)` returns `apiConfig.buildUrl(post.image)` if `post.image` is truthy, otherwise the placeholder path. Keeps the carousel slide height/layout stable for image-less posts.

#### Auth interceptor: global 401-logout

- Functional `HttpInterceptorFn` in `frontend/src/app/services/auth.interceptor.ts`, registered via `provideHttpClient(withInterceptors([authInterceptor]))` in `app.config.ts`.
- **Header stamping:** Adds `Authorization: Bearer <token>` to every outgoing request **except** `/auth/login` and `/auth/register`. (Sending a bearer to those endpoints is harmless but meaningless.)
- **401 handling:** On `HttpErrorResponse` with `status === 401` from a non-auth endpoint *and* with a token currently set, calls `auth.logout()` and `router.navigate(['/login'])`. Then re-throws the error so component-level subscribers still see it.
- **Why skip `/auth/login` for the 401 logic:** A failed login is a 401, and we don't want a failed login to also bounce the user to `/login` — they're already there, and `logout()` on an empty session is just noise.
- **Implication for `LoginComponent`:** Login errors surface to the component's `error` callback unchanged; the component shows "Invalid credentials." on 401, generic message otherwise.

#### Things Mal/River should know for Step 21 (admin / authoring)

- **`AuthService.isAuthenticated`** is a `computed` signal — use it directly in templates and route guards. Don't subscribe; just call it.
- **`PostsService` is already wired** for `create`, `update`, `delete`, and `uploadImage(id, file)`. `uploadImage` uses `FormData` with field name `file`; the interceptor will stamp the JWT automatically (no need to fiddle with `Content-Type` — let the browser set the multipart boundary).
- **Auth guard pattern (not yet built):** Probably a `CanMatch` function on the `admin` route that reads `inject(AuthService).isAuthenticated()`. If false, redirect to `/login?returnUrl=/admin`. The login component already honours `returnUrl`.
- **Form patterns:** `LoginComponent` is the reference — `FormBuilder.nonNullable.group(...)`, signal-based `submitting` and `errorMsg`, `finalize` in the subscribe pipe to always reset `submitting`. Reuse this shape for the post editor form.
- **No SSR, no zoneless.** Stick to zone-based change detection and `ChangeDetectionStrategy.OnPush` on new components.
- **Test command (must stay green before every commit):** `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless`. Current spec count after Step 20: **31**.

#### Open / deferred

- No global error boundary yet — component-level error signals are the only fallback. Fine for now.
- No HTTP retry. Not needed for this scope.
- No request-cancellation on route change (Angular's HttpClient + the way components subscribe in `ngOnInit` means a fast navigation could double-fire). Acceptable for a learning project.

---

### 2026-05-21 — Step 21 frontend review verdict (Mal)

**Date:** 2026-05-21
**Reviewing:** Phase 2 public frontend (Steps 15–20), commits `80dc29a..3b62db9`
**Verdict:** BLOCKED (initial) → APPROVED WITH NOTES (after `61efb0b` fix)

#### Findings

**Scope discipline — clean.**
- No state library, no SSR, no PWA, no i18n, no pagination, no search, no CSS framework. Plain `HttpClient` + signals + reactive forms, exactly as planned.
- Swiper is the only added runtime dep (`^12.1.4`) — agreed-upon carousel slot.
- `AdminComponent` is a true placeholder ("admin features land in Phase 3") — no Phase 3 work has leaked into Phase 2.

**House style — mostly on point.**
- Feature-based folders under [frontend/src/app/components/](frontend/src/app/components) with `home`, `post-detail`, `about`, `login`, `admin`, `page-not-found`. `page-not-found` wired as the `**` route in [app.routes.ts](frontend/src/app/app.routes.ts#L34-L40). ✓
- All components are `standalone: true`, `ChangeDetectionStrategy.OnPush` where they hold state, and use the new control flow (`@if` / `@for`) and signals throughout. No NgModules, no `*ngIf`. ✓
- Models live in [frontend/src/app/models/](frontend/src/app/models), services in [frontend/src/app/services/](frontend/src/app/services), components self-contained with `.ts`/`.html`/`.scss`/`.spec.ts` — **except `AdminComponent` (see Blocking #1)**.

**API contract alignment — accurate.**
- `PostOut` interface in [posts.service.ts](frontend/src/app/services/posts.service.ts#L10-L20) matches Kaylee's contract field-for-field (`id, title, slug, body, image, author_id, created_at, updated_at`).
- snake_case → camelCase mapping is done **once**, at the service boundary, via `mapPost` / `mapUser`. The rest of the app only ever sees the camelCase [`Post`](frontend/src/app/models/post.ts) / [`User`](frontend/src/app/models/user.ts) shapes. Clean.
- Image path is correctly prefixed with `apiBase` via [`ApiConfigService.buildUrl`](frontend/src/app/services/api-config.service.ts) in both [home.component.ts#imageFor](frontend/src/app/components/home/home.component.ts) and [post-detail.component.html](frontend/src/app/components/post-detail/post-detail.component.html). Image hits FastAPI's `/uploads` static mount, not the Angular dev server.
- `uploadImage` posts `FormData` with field name `file` — matches the multipart contract.
- `TokenResponse` keeps `access_token` deliberately (single read, then discarded) — documented in Inara's decisions, fine.

**Auth flow — sound.**
- JWT stored in `localStorage` under `ai_test_jwt`, hydrated into a signal in [`AuthService`](frontend/src/app/services/auth.service.ts) constructor → page refresh keeps the user logged in.
- All `localStorage` access is `try/catch`-wrapped (private-mode browsers, tests).
- [`authInterceptor`](frontend/src/app/services/auth.interceptor.ts) stamps `Authorization: Bearer` on every outbound request **except** `/auth/login` and `/auth/register`. On `401` from a non-auth endpoint with a current token, it calls `auth.logout()` then `router.navigate(['/login'])` and re-throws so component subscribers still see the error.
- The skip-auth-endpoint guard on the 401 branch correctly prevents a failed login from also bouncing the user to `/login` (they're already there) — good thinking.
- `isAuthenticated` is a `computed` signal driven from the token signal — usable directly in templates ([app.html](frontend/src/app/app.html#L13-L20)).

**Lazy-loading — correct.**
- Every route uses `loadComponent: () => import(...).then(m => m.X)`. No top-level imports of feature components from the routes file. Each route becomes its own chunk.
- Single concern: `admin` route currently has no `canMatch` guard. Acceptable for Phase 2 (Inara's decisions document call out the guard as a Phase 3 task), and the placeholder leaks nothing.

**Swiper — integrated correctly for Phase 2, has a prod-build risk.**
- `register` called **once** in [main.ts](frontend/src/main.ts) before `bootstrapApplication`. ✓
- `CUSTOM_ELEMENTS_SCHEMA` is declared on [home.component.ts](frontend/src/app/components/home/home.component.ts#L21) and (per Inara's notes) in the matching spec's `TestBed`. ✓
- Placeholder strategy is `frontend/public/placeholder.svg`, served as a static asset by the Angular build (assets config in [angular.json](frontend/angular.json#L25-L30)). Stable layout when a post lacks an image.
- See **Blocking #1** for the prod-build issue.

**Accessibility — good enough for Phase 2, two small gaps.**
- All `<img>` elements have meaningful `alt` text (`post.title`).
- Semantic landmarks present: `<header class="topbar">`, `<nav>`, `<main class="content">`, `<footer>`, `<article class="post">`, `<section>` on auxiliary pages.
- Login form: paired `<label>` per input, `autocomplete="email"` / `autocomplete="current-password"`, validation errors live near the field, top-level error has `role="alert"`.
- Nits in **Non-blocking** below.

#### Blocking issues (initial review)

1. **Production build is broken — missing `admin.component.scss`.**
   [admin.component.ts](frontend/src/app/components/admin/admin.component.ts#L7) declares `styleUrl: './admin.component.scss'`, but that file does not exist on disk. `npm run build` (default config = production) fails with **NG2008: Could not find stylesheet file './admin.component.scss'**. Karma doesn't trip on this because the admin component isn't pulled into any spec, but `ng build` does. Phase 2 cannot be tagged "done" with a red prod build.
   **Fix (one-line):** either create an empty `frontend/src/app/components/admin/admin.component.scss` to match the rest of the house style, or drop the `styleUrl` line entirely. Match what the other placeholder pages (about, page-not-found) do.

#### Non-blocking notes

1. **`AdminComponent` lacks a spec file.** Every other component has one. Phase 3 will rewrite this component anyway, but add a trivial `admin.component.spec.ts` when you do — keeps the rule "every component has a spec" intact.
2. **`environment.prod.ts` has `apiBase: 'http://localhost:8000'`.** Identical to dev. The `fileReplacements` plumbing in [angular.json](frontend/angular.json#L40-L46) works, but the prod value is a placeholder. Out of scope for v0.1 (no deploy planned), worth a single `// TODO: real prod URL` comment so it isn't forgotten.
3. **Carousel keyboard support.** `<swiper-container>` has `navigation="true"` and `pagination="true"` but no `keyboard="true"` / `a11y="true"` enabled. Swiper supports both — flipping them on is one attribute each and gets you arrow-key nav + screen-reader announcements for free. Phase 2 acceptable, do it before v0.1.
4. **`PostsService.delete` returns `Observable<void>` from `this.http.delete<void>(…)`.** Backend returns `204 No Content` with empty body — Angular's `HttpClient` will resolve fine, but the typed return drops the `Response` envelope. No bug today, just be aware when Phase 3 admin wants to confirm a delete happened (status code lives on the `HttpResponse` envelope, not in the next handler).
5. **No request cancellation on route change.** Inara already flagged this in her decisions doc. Acceptable for the learning scope.
6. **`PostDetailComponent` validates `id` with `Number.isFinite(id) && id > 0`.** Good. Note that the backend uses positive integer ids, so this is correct; just don't widen the model to allow string slugs in URLs without revisiting this guard.
7. **`PostCreate.body` is typed `string` (required) in the frontend model**, but the backend defaults it to `""` (Kaylee, Step 14 note #1). No bug — the frontend will always send a value — but if Phase 3's editor wants a "title-only quick draft", the model already supports it on the server side.

#### Re-review after River's fix

**Fix commit:** `61efb0b` (River applied per rejection-lockout rule — Inara could not self-revise)

Verified:
- `admin.component.ts` no longer references the missing `.scss`
- `npm run build` clean (`dist/frontend` produced)
- `npm test` still 31/31 green

**Revised verdict:** APPROVED WITH NOTES (zero blocking issues). Phase 2 public frontend cleared. Inara unblocked for Phase 3 (Steps 22–25 — admin authGuard, list, create, edit). The non-blocking notes above remain open for Inara's discretion.

#### Handoff to Inara for Phase 3

Once the missing `admin.component.scss` is added and prod build is green, Phase 2 is done. For Phase 3, the patterns to lean on are already in place: `AuthService.isAuthenticated()` is a `computed` signal you can call from a functional `CanMatch` guard (`inject(AuthService).isAuthenticated() || (inject(Router).parseUrl('/login?returnUrl=/admin'))`); the [`LoginComponent`](frontend/src/app/components/login/login.component.ts) honours `returnUrl` already, so the round-trip will Just Work. Reuse the [`LoginComponent`](frontend/src/app/components/login/login.component.ts) form shape (`FormBuilder.nonNullable.group`, signal-based `submitting` + `errorMsg`, `finalize` to reset) for the post editor. `PostsService.create/update/delete/uploadImage` is already wired and the interceptor will stamp the JWT; let the browser set the multipart boundary for image upload (don't set `Content-Type` manually). When you split admin into a list/create/edit set, prefer nested children under the `admin` route with the guard on the parent so the JWT check runs once. Keep `ChangeDetectionStrategy.OnPush` and signals everywhere — no `BehaviorSubject` regressions, please.

---

### 2026-05-21 — Step 21 frontend test verdict (River)

**Date:** 2026-05-21
**Suite result:** 31 specs, all passed (Karma + ChromeHeadless 148, ~0.6s test runtime, 3.2s build)
**Verdict:** APPROVED

#### Coverage matrix

| Unit | Tested (happy + failure) | Gaps (non-blocking) |
|------|--------------------------|---------------------|
| `AuthService` | logged-out start, login persists token+signal, logout clears, `/auth/me` snake→camel mapping, constructor hydrates from localStorage | login error path doesn't clear token (asserted indirectly); no test for `loadCurrentUser` error |
| `PostsService` | `list()` mapping, `get(id)` mapping, `create()` body + mapping, `uploadImage()` multipart field name | no `update()` / `delete()` tests (admin work — Phase 3); no error-path test |
| `authInterceptor` | adds Bearer for protected URL, skips `/auth/login` and `/auth/register`, 401 on protected → logout+navigate, 401 on `/auth/login` → no logout/redirect | empty-string token (falsy already, but not explicit); 401 on `/auth/register`; non-401 errors pass through untouched |
| `LoginComponent` | invalid form is a no-op, success → `/`, success → `returnUrl`, 401 → "Invalid credentials.", 500 → generic message | double-submit guard (`submitting()` true → submit ignored — not implemented in component, so not a gap, just a future hardening); template-level rendering of the error / disabled button |
| `App` (shell nav) | Home+About always shown, Login shown when logged out, Admin+Logout shown when logged in, Logout button calls `authService.logout` | router navigation after logout (component doesn't navigate itself — fine) |
| `HomeComponent` | renders one `<swiper-slide>` per post, empty state shows "No posts yet." and no `<swiper-container>`, `imageFor()` builds API URL vs falls back to placeholder | `PostsService.list()` error path (component just leaves `posts()` empty — worth one test) |
| `PostDetailComponent` | success renders title, 404 sets `notFound` and renders message, non-404 renders generic error | non-numeric / missing `:id` route param (component currently parses `Number(...)` — would call `get(NaN)`); image rendering when `image` is null |
| `AboutComponent` | renders heading + at least one `<p>` | — |
| `PageNotFoundComponent` | renders `404` heading + link to `/` | — |

#### Mocking + isolation check

- All HTTP goes through `HttpTestingController` (services) or `jasmine.createSpyObj` of `PostsService` / `AuthService` (components). No real network.
- `localStorage` is reset in `beforeEach` / `afterEach` for `AuthService` and `authInterceptor` specs — no cross-test leakage.
- `App` spec uses `TestBed.resetTestingModule()` inside its own `setup()` helper so the two auth states don't bleed.
- `AuthService` hydration spec correctly resets the TestBed after seeding `localStorage`, so the singleton is constructed against the seeded state.
- `httpMock.verify()` is called in `afterEach` everywhere it's used — no dangling expectations.
- `provideRouter([])` is used in component specs that need `RouterLink` (App, Home, PostDetail, PageNotFound). `CUSTOM_ELEMENTS_SCHEMA` is used in `HomeComponent` for `<swiper-container>` / `<swiper-slide>`. Both correct.
- `Router` is stubbed with `jasmine.createSpyObj` in interceptor + login specs — no real navigation triggered.
- No `fakeAsync` / `tick` needed because services return synchronous `of(...)` / `throwError(...)` in component tests and `HttpTestingController.flush()` is synchronous in service tests.

#### Blocking gaps

None.

#### Suggested additional tests (non-blocking)

1. `authInterceptor`: assert non-401 errors are re-thrown without calling `logout()` or `router.navigate()` (covers the `err.status !== 401` branch).
2. `authInterceptor`: 401 on `/auth/register` does not trigger logout (parallel to the `/auth/login` case).
3. `PostDetailComponent`: route param `id` missing / non-numeric — currently the component would call `get(NaN)`; either assert behavior or add a guard.
4. `HomeComponent`: `PostsService.list()` errors → component still renders the empty/error state (decide which) instead of crashing.
5. `LoginComponent`: while `submitting()` is `true`, a second `submit()` call is ignored (requires a small guard in the component — flag this to Inara as a Phase 3 nicety, not a Step 21 blocker).
6. `AuthService`: `loadCurrentUser()` error path leaves `currentUser()` null.
7. `PostsService`: error path (e.g. `get(id)` returns 404) propagates `HttpErrorResponse` to the subscriber.

#### Handoff

Green light for Phase 3 — test gate is satisfied for Phase 2 (Steps 15–20). Mal's architecture review is the only remaining concurrent check.

---

### 2026-05-21 — Admin UI decisions (Inara)
**By:** Inara
**What:**
- Routes (all behind authGuard): /admin (list), /admin/posts/new (create), /admin/posts/:id/edit (edit)
- authGuard: functional CanActivateFn, returns UrlTree to /login with returnUrl on anonymous
- Delete UX: native confirm() — acceptable for learning project, simple and accessible
- Create flow: POST /posts → if file selected, POST /posts/:id/image. Navigate to /admin on success
- Edit flow: PATCH /posts/:id then optional POST /posts/:id/image. Cancel returns to /admin
- Image client-side validation: 5MB + image/* mirrors backend rules to fail fast
**Why:** Mirrors backend contract from Phase 1. Keeps admin scope small for v0.1.

---

### 2026-05-21 — Step 26 final review verdict (Mal)
**By:** Mal
**Verdict:** APPROVED FOR v0.1
**Scope reviewed:** Phase 3 admin UI (Steps 22–25) + whole-product sanity + docs pass

**What I checked:**
- `authGuard` (`frontend/src/app/services/auth.guard.ts`) is a functional `CanActivateFn`; returns `true` when authenticated, otherwise `router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })`. Spec exercises both branches with a writable signal stub for `AuthService.isAuthenticated`. Correct.
- `app.routes.ts`: `authGuard` registered via `canActivate: [authGuard]` on all three admin routes (`/admin`, `/admin/posts/new`, `/admin/posts/:id/edit`). Every route is `loadComponent: () => import(...)` — lazy-loaded, one chunk per route.
- `AdminComponent`: list with Edit/Delete; delete uses native `confirm()` (per Inara's documented decision — acceptable for v0.1); 403 vs generic error messages distinguished. Uses signals + `OnPush`.
- `AdminPostCreateComponent`: reactive form (`fb.nonNullable.group`, `Validators.required`, `Validators.maxLength(200)`); image picker validates `image/*` + 5 MB cap client-side (mirrors backend); submit pipes `create()` → `switchMap` to optional `uploadImage`; `finalize` resets `submitting`; status-code-aware error messages (401/413/400/generic). Matches the LoginComponent reference shape.
- `AdminPostEditComponent`: parses route id with `Number.isFinite && > 0` guard; pre-fills via `get(id)`; pipes `update()` → `switchMap` to optional `uploadImage`; explicit messaging for 403/404/413/400/generic; Cancel returns to `/admin`.
- House style: every admin component is `standalone: true`, `ChangeDetectionStrategy.OnPush`, in its own folder with `.ts/.html/.scss/.spec.ts`; no NgModules; no dead code; no unused imports.
- Whole-product sanity: `npm run build` clean (478.42 kB initial, 129.41 kB transfer); `npm test` 49/49 specs green; `pytest -q` 36/36 backend tests green.
- Docs: root `README.md`, `backend/README.md`, `frontend/README.md` updated for v0.1 (admin UI no longer "stub", stale "later steps" section removed from backend, test commands added to root).

**Notes (non-blocking, carry-forward to a future version):**
- Delete UX uses native `confirm()` — fine for v0.1, swap for a styled dialog component when the design system arrives.
- No optimistic UI on delete — list updates after the 204 returns. Acceptable.
- `environment.prod.ts` still points to `http://localhost:8000` — flagged earlier; no deploy planned in v0.1, leave the `// TODO` for v0.2.
- No request-cancellation on route change (Inara flagged in Phase 2 decisions). Still fine for the learning scope.
- `PATCH /posts/{id}` with no changed fields will still hit the wire. Harmless (refreshes `updated_at`); no UX guard.

**Decision:** APPROVE. Pending River's verdict before tagging `v0.1`.

---

### 2026-05-21 — Step 26 final test verdict (River)
**By:** River
**Verdict:** APPROVED FOR v0.1
**Suites run:** backend pytest, frontend npm test, npm run build
**Counts:** backend 36/36 passed | frontend 49/49 SUCCESS | build clean (initial 478.42 kB raw / 129.41 kB transfer; per-route lazy chunks)

**Per-component spec review (Phase 3):**
- `auth.guard.spec.ts` — both branches exercised via writable signal stub: authed → `true`, anon → `createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })` with `returnUrl` asserted. Good.
- `admin.component.spec.ts` — list render (N rows + empty state), confirm-yes deletes and prunes list, confirm-no skips service, delete-failure keeps row + sets `deleteError`, Edit navigates `['/admin/posts', id, 'edit']`. `PostsService` fully spy'd. Solid.
- `admin-post-create.component.spec.ts` — required-validator blocks submit, happy create-then-navigate, create+upload happy path, non-image rejected client-side, >5 MB rejected client-side. No real HTTP.
- `admin-post-edit.component.spec.ts` — pre-fill from `get(id)`, 404 → not-found state, PATCH-only happy path, PATCH + uploadImage happy path, Cancel navigates `/admin`. `ActivatedRoute` mocked. No real HTTP.

**Carry-forwards to v0.2 (non-blocking):**
- No spec for 401-during-edit / token-expired interceptor flow.
- No concurrent-edit (two tabs, stale `updated_at`) coverage.
- No long-title / very-large-body rendering test.
- No image-upload-failure-after-create rollback test (post stays without image; UX path untested).
- (Inherited from Mal's notes) native `confirm()` for delete, no optimistic UI, `environment.prod.ts` still localhost, no request-cancel on route change, no-op PATCH still hits wire.

**Decision:** APPROVE.

---

## Build plan tracking

- **Phase 0 — Foundation (Steps 1–4):** ✅ complete.
- **Phase 1 — Backend (Steps 5–14):** ✅ **COMPLETE** — Steps 5–14 done, **36/36 tests green**, both gates passed (Mal + River, APPROVED WITH NOTES, 0 blocking issues).
- **Phase 2 — Frontend public site (Steps 15–21):** ✅ **COMPLETE** — Steps 15–21 done. **31 frontend specs + 36 backend tests green.** Reviewer rejection-lockout rule exercised cleanly (Mal BLOCKED → River applied 1-line fix `61efb0b` → Mal re-verdicted APPROVED WITH NOTES). Phase 3 (admin & polish) cleared.
- **Phase 3 — Admin & polish (Steps 22–26):** cleared to start — Inara owns Steps 22–25, Mal + River own Step 26.

## 🎉 v0.1 SHIPPED — 2026-05-21
- All 26 steps complete, tagged `v0.1` at commit `9be6cf2`
- Backend 36/36 + frontend 49/49 = 85 tests green
- Phase 1 (backend API): Steps 1-14
- Phase 2 (public frontend): Steps 15-21
- Phase 3 (admin UI + release): Steps 22-26
- Reviewer-lockout rule fired once (Step 21 NG2008), held cleanly
- Silent-success bug observed 5× total — mitigated by filesystem-check + continuation spawn
- v0.2 carry-forwards: token-expired flow during admin edit, concurrent edit, long-title rendering, image-upload rollback after post create

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
