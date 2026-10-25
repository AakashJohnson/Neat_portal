# DEPLOYMENT

How to build, configure and run the migrated stack, and how to switch traffic. **Nothing in this document has been executed against production.** Deployment and traffic switching require the owner's explicit authorisation.

## 1. Components

| Component | Runtime | Port | Health |
|---|---|---|---|
| Express API (`express-backend`) | Node.js 22 LTS | 4000 | `GET /health/live` (process), `GET /health/ready` (database) |
| Next.js frontend (`nextjs-frontend`) | Node.js 22 LTS | 3000 | `GET /` |
| MySQL 8 `neat_portal` | existing server | 3306 | unchanged |

Production infrastructure (web server, process manager, backups) of the original is not in the repository (R-10). The steps below assume a reverse proxy (nginx or similar) in front of both Node processes.

## 2. Build

```bash
# Backend
cd express-backend
npm ci --omit=dev
npm run check:no-ts && npm run check:no-ddl

# Frontend (NEXT_PUBLIC_* are inlined at build time)
cd nextjs-frontend
npm ci
NEXT_PUBLIC_FILES_ORIGIN=https://<api-host> npm run build
```

Or with Docker:

```bash
docker build -t neat-api express-backend
docker build -t neat-web --build-arg NEXT_PUBLIC_FILES_ORIGIN=https://<api-host> nextjs-frontend
```

## 3. Configuration

All keys are listed, without values, in `express-backend/.env.example` and `nextjs-frontend/.env.example`. Secrets come from the deployment's secret store, never from the repository.

| Must match the original | Why |
|---|---|
| `JWT_SECRET` (API) = Laravel `JWT_SECRET`; `NEAT_JWT_SECRET` (web) = same value | tokens valid on both backends (AUTHENTICATION_MIGRATION §4) |
| `DB_*` | same database |
| `PUBLIC_STORAGE_PATH` → the same `public/` directory Laravel serves (`files/`, `upload/`) | uploads keep their URLs |
| `SETTINGS_PATH` → the same `storage/settings.json` | panel settings shared |
| `MAIL_*` with `MAIL_TRANSPORT=smtp` | real delivery (dev/test use `json`) |

| Must be set for production | Value |
|---|---|
| `NODE_ENV` | `production` (Secure cookie, no stack traces) |
| `CORS_ORIGINS` | the portal origin(s) only |
| `LEGACY_PUBLIC_ENDPOINTS` | `false`; `true` re-opens original vulnerabilities and is for contract tests only |
| `FRONTEND_URL`, `PANEL_URL` | public URLs used in e-mail links |
| `NEAT_API_ORIGIN` (web) | internal URL of the API |

### Registration and notification readiness

- `MAIL_TRANSPORT=json` **does not send email**, even when SMTP credentials are populated. Accounts requiring confirmation remain unable to log in until verified.
- For real delivery, configure `MAIL_TRANSPORT=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_ENCRYPTION`, credentials and sender in the local secret configuration, then restart Express. Verify actual receipt with an approved test recipient. The follow-up repair enabled SMTP locally; it did **not** activate existing accounts.
- SendGrid requires the literal SMTP username `apikey`, not an account name. For `smtp.sendgrid.net` the transport enforces this username, logs a configuration warning if needed, and uses the existing `MAIL_PASSWORD` API key. Other providers keep their configured username. `npm run mail:verify` checks SMTP authentication without sending mail.
- On 2026-10-25, authentication succeeded after the SendGrid correction. One technical email to the configured sender address was accepted by SMTP (one accepted recipient, none rejected). SMTP acceptance is not proof of inbox placement.
- Set `FRONTEND_URL` to the portal that owns these accounts. For local use this is `http://localhost:3000`, not the API origin or production portal. Verification email addresses are URL-encoded, including `+` aliases.
- Registration responds with `requires_email_confirmation` and `email_delivery`. `captured` or `failed` means the account/profile transaction committed, but verification email was not delivered. Do not register again; fix mail delivery and use **Resend verification email** on the login page.
- B2B success means the enquiry was saved in `b2b_enquiry`; `email_delivery` separately reports the company notification. A notification failure is not a reason to resubmit the enquiry.
- Existing incomplete accounts/profiles are not automatically rewritten or deleted. Inspect and reconcile them only with owner approval. New conflicts return 409 instead of creating more partial records.
- Institute registration stores identity and permanent institute ID in `users`. The AISHE code belongs to the post-login institute profile and is stored in `institute_details.institute_aishe_code`.
- The stale local API process was replaced with `npm run dev` on port 4000. It now serves the fixes and reloads source changes. The isolated test services on ports 4101/3101 were stopped after testing; they are not the user's running application.

## 4. Routing

| Public path | Target |
|---|---|
| `/api/session`, `/api/panel/session`, `/api/panel/impersonate` | Next.js BFF session endpoints (must take precedence over `/api/*`) |
| `/bff/*` | Next.js BFF proxy, which adds the httpOnly session token |
| `/api/*` | Express (same paths as Laravel's API, so mobile and external consumers keep working) |
| `/files/*`, `/upload/*` | static files from `PUBLIC_STORAGE_PATH` (Express serves them; a web server can serve them directly) |
| `/panel/*` | Next.js (the Blade panel; DEV-F14) |
| everything else | Next.js |
| old panel paths on the Laravel host (`/login`, `/users`, `/settings`, …) | 301 to `/panel/...` if the panel host name is kept |

## 5. Cut-over runbook

Preconditions: final TEST_REPORT green, owner sign-off on PROPOSED deviations and open risks, backups taken, maintenance window agreed.

1. Back up `neat_portal`, `public/files`, `public/upload` and `storage/settings.json`.
2. Record the schema baseline (`npm run schema:baseline`) and keep the JSON.
3. Deploy Express and Next.js next to the running Laravel/Angular, with the shared configuration above. Check `/health/ready` and smoke-test through an internal host name.
4. Switch the reverse proxy: `/api` → Express, the site → Next.js. Keep Laravel and Angular deployed but without traffic.
5. Watch for 30 minutes: 5xx rate, `/health/ready`, login success, uploads, payment callbacks (`/neatstudentresponse.php`), mail delivery.
6. Run the schema baseline again; the hash must equal step 2.
7. Keep the old stack available for the rollback period (ROLLBACK_PLAN).

## 6. Continuous integration

`migration-docs/ci/ci.yml` is published to `.github/workflows/ci.yml` of the monorepo by `tools/publish-monorepo.sh`. It runs the static gates, lint, backend unit tests and the frontend production build on every push and pull request. Contract and parity suites need the MySQL test copy and the reference apps, so they run on the migration workstation (TEST_PLAN).
