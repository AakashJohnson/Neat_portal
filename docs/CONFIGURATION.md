# Configuration

## API

Create `express-backend/.env` from its example. Required values are `DB_DATABASE`,
`DB_USERNAME`, connection credentials and `JWT_SECRET`. The API reads its own
environment file regardless of the invoking shell's working directory.

| Setting | Default / purpose |
|---|---|
| `PORT` | `4000` |
| `APP_URL`, `API_BASE_URL` | API URL and JWT issuer base |
| `FRONTEND_URL`, `PANEL_URL` | Browser-facing email and panel URLs |
| `PUBLIC_STORAGE_PATH` | `storage/public`, relative to the backend directory |
| `SETTINGS_PATH` | `storage/settings.json`, relative to the backend directory |
| `CORS_ORIGINS` | Allowed browser origins |
| `TRUST_PROXY` | Trusted proxy hops/subnets for client IP handling |
| `MAIL_TRANSPORT` | `json` for capture, `smtp` for real delivery |

Storage paths can be absolute for deployment volumes. Relative paths always
resolve from the backend directory, not from another project. New uploads are
written to this storage and served under the existing `/files`, `/upload` and
`/assets` URL prefixes.

When absent, the settings file is created with application defaults. Existing
settings are preserved; unreadable or malformed settings fail explicitly.
Panel updates persist to the same file used by all API settings readers.

## Frontend

Create `nextjs-frontend/.env.local` from its example.
`NEAT_API_ORIGIN` points to Express; `NEAT_JWT_SECRET` matches `JWT_SECRET`.
`NEXT_PUBLIC_FILES_ORIGIN` points to the public API asset origin and requires a
rebuild when changed. Frontend static assets are maintained locally in `public`.

## Optional services

SMTP, external payment providers, social widgets and NEAT Phase-2 are separate
service integrations. Configure Phase-2 API/schema variables only if its tools
are needed. Missing integration credentials or databases do not become fake
successful responses. Normal portal SQL access requires the configured MySQL
database, not another project's source code.

Never commit real environment files, storage contents or database records.
