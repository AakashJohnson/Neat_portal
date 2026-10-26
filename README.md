# NEAT Portal API

Express 5 API built with JavaScript, Knex and MySQL. Provides authentication,
course catalogs, registrations, enquiries, profiles, purchases, allocations,
uploads and administration.

## Setup

Requirements: Node.js 22.13+ or 24+, npm and a provisioned NEAT MySQL database.

```powershell
npm ci
Copy-Item .env.example .env
# Configure DB_*, JWT_SECRET, FRONTEND_URL and optional mail services.
npm run dev
```

Do not overwrite an existing `.env`. Production starts with `npm start`.
The default API is `http://localhost:4000`; liveness is `/health/live` and
database readiness is `/health/ready`.

## Local runtime storage

```dotenv
PUBLIC_STORAGE_PATH=storage/public
SETTINGS_PATH=storage/settings.json
```

Relative paths resolve from this backend's directory, even if Node starts from
a different working directory. Absolute paths are supported for mounted volumes.

- Uploaded files and images live under `storage/public/files`,
  `storage/public/upload` and `storage/public/assets`. Their HTTP URLs remain
  `/files/...`, `/upload/...` and `/assets/...`.
- Default avatar and mail-logo images are bundled under `assets/public`, so a
  fresh checkout does not need a storage backup for built-in branding.
- Admin settings are saved to `storage/settings.json`. First startup creates
  safe defaults when this file is absent. Existing settings are never replaced.
  Invalid settings JSON is reported as an error rather than silently reset.
- `storage` is private runtime data and is excluded from Git and Docker build
  contexts. Back it up separately. A fresh checkout contains code, not user
  uploads; restore your storage backup when deploying an existing database.
- Docker uses a writable `/app/storage` volume. No other source project or
  server-side framework is required.

## Email and integrations

`MAIL_TRANSPORT=json` captures mail without delivery. Configure SMTP and the
sender for real delivery. `npm run mail:verify` checks SMTP authentication
without sending mail. SendGrid requires `MAIL_USERNAME=apikey`.

The optional NEAT Phase-2 service uses `EOI_API_URL`, `EOI_DB_SCHEMA` and
`EOI_REGISTRY_DB_SCHEMA`. Configure these only when using Phase-2 document
forwarding or product imports. These are external integrations, not local
source-folder dependencies. MySQL remains required for the application.

## Checks

```powershell
npm run lint
npm run check:imports
npm run check:no-ddl
npm run check:no-ts
npm run check:standalone
$env:DB_DATABASE='neat_portal_test'
npm test
```

Database tests require the isolated `neat_portal_test` database. Tests use
disposable accounts, captured mail and separate storage/settings.
For browser tests, start a dedicated API:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:PORT='4101'
$env:API_BASE_URL='http://localhost:4101/api'
node scripts\start-flow-server.js
```

See [testing](../docs/TESTING.md), [deployment](../docs/DEPLOYMENT.md) and
[configuration](../docs/CONFIGURATION.md).
