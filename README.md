# NEAT Portal

A web platform for educational products, students, learners, institutes,
companies and administrators.

| Component | Technology | Setup |
|---|---|---|
| API | Express, JavaScript, Knex, MySQL | [Backend](express-backend/README.md) |
| Web | Next.js, React, JavaScript | [Frontend](nextjs-frontend/README.md) |
| Documentation | Configuration, deployment and testing | [Docs](docs/README.md) |
| Architecture dashboard | Source graphs, API traces and SQL snapshots | [Dashboard](docs/architecture-dashboard/README.md) |

## Run locally

Use Node.js 22.13+ or 24+, npm and a provisioned NEAT MySQL database.
Configure the backend's `.env` and frontend's `.env.local` from their examples.
Start `npm run dev` in each application directory.

Backend terminal:

```powershell
Set-Location express-backend
npm ci
Copy-Item .env.example .env
# Set database credentials, JWT_SECRET and service URLs before starting.
npm run dev
```

Frontend terminal:

```powershell
Set-Location nextjs-frontend
npm ci
Copy-Item .env.example .env.local
# Set NEAT_API_ORIGIN and the matching NEAT_JWT_SECRET.
npm run dev
```

Copy the examples only on first setup; never overwrite existing configuration.

- Portal: `http://localhost:3000`
- API readiness: `http://localhost:4000/health/ready`
- Architecture dashboard: `npm run dev` from `docs/architecture-dashboard`

Both applications are self-contained. Backend uploads and settings live in
`express-backend/storage`; frontend assets are in `nextjs-frontend/public`.
No other local source project is required.

## Data and credentials

Keep credentials and runtime storage out of Git. Back up the database and
backend storage together; restore them separately from source deployment.
Use only `neat_portal_test` for write-based automated tests.
Optional SMTP, payment and Phase-2 integrations require their own configuration.

See [deployment](docs/DEPLOYMENT.md), [configuration](docs/CONFIGURATION.md)
and [testing](docs/TESTING.md). Third-party notices and licenses are retained.

## Verification

The 2026-10-26 verification passed 108 API tests, all three browser-to-SQL
workflow suites, the frontend production build, and 19 architecture-dashboard
tests plus its browser checks. The database schema was not changed.

Use `npm run check:standalone` from `express-backend` to check the combined
source layout for obsolete external-project paths. Detailed commands and
coverage limitations are documented in [testing](docs/TESTING.md).
Optional external integrations and production deployment still require
environment-specific validation.
