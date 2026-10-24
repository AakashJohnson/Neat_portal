# ARCHITECTURE

Target architecture of the migrated NEAT portal. Decisions and their alternatives are recorded in `ARCHITECTURE_DECISIONS.md`.

## 1. Overview

```
                         ┌────────────────────────── Next.js 16 (React 19, plain JS) ──────────────────────────┐
 Browser ── HTTPS ──────▶│  (site)  portal pages (76 Angular routes)     (panel) /panel/* (Blade panel port)    │
                         │  proxy.js route guard                         PanelShell guard + permissions        │
                         │  /bff/* proxy ─┐   /api/session, /api/panel/session, /api/panel/impersonate        │
                         └────────────────┼────────────────────────────────────────────────────────────────────┘
                                          │ ?token= + Authorization: Bearer (JWT from the httpOnly cookie)
                         ┌────────────────▼──────────── Express 5 (Node 22, ES modules, plain JS) ────────────┐
 Mobile / external ─────▶│ /api/*  same paths, verbs, payloads and response shapes as Laravel                  │
 API consumers           │ /api/panel/*  JSON replacements for the Laravel web (Blade) routes                  │
                         │ middleware: helmet · CORS allow-list · rate limit 60/min · request id · pino        │
                         │ routes → services → repositories (Knex) · laravelValidator · php/phpDate utils      │
                         └──────┬───────────────┬──────────────────┬───────────────────┬────────────────────────┘
                                │               │                  │                   │
                          MySQL 8 neat_portal   SMTP         public/files, upload   EoI API, Phase-2 schemas
                          (schema unchanged)  (Nodemailer)   storage/settings.json  (neatphase2eoi/neatphase2)
```

## 2. Frontend (`nextjs-frontend`)

| Layer | Contents |
|---|---|
| `src/app/(site)` | Every effective Angular route (`FRONTEND_INVENTORY.md` §1), its own root layout with the legacy stylesheets (`public/legacy`) and a `[...notFound]` catch-all that renders the landing page, like Angular's `**` route |
| `src/app/(panel)` | Separate root layout for the panel: `(app)` (navbar + sidebar shell), `(auth)` (guest pages), `(standalone)` (company-profile tools), plus logout, social stub and `active-users` |
| `src/app/bff/[...path]` | Backend-for-frontend proxy: the only path from the browser to the API |
| `src/app/api/*` | Session route handlers (cookie set/clear, impersonation swap) |
| `src/proxy.js` | Next.js 16 proxy (middleware): Angular `AfterLoginService`/`BeforeLoginService` and role checks |
| `src/components` | React ports of the Angular components by area (`home`, `course`, `student`, `learner`, `institute`, `company`, `admin`, `auth`, `payment`, `faqs`, `gallery`, `layout`, `common`, `editor`), Angular Material/CDK/Bootstrap equivalents (`mat`, `cdk`, `bootstrap`) and the panel (`panel`) |
| `src/lib` | `api.js` (Angular service equivalents), `panelApi.js`, `ngSanitize.js` (exact port of Angular's sanitizer), `jsValidation.js` (Laravel JsValidator), `carbon.js` (Carbon/PHP date formats), `config.js` |
| `src/services` | One module per Angular service, same method names and endpoints |
| `public/legacy`, `public/assets`, `public/panel` | Only the referenced original assets (`scripts/sync-legacy-assets.mjs`) |

**Rendering:** pages are client components rendered on the server and hydrated, mirroring Angular's client-side behaviour (lifecycle order, timing of requests). Visual parity uses the original CSS with Angular's emulated encapsulation reproduced by scoping (`scripts/scope-component-css.mjs`).

**Libraries:** MUI and custom `Mat*` components reproduce Angular Material 7 markup; TipTap 3 replaces `@kolkov/angular-editor` (DEV-F08); Swiper replaces owl/jQuery carousels; SheetJS 0.20.3 for Excel (R-37); DOMPurify as defence in depth. No jQuery and no TypeScript.

## 3. Backend (`express-backend`)

| Layer | Contents |
|---|---|
| `src/app.js`, `src/server.js` | App factory (middleware chain, routers, error handler) and the HTTP server with graceful shutdown |
| `src/config` | `env.js` (zod-validated environment), `settings.js` (Laravel `setting()` over `storage/settings.json`) |
| `src/routes` | One router per Laravel controller group; `unresolved.routes.js` answers the routes whose Laravel methods do not exist exactly as Laravel does (R-03) |
| `src/services` | Business logic per original controller (`courseService` ← `CourseController`, …), `auth/*` (JWT, login, hardening), `stock/*` (Vanguard API), `panel/*` (web routes) |
| `src/repositories` | Shared queries (users, api_tokens, activity, product listing) |
| `src/validators/laravelValidator.js` | Laravel validation rules and messages (422 `{message, errors}`) |
| `src/utils` | PHP semantics: loose comparison, `empty()`, number coercion, `strtotime`/Carbon parsing (oracle-tested against PHP) |
| `src/integrations` | Mail (Nodemailer + Laravel markdown theme), file storage, EoI API |
| `src/middleware` | `auth.js` (authentication, role/permission checks), `throttle.js` (rate limit), `normalizeInput.js` (Laravel input trimming/empty-to-null), `errors.js` (central handler with Laravel-shaped errors: `{"error"}`, `{"message"}`, 422 `{message, errors}`) |
| `src/http` | `asyncHandler`, `send`, Fractal-style pagination (`paginate.js`) |

**Data access:** Knex query builder on mysql2 with `dateStrings` and big numbers as strings (PDO-compatible output). No migrations and no schema builder; `npm run check:no-ddl` enforces this.

## 4. Cross-cutting

- **Security:** helmet headers; CORS allow-list (`CORS_ORIGINS`) instead of `*`; rate limiting; httpOnly session cookie; upload type/size/magic-byte checks; parameterised SQL everywhere; secret columns never serialised. Details in `SECURITY_REVIEW.md`.
- **Logging:** pino JSON logs with request ids, token and password redaction.
- **Configuration:** environment only. `.env.example` files list every key with no secret values.
- **Health:** `GET /health/live` (process) and `GET /health/ready` (database).
- **Compatibility:** same database, same JWT secret, same files and settings, so Laravel/Angular and Express/Next.js can run side by side (`DEPLOYMENT.md`, `ROLLBACK_PLAN.md`).
