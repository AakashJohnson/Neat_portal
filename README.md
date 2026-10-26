# NEAT Portal Web

Next.js App Router application built with React and JavaScript. Includes the
public portal, Student, Learner, Institute, Company and Admin dashboards, and
the management panel.

## Setup

Requirements: Node.js 22.13+ or 24+, npm and the [NEAT API](../express-backend/README.md).

```powershell
npm ci
Copy-Item .env.example .env.local
# Configure NEAT_API_ORIGIN and NEAT_JWT_SECRET.
npm run dev
```

Open `http://localhost:3000`. Do not overwrite an existing `.env.local`.
Use `npm run build` followed by `npm start` for production.

## Configuration and assets

- `NEAT_API_ORIGIN` is the server-side Express origin.
- `NEAT_JWT_SECRET` matches the API's `JWT_SECRET`.
- `NEXT_PUBLIC_FILES_ORIGIN` is the public origin for API uploads; it is embedded
  at build time, so rebuild after changing it.
- Browser requests use the same-origin BFF. The JWT stays in an httpOnly cookie.
- All frontend themes, fonts, images and editor styles are checked in under
  `public`. Edit these local assets directly; no external source tree or asset
  extraction command is needed.
- Google Fonts, analytics, social widgets and configured product links are
  ordinary external web services, not local project dependencies.

## Navigation and search

Admin Home navigation preserves login and both admin menus scroll independently.
Every existing search field updates on input changes, including paste and clear.
Complete catalogs filter locally; server searches debounce for 250 ms and ignore
outdated responses. Filters and user scope are retained, pagination resets on
search, and errors/loading/empty results are visible.

## Checks

```powershell
npm run lint
npm run check:no-ts
npm run build
```

Start the dedicated test API described in the backend README, then start a
separate frontend:

```powershell
$env:NEAT_API_ORIGIN='http://localhost:4101'
$env:NEXT_PUBLIC_FILES_ORIGIN='http://localhost:4101'
$env:NEAT_DIST_DIR='.scratch\next-flow'
npm run dev -- --port 3101
```

In another terminal:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:FLOW_API_ORIGIN='http://localhost:4101'
$env:FLOW_NEXT_ORIGIN='http://localhost:3101'
npm run test:flows
npm run test:recovered
npm run test:navigation-search
```

These suites use Playwright and disposable SQL fixtures. Stop the dedicated
servers afterwards and remove only their generated build directory before the
JavaScript-only check. See [testing](../docs/TESTING.md).
