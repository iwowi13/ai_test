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
- **Steps 16–20 (2026-05-21, commits `f15b8e4`, `9e04dd7`, `bcf9ddd`, `b5d7535`, `3b62db9`):** Built out the public site. Notes worth keeping:
  - **Page-not-found per house style:** Standalone component on the `**` route with a `404` `<h1>` and a `routerLink="/"` back-home link. Same minimal pattern is reused for the post-detail 404 branch — same wording, same back-home link — so the UX is consistent across "URL doesn't exist" and "post id doesn't exist".
  - **Lazy-loaded routes everywhere:** Every route in `app.routes.ts` uses `loadComponent: () => import(...)` so the initial bundle stays small. No NgModules, no `RouterModule.forRoot` — just `provideRouter(routes)` in `app.config.ts`.
  - **Swiper-element + `CUSTOM_ELEMENTS_SCHEMA`:** Carousel uses the swiper web-component build (`swiper/element/bundle`) registered **once** in `main.ts` *before* `bootstrapApplication`. Components that template `<swiper-container>` declare `schemas: [CUSTOM_ELEMENTS_SCHEMA]` so Angular's template compiler accepts the unknown tag. Specs that exercise such templates need the same schema in their `TestBed.configureTestingModule(...)`.
  - **Signal-based loading state:** Each page that fetches data uses three signals — `loading`, `error`, `notFound`/data — and the template switches between them with `@if / @else if` control flow. Avoids `*ngIf` ladders and keeps change detection on `OnPush`.
  - **Post-detail 404 handling:** Subscribe to `postsService.get(id)` and inside the error callback, narrow with `err instanceof HttpErrorResponse && err.status === 404` to flip a `notFound` signal. Any other status falls through to a generic error message. Don't trust raw `err.status` without the `HttpErrorResponse` check — non-HTTP errors (e.g. mapping bugs) shouldn't masquerade as 404.
  - **Functional auth interceptor with global 401-logout:** `HttpInterceptorFn`, `inject(AuthService)` + `inject(Router)`. Skips `/auth/login` and `/auth/register` for both header stamping *and* the 401-redirect logic — otherwise a failed login would log the user out twice and bounce them around. Registered via `provideHttpClient(withInterceptors([authInterceptor]))`.
  - **Reactive login form with `finalize`:** `FormBuilder.nonNullable.group(...)`, `submitting` signal flipped in `finalize(...)` so it always resets (success *or* error). On success, read `returnUrl` from `route.snapshot.queryParamMap` (default `/`) and call `router.navigateByUrl`. On 401 → inline "Invalid credentials." On any other status → generic "Login failed, try again."
  - **snake_case → camelCase at the service boundary:** Backend returns `author_id`, `created_at`, `access_token`, etc. The mapping happens **once**, in `posts.service.ts` and `auth.service.ts`, via tiny `mapPost` / `mapUser` functions over typed `PostOut` / `UserOut` interfaces. The rest of the app (models, components, templates) only ever sees camelCase. Token response is the one exception — `TokenResponse` keeps `access_token` because the service reads it once and throws the shape away.
  - **Token storage:** `localStorage` under key `ai_test_jwt`. Hydrated into the `token` signal at `AuthService` construction so a refresh keeps the user logged in. All `localStorage` access is wrapped in `try/catch` because tests / private-mode browsers can throw.
  - **Placeholder image:** Inline SVG at `frontend/public/placeholder.svg` (served at `/placeholder.svg`). `HomeComponent.imageFor(post)` returns either `apiConfig.buildUrl(post.image)` or the placeholder path. Keeps the carousel layout stable for image-less posts and avoids broken-image icons.
  - **Test patterns:**
    - Components that depend on services: `jasmine.createSpyObj<T>('Name', ['method'])` + `spy.method.and.returnValue(of(...))` / `throwError(() => new HttpErrorResponse({ status }))`. Pass via `{ provide: Service, useValue: spy }`.
    - Components that use `RouterLink` in templates: `providers: [provideRouter([])]` is enough — no need for `RouterTestingModule`.
    - Reading `protected`/`private` signals in specs: cast `componentInstance` to a structural type with `as unknown as { ... }`. Ugly but contained, and avoids leaking implementation details to public API.
    - Interceptor: use `provideHttpClient(withInterceptors([authInterceptor]))` together with `provideHttpClientTesting()` so the interceptor runs against the in-memory `HttpTestingController`. Mock `Router`; let `AuthService` be the real one (set `auth.token.set(...)` directly and `spyOn(auth, 'logout')`).
  - **Gotcha — auth.service spec ordering:** `AuthService` reads `localStorage` in its constructor. Specs that test the "hydrate from storage" path must seed `localStorage` *and then* `TestBed.resetTestingModule()` + reconfigure before `TestBed.inject(AuthService)`, otherwise they get the already-constructed singleton from `beforeEach`.
