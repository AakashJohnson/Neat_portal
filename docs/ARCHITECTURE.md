# Architecture

## Applications

- **Next.js / React:** public catalogs, authentication pages, role dashboards and
  a management panel. Static resources are bundled locally under `public`.
- **Next.js BFF:** same-origin browser API requests, httpOnly cookie handling
  and forwarding to Express. Secrets remain server-side.
- **Express:** routing, validation, authorization, business services, mail,
  public file serving and settings persistence.
- **MySQL / Knex:** accounts, profiles, courses, enquiries, purchases and seat
  allocations. The schema must be provisioned before using the application.

## Request flow

Browser -> Next.js -> authenticated BFF -> Express route -> service -> Knex/MySQL.
Uploaded assets are served by Express from its configured public storage.
Public frontend images, fonts and styles are served directly by Next.js.

The role ID and API permissions govern private pages and operations. Admin Home
navigation changes the page without deleting the shared session cookie.
Logout clears the session. Server search responses are guarded against
out-of-order completion and paginated searches use a 250 ms debounce.

## Runtime data

`express-backend/storage/public` contains uploaded files; `storage/settings.json`
contains writable admin settings. Both paths are project-local by default and
can be mounted independently for production. Settings are never exposed as
static files.

## Development tooling

The optional architecture dashboard scans source files and checked-in schema
snapshots. It does not execute application modules or connect to the database.
Use its evidence/confidence labels: inferred links and unresolved references
are not proofs of runtime behavior.
