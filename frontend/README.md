# Frontend

Angular 20 standalone app for the `ai_test` learning blog. Public site has a home page (Swiper carousel of posts), per-post detail page, About page, and a Login page wired to the backend's JWT auth.

Generated with [Angular CLI](https://github.com/angular/angular-cli) 20.3.26.

## Public site at a glance

- `/` — home page, Swiper carousel with one slide per post (image, title, 500-char body excerpt). Click a slide → post detail.
- `/posts/:id` — full post (title, date, body, optional image). Unknown id shows a friendly "Post not found".
- `/about` — short blurb about the project and stack.
- `/login` — email / password form. On success, redirected to `returnUrl` (default `/`).
- `/admin` — stub for now; will be the authoring UI.
- Any other URL → 404 page.

Auth is JWT-based. A functional HTTP interceptor (`src/app/services/auth.interceptor.ts`) stamps `Authorization: Bearer <token>` on every non-auth request and forces logout + redirect to `/login` on any global 401. Token lives in `localStorage` under key `ai_test_jwt`.

## Run the dev server

The frontend talks to the backend on `http://localhost:8000` (see `src/environments/environment.ts`), so start the backend first.

From the repo root:

```powershell
docker compose up -d        # Postgres + backend on :8000
```

Then, from `frontend/`:

```powershell
npm install                 # first time only
npm start                   # ng serve on http://localhost:4200
```

Open `http://localhost:4200/`. Edits to source files auto-reload.

## Run the unit tests

From `frontend/`:

```powershell
npm test -- --watch=false --browsers=ChromeHeadless
```

This is the pre-commit gate — it must be green before every commit. Uses Karma + Jasmine + Chrome Headless. Spec count grows as features land.

## Build

```powershell
npm run build               # production build into dist/
```

## Project layout (high level)

```
src/app/
  app.config.ts             # bootstrap providers (router, http, interceptor)
  app.routes.ts             # lazy-loaded routes
  components/
    home/                   # carousel of posts
    post-detail/            # single post + 404 branch
    about/
    login/                  # reactive form + JWT login
    admin/                  # placeholder
    page-not-found/         # 404 catch-all
  services/
    api-config.service.ts   # apiBase + buildUrl()
    auth.service.ts         # login/register/logout + token signal
    auth.interceptor.ts     # bearer header + global 401-logout
    posts.service.ts        # snake_case → camelCase at the boundary
  models/                   # camelCase TypeScript interfaces
src/environments/           # apiBase per env
public/placeholder.svg      # fallback image for posts without one
```

## Scaffolding (Angular CLI)

```powershell
ng generate component component-name
ng generate --help
```

For more on the CLI: <https://angular.dev/tools/cli>.
