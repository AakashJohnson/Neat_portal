# NEAT Portal API

Express 5 and plain JavaScript API for the NEAT portal, using Knex and MySQL.
This application uses the existing SQL schema; it does not create or migrate tables.

## Local setup

Requirements: Node.js 22+, npm, and access to an existing NEAT MySQL database.
For development and tests, use the isolated `neat_portal_test` copy.

```powershell
npm ci
Copy-Item .env.example .env
# Fill in the database connection and JWT_SECRET in .env.
npm run dev
```

Do not overwrite an existing local `.env`. It is ignored by Git and must never
be committed. Set `FRONTEND_URL` to the browser-facing portal origin so email
links point to the correct deployment. Configure `PUBLIC_STORAGE_PATH` for
existing uploaded assets and `SETTINGS_PATH` for the writable settings file.
Use `.env.example` as the configuration reference.

The default API is `http://localhost:4000`; readiness is available at
`GET /health/ready`. `npm start` runs without the development watcher.

## Email

- `MAIL_TRANSPORT=json` captures messages without delivering them.
- For real delivery, configure SMTP and the sender, then use
  `npm run mail:verify` to check authentication without sending a message.
- SendGrid requires `MAIL_USERNAME=apikey`; the API key belongs only in the
  local secret configuration as `MAIL_PASSWORD`.
- Provider acceptance does not establish inbox delivery.

## Validation

```powershell
npm run lint
npm run check:imports
npm run check:no-ddl
npm run check:no-ts
$env:DB_DATABASE='neat_portal_test'
npm test -- tests\contract\registration-enquiry.regression.test.js tests\contract\profile-persistence.regression.test.js tests\contract\recovered.contract.test.js tests\unit\mailer.test.js
```

Database tests refuse other database names. They need an already provisioned
test copy and must not be pointed at production. Full legacy comparisons also
need the original Laravel reference application.

For the frontend browser suites, start a dedicated API:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:PORT='4101'
$env:API_BASE_URL='http://localhost:4101/api'
node --watch scripts\start-flow-server.js
```

This runner forces capture-only mail and a test-only request limit. Never use it
as the production server.

## Current status

The 2026-10-25 acceptance run passed 65 backend tests; 77 reference-dependent
comparisons were skipped because Laravel was unavailable. Registration,
verification, login, B2B persistence, profile updates, institute nominations,
company transaction review and allocation have targeted regression coverage.
The existing SQL schema fingerprints remained unchanged.

This is not full production certification. Payment callback verification,
external authentication integrations, broader company/admin/panel acceptance
and staging checks remain.

See [test evidence](../migration-docs/TEST_PLAN.md),
[behavioral corrections](../migration-docs/DEVIATIONS.md), and
[deployment instructions](../migration-docs/DEPLOYMENT.md).
