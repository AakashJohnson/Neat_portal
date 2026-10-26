# Testing

## Static checks

From `express-backend`:

```powershell
npm run lint
npm run check:imports
npm run check:no-ddl
npm run check:no-ts
npm run check:standalone
```

From `nextjs-frontend`:

```powershell
npm run lint
npm run check:no-ts
npm run build
```

## API tests

Use an isolated, provisioned database named `neat_portal_test`:

```powershell
$env:DB_DATABASE='neat_portal_test'
npm test
```

The suite includes configuration defaults and corruption handling, storage path
resolution from a different working directory, upload delivery, settings
persistence, registration/login, profile persistence, enquiries, purchases,
allocations and permission checks. Mail is captured and runtime files use
temporary storage. No other backend server is used as a reference.

## Browser tests

Start the API in a separate terminal:

```powershell
Set-Location express-backend
$env:DB_DATABASE='neat_portal_test'
$env:PORT='4101'
$env:API_BASE_URL='http://localhost:4101/api'
node scripts\start-flow-server.js
```

Start a dedicated frontend:

```powershell
Set-Location nextjs-frontend
$env:NEAT_API_ORIGIN='http://localhost:4101'
$env:NEXT_PUBLIC_FILES_ORIGIN='http://localhost:4101'
$env:NEAT_DIST_DIR='.scratch\next-flow'
npm run dev -- --port 3101
```

Run the suites from another frontend terminal:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:FLOW_API_ORIGIN='http://localhost:4101'
$env:FLOW_NEXT_ORIGIN='http://localhost:3101'
npm run test:flows
npm run test:recovered
npm run test:navigation-search
```

The suites create and remove their own SQL fixtures. They cover role
registration/profile workflows, B2B persistence, purchases and approvals,
allocations, session-preserving navigation, responsive/touch scrolling, all
search inputs, pagination, debounce, stale responses and visible errors.
Phase-2 product responses and deliberately induced transport failures are
simulated; ordinary catalog/list tests use actual API/SQL results.

Stop the dedicated services afterwards. Remove only their generated build
directories before running the JavaScript-only check.

## Architecture dashboard

From `docs/architecture-dashboard`, run `npm test`, `npm run lint`,
`npm run build`, `npm run test:browser` and `npm run verify:repository`.

External service availability, production configuration and real user acceptance
must be validated separately.

## Verified on 2026-10-26

- API: 108 tests passed across 12 files, with no reference-server skips.
- All three browser-to-SQL suites passed, including registration/profile saves,
  B2B enquiries, purchase/approval/allocation flows and responsive live search.
- Frontend production build passed with 96 static pages. Lint has one existing
  accessibility warning on the settings authentication link.
- Architecture dashboard: 19 tests, browser suite, lint, build and repository
  scan passed; 207 endpoints and 48 schema tables were discovered with zero
  scan errors.
- The running API served byte-identical copies of local assets. Portal, API
  readiness and the relocated architecture dashboard returned HTTP 200.
- Existing uploads and settings were verified by SHA-256 during local storage
  setup. Database structure was not changed.
