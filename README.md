# NEAT Portal

NEAT portal migration from Angular/Laravel to Next.js/React and Express, written
in JavaScript and using the existing MySQL schema.

## Repository layout

| Folder | Purpose |
|---|---|
| [express-backend](express-backend/README.md) | API, authentication, SQL persistence, mail and regression tests |
| [nextjs-frontend](nextjs-frontend/README.md) | Public portal, role dashboards, BFF and browser acceptance tests |
| [migration-docs](migration-docs/README.md) | Migration status, API mapping, deviations, test evidence and deployment guidance |

## Getting started

Requirements: Node.js 22+, npm, and an existing NEAT MySQL database. The repository
does not provision or modify database structure. Obtain an approved database
copy separately; use `neat_portal_test` for write-based tests.

Start the backend in one terminal:

```powershell
Set-Location express-backend
npm ci
Copy-Item .env.example .env
# Configure DB_* and JWT_SECRET locally before starting.
npm run dev
```

Start the frontend in another:

```powershell
Set-Location nextjs-frontend
npm ci
Copy-Item .env.example .env.local
# Set NEAT_API_ORIGIN=http://localhost:4000 and the matching NEAT_JWT_SECRET.
npm run dev
```

The portal is at `http://localhost:3000`; API readiness is at
`http://localhost:4000/health/ready`. Do not overwrite existing local environment
files. Configure existing asset storage and runtime settings as described in the
backend README.

## Configuration and data safety

- Local `.env` and `.env.local` files are excluded from Git. Only configuration
  templates belong in source control.
- Keep credentials, SMTP keys, database dumps and personal data out of commits.
- `MAIL_TRANSPORT=json` captures mail without sending it. Configure SMTP
  separately when real delivery is required.
- Keep production data separate from test fixtures. Tests require
  `DB_DATABASE=neat_portal_test`.
- Schema changes are not part of this migration.

## Verified progress

The 2026-10-25 core acceptance pass covered:

- Student, Institute and Learner registration, verification, login and profiles.
- B2B enquiry validation and complete SQL persistence.
- Institute nomination uploads using the downloadable Excel template.
- Company transaction approvals and student/learner purchased-course lists.
- Admin free-seat allocation and allocation/code-redemption persistence.
- All 16 formerly placeholder APIs now have implementations.

Results: **65 backend tests passed**, both expanded browser-to-SQL suites passed,
and the frontend production build passed. Both SQL schema fingerprints remained
unchanged. **77 Laravel-reference comparisons were skipped**, not passed.

Run commands and evidence are in [TEST_PLAN.md](migration-docs/TEST_PLAN.md).
Intentional corrections are documented in
[DEVIATIONS.md](migration-docs/DEVIATIONS.md).

## Remaining work

This is a working migration snapshot, **not a full production sign-off**.
Company product-editor workflows, broader admin/report/panel acceptance,
legacy reference comparisons, payment callback verification, external login
integrations and staging deployment still require completion.

Use the [migration tracker](migration-docs/MIGRATION_TRACKER.md) for current scope
and the [deployment guide](migration-docs/DEPLOYMENT.md) before deployment.