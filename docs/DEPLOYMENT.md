# Deployment

1. Install Node.js 22.13+ or 24+ and provision the NEAT database in MySQL.
2. Install dependencies with `npm ci` in both application directories.
3. Configure environment variables using each application's example.
4. Restore the database and `express-backend/storage` from approved backups.
   If this is a new installation, settings are initialized on API startup.
5. Run API static checks and the frontend production build.
6. Start the API with `npm start` and the frontend with `npm start`.
7. Check `/health/live`, `/health/ready`, login, catalogs and an existing asset URL.

No second source project or reference application is required. Frontend assets
are included in the checkout. Runtime uploads are intentionally not in Git:
deploying code alone cannot restore uploaded documents or images referenced by
an existing database.

## Persistent data

The backend Docker image runs as the `node` user and provides `/app/storage` as
a writable volume. Persist that directory across container replacements.
Mount custom paths only if the API process has appropriate read/write access.
Do not expose `settings.json` through the web server; only public storage
subdirectories are served.

Keep database and storage backups consistent. Before a release, capture the
current source revision, environment configuration and backups. For rollback,
restore the previous application build and its compatible configuration; do not
overwrite current user uploads with an older copy without a recovery plan.

## Release checks

Run the [test commands](TESTING.md). Validate actual SMTP delivery, configured
external integrations, TLS/reverse proxy configuration and role-based access in
the target environment. Local test success is not a production deployment
certification.
