# NEAT Portal Frontend

Next.js App Router and React application written in JavaScript/JSX. Includes
Student, Institute, Learner, Company, Admin and migrated panel interfaces.
Browser requests use the same-origin BFF; the session JWT stays in an httpOnly
cookie instead of browser JavaScript storage.

## Local setup

Requirements: Node.js 22+, npm, and the running
[Express API](../express-backend/README.md).

```powershell
npm ci
Copy-Item .env.example .env.local
# Set NEAT_API_ORIGIN and NEAT_JWT_SECRET in .env.local.
npm run dev
```

Do not overwrite an existing `.env.local` or commit it. `NEAT_JWT_SECRET` must
match the API's `JWT_SECRET`. `NEXT_PUBLIC_FILES_ORIGIN` is a public asset origin,
not a secret, and is applied at build time.

Open `http://localhost:3000`. For production:

```powershell
npm run build
npm start
```

## Checks

```powershell
npm run lint
npm run check:no-ts
npm run build
```

The browser suites use Playwright/Chromium and disposable SQL fixtures. Keep
this folder beside `express-backend` so the tests can load its database helpers.
Use only the isolated test database and dedicated test services.

After starting the test API described in the backend README, start a separate
frontend terminal:

```powershell
$env:NEAT_API_ORIGIN='http://localhost:4101'
$env:NEXT_PUBLIC_FILES_ORIGIN='http://localhost:4101'
$env:NEAT_DIST_DIR='.scratch\next-flow'
npm run dev -- --port 3101
```

Then run in another terminal:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:FLOW_API_ORIGIN='http://localhost:4101'
$env:FLOW_NEXT_ORIGIN='http://localhost:3101'
npm run test:flows
npm run test:recovered
```

Stop the dedicated test services afterwards. Remove only the generated
`.scratch\next-flow` directory before running `check:no-ts`, since Next.js
generates declaration files there. Do not remove the user's active build.

## Verified scope

Both browser-to-SQL suites and the production build passed on 2026-10-25.
Coverage includes registration/verification/login, profile save/edit/reload,
B2B enquiries, institute Excel nominations, purchased-course visibility,
company transaction approvals and admin free-seat allocation.

This does not certify every product-editor field, report, panel workflow or
external integration. See [test results](../migration-docs/TEST_PLAN.md) and
[remaining work](../migration-docs/MIGRATION_TRACKER.md).
