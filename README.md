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
npm run test:navigation-search
```

Stop the dedicated test services afterwards. Remove only the generated
`.scratch\next-flow` directory before running `check:no-ts`, since Next.js
generates declaration files there. Do not remove the user's active build.

## Admin navigation and live search

- Admin Home sits beside Logout and retains the httpOnly session. The public
  navigation's Dashboard link returns to the admin area without another login.
  The management panel also has Home beside its logout/profile controls.
- Both admin sidebars keep their header/profile actions visible while the menu
  scrolls independently. The site admin menu toggle is React-controlled.
- Complete public catalogs and client-side tables filter immediately on input
  changes, including paste and clear. Course/company matches are partial and
  case-insensitive; clearing keeps the selected category/company.
- Server-paginated Student/Learner, panel Users/Activity and exact NEAT-ID
  lookups debounce for 250 ms and discard outdated responses. Loading, errors
  and empty results are visible. Searching resets pagination without discarding
  status or user-scope filters. Lookup typing never submits a creation form.

`test:navigation-search` covers every existing search surface: Home, B2C/B2B
catalogs, admin products and eight admin tables, MOU autocomplete, company
verification, institute students, panel users, all three activity views and
both NEAT-ID tools. It also checks session-preserving Home navigation, logout,
desktop/tablet/mobile sidebar scrolling, a native touch gesture, pagination,
debounce timing, late responses, visible errors and recovery.

The suite uses disposable SQL fixtures; only unavailable external Phase-2
product lookups and deliberate transport-race/error scenarios use controlled
responses. This is not certification of those external databases. Run details
and limitations are in the [test plan](../migration-docs/TEST_PLAN.md).

## Verified scope

Both browser-to-SQL suites and the production build passed on 2026-10-25.
Coverage includes registration/verification/login, profile save/edit/reload,
B2B enquiries, institute Excel nominations, purchased-course visibility,
company transaction approvals and admin free-seat allocation.

This does not certify every product-editor field, report, panel workflow or
external integration. See [test results](../migration-docs/TEST_PLAN.md) and
[remaining work](../migration-docs/MIGRATION_TRACKER.md).
