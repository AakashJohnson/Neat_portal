# NEAT Architecture Observatory

A **local development-only** React Flow dashboard derived from the sibling
Next.js and Express repositories and checked-in MySQL schema evidence.
It does not add a route, dependency, migration or behavior change to either
production application.

## Install and run

Use **Node.js 24 LTS** (verified with Node 24.15.0). The dependency-compatible
engine range is `^22.13.0 || ^24.0.0 || >=26.0.0`.
From this directory:

```powershell
npm ci --ignore-scripts
npm run build
npm run dev
```

Open **http://127.0.0.1:4310**. The default root is two directories above this
tool: the directory containing `express-backend`, `nextjs-frontend` and
`migration-docs`. This also works in the published subtree-based monorepo.

The build is a static client bundle; the serving process and file watcher remain
development-only. Startup refuses `NODE_ENV=production`. No frontend/Express
application server or SQL connection is needed to use the dashboard.

Options are explicit startup choices, not public HTTP parameters:

```powershell
# Cursor must be installed and its file URL handler registered locally.
npm run dev -- --editor cursor
npm run dev -- --editor vscode

# Another intentional repository root or a free local port.
npm run dev -- --root "D:\Projects\my-repository" --port 4311

# No source watcher; manual scan remains available.
npm run dev -- --no-watch

# Optional Vite middleware for developing the dashboard UI itself.
# Restart after changing tooling/scanner code. Target-source SSE refresh
# works in both modes; UI hot reload is deliberately disabled.
npm run dev -- --ui-dev
```

Editor integration defaults to **none**: the inspector copies a relative
`file:line` reference. No universal Cursor/VS Code handler is assumed. The editor
endpoint accepts only a node from the current manifest, checks its source is
still a regular file inside the configured root, and returns a link. It never
launches a shell or accepts an arbitrary filesystem path.

Stop the local server with **Ctrl+C**. It closes the watcher, HTTP connections
and optional Vite middleware.

## Verified discovery

The inspected lockfiles identify:

| Surface | Source evidence | Observed architecture |
|---|---|---|
| Frontend | [package](../../nextjs-frontend/package.json), [site layout](../../nextjs-frontend/src/app/(site)/layout.js), [panel layout](../../nextjs-frontend/src/app/(panel)/layout.js) | Next 16.4.3 / React 19.3.1; App Router; separate root layouts; explicit client boundaries |
| Browser requests | [client](../../nextjs-frontend/src/lib/api.js), [services](../../nextjs-frontend/src/services/index.js), [BFF](../../nextjs-frontend/src/app/bff/[...path]/route.js) | Same-origin BFF calls, then a configured Express `/api` origin |
| Backend | [app](../../express-backend/src/app.js), [routers](../../express-backend/src/routes/index.js) | Express 5.3.0; middleware, feature routers, controllers/services/repositories |
| SQL | [Knex configuration](../../express-backend/src/database/knex.js), [snapshot](../evidence/schema-baseline-neat_portal-2026-10-23T18-31-53-202Z.json) | Knex 3.3.0 / mysql2 3.24.6; snapshot server MySQL 8.0.46 |
| Authentication | [JWT service](../../express-backend/src/services/auth/jwtService.js), [session route](../../nextjs-frontend/src/app/api/session/route.js) | JWTs with SQL token records; browser httpOnly cookie; source-detectable authorization helpers |
| Infrastructure | [backend Dockerfile](../../express-backend/Dockerfile), [frontend Dockerfile](../../nextjs-frontend/Dockerfile), [CI](../ci/ci.yml) | Docker and GitHub Actions definitions, not proof of a running deployment |

The historical schema snapshot has **48 tables, 621 columns and 9 explicit
foreign keys**, including legacy column names containing spaces. The selected
snapshot and timestamp appear in the SQL view. The default selection is the
newest discoverable non-test snapshot; available alternatives are listed in
the manifest. This is not evidence of the currently configured database.

**UNKNOWN:** deployed provider/topology, live schema drift, runtime database
name and prefix, runtime API origins, effective authorization, complete
request/response contracts, migration execution history and worker deployment.
Packages and timer/state calls are structural signals, not claims about
deployed infrastructure.

## Using the dashboard

Eight views cover the system overview, Next frontend, Express backend, API
request flows, SQL ER diagram, authentication, infrastructure and dependencies.

- The initial overview aggregates discovered nodes into layers. Click a layer
  to drill down.
- Search names, relative paths, endpoint paths, modules and SQL column names.
  Global search suggestions can jump into a focused dependency neighborhood.
- Layer toggles include tests. Confidence filtering distinguishes verified,
  inferred and unresolved evidence.
- Zoom, pan, drag, fit-to-screen and an interactive minimap are provided.
- Detail views show at most **160 nodes by default**. Select 80/160/320/600 or
  narrow by search. Visible/total/omitted counts are explicit; the downloaded
  manifest is complete within scanner budgets.
- SQL table cards list columns, primary/foreign-key flags and data types.
  Long tables scroll internally. The inspector shows indexes, declared foreign
  keys, source evidence and incoming service/repository queries.
- Endpoint inspectors include detectable auth/validation signals, partial
  request/response fields and tables found in a bounded handler trace.
- Source evidence and incoming/outgoing relationships are clickable.
- Analysis notes are review hints, not confirmed vulnerabilities or proof that
  code is unused. The note list initially displays 200; all notes remain in
  the manifest and per-node inspector.
- **Evidence & limits** shows coverage, limitations and a local JSON download.

## Scanner and evidence model

```powershell
npm run scan
npm run scan -- --root "D:\Projects\my-repository"
```

The command writes the versioned, validated graph atomically to
`.cache/architecture.json`. It returns a nonzero exit code for scan errors
while preserving successfully analyzed files and their error diagnostics.
The interactive server keeps the current manifest in memory and supports
download; it never trusts an old cache as current source.

Implementation:

- [files.mjs](server/files.mjs): bounded discovery, nested gitignore rules and
  path confinement.
- [analyze.mjs](server/analyze.mjs): Babel JS/JSX/TS/TSX parsing, named symbols,
  imports/re-exports, literal dynamic imports, aliases, JSX rendering, App
  Router conventions, Express mounts/handlers/middleware, API requests and
  Knex query/migration patterns.
- [sql.mjs](server/sql.mjs): MySQL DDL parsing and whitelisted schema snapshots.
- [scanner.mjs](server/scanner.mjs): graph assembly, dependency versions and
  coverage; [manifest.mjs](server/manifest.mjs): version `1.0`, stable identities,
  evidence, confidence and referential validation.
- [diagnostics.mjs](server/diagnostics.mjs): cycles, no-detected-caller/import
  hints, direct-test visibility, coupling, substantial duplicate AST bodies,
  SQL interpolation, credential-shaped literals and auth/validation visibility.
- [watcher.mjs](server/watcher.mjs): debounced, serialized scan coordination.
- [server.mjs](server/server.mjs): fixed-root, loopback-only HTTP/SSE service.
- [ui](ui): React Flow filtering, layouts, inspection and refresh.

Stable node identities derive from relative paths, named symbols and composed
method/path registrations, not line numbers. Evidence preserves source line
locations. A source rename intentionally changes path-based identities.

Imports and direct symbol references are verified where resolvable. A module
reference is not presented as an exact function invocation when that function
cannot be resolved. BFF path rewriting is explicitly **inferred** from the
adapter/proxy source; URL matching never proves runtime origin configuration.
Next layout associations are convention-based inferences. Runtime rendering
mode (static/dynamic/streaming) is not guessed from the framework alone.

The scanner recognizes the current repository's Knex patterns and MySQL
snapshot format. It parses `CREATE TABLE` DDL and basic Knex `createTable`
declarations. It does not execute migrations or replay `ALTER`/`DROP` history
to invent a current schema. Prisma files are detected but reported unsupported;
there is no Prisma model parser because this application uses Knex.

### Refresh triggers

The watcher handles create, change, rename (unlink/add) and delete events for
JS/JSX/MJS/CJS/TS/TSX, SQL, Prisma, CSS, JSON, YAML, Dockerfiles, environment
templates and `.gitignore`. Relevant directory changes also trigger scans.
Private `.env` changes do not trigger scans and are never read.

Writes settle for 120 ms; events are then debounced for 250 ms. Scans never
overlap. A change arriving during a scan queues one subsequent scan. Editing
ignore rules causes discovery to reevaluate the rules. SSE sends status and
revision notifications; the browser replaces the graph without reloading the
page. Manual rescan uses the same coordinator.

States are idle, scanning, ready, stale and error. A failed scan retains the
last successful graph, explicitly marked stale with an error. Source parse
errors produce a partial graph with visible error counts and per-file notes.
A disconnected browser also marks its view stale.

### Exclusions and limits

Always excluded: `.git`, `node_modules`, `.next`, `dist`, `build`, `out`,
`coverage`, `.cache`, `.scratch`, `.vercel`, `.playwright-mcp`, `vendor`, `public`,
`assets`, `generated`, `final-run`, `test-results`, `playwright-report`, and this
tool's own `architecture-dashboard` directory. Nested `.gitignore` rules also
apply. Asset imports can therefore appear unresolved; that is intentional.

Private environment files, key/certificate/database files, logs, symlinks and
hardlinks are excluded. `.env.example` contributes key names only, never values.
The root is resolved at startup. Files are confined to that root and checked
again before reading. Limits: 6,000 files, 4 MiB per file and 48 MiB total
discovered bytes. Budget exclusions and unsafe/disappearing files are reported.

No application imports, `eval`, subprocess source execution, schema changes,
database connections, background introspection or source uploads occur.
Manifests omit source snippets, literal credentials, SQL text/defaults/comments,
row data and connection-string values. Parser/filesystem exception messages
are not copied into responses because they can contain sensitive input.

HTTP is bound only to `127.0.0.1`, checks exact local Host/Origin, rejects
cross-site requests and requires a per-start token for graph/status/mutation
endpoints. Rescan accepts only an empty JSON object. These controls are
defense-in-depth for local tooling, **not a substitute for authentication on a
public server**. Do not reverse-proxy or deploy this tool publicly.

## Tests and verification

```powershell
npm test
npm run lint
npm run build
npm run test:browser
npm run verify:repository
```

Vitest matches the backend's existing test framework. Fixtures cover source
exclusions, nested ignore rules, traversal/symlink/hardlink rejection, limits,
Next/Express/import/API/handler/SQL/migration extraction, stable identities,
malformed source, secret omission, graph validation, filtering, server access
controls, debouncing, failed scans and watcher create/change/rename/delete.

The Playwright browser test uses a temporary source fixture and its own local
server. It checks graph/ER display, inspector, search, layer filters, drag,
zoom, fit, responsive layout, manual scan and source-change refresh without
page reload, and closes all helpers afterward. It never starts or writes to
the portal or its database.

`verify:repository` checks this NEAT checkout specifically: all 48 declared
tables, 621 columns, nine foreign keys, the mounted login endpoint, the actual
`mysql2` client configuration, inferred BFF edges, generated/private-file
exclusions and zero scan errors. It only parses files.

Implementation verification: **19 Vitest tests passed**, the Chromium workflow
passed, lint and build passed, and the real-repository checks passed. A
read-only HTTP smoke check also returned 200 from the existing Next homepage
and Express liveness route. The production application worktrees were left
unchanged; the full portal acceptance suite was not rerun for this isolated
tooling addition.

If the browser command specifically reports a missing Chromium executable,
install that missing runtime with `npx playwright install chromium`, then
retry. No additional Python or TypeScript toolchain is required; the tooling
is JavaScript and the client build validates the JSX bundle.

Vite can report that React Flow's `"use client"` directive is not preserved.
This is benign in this standalone browser-only application: it has no React
Server Components boundary to preserve.

## Known analysis limits

- Computed import paths, complex factory-generated routes, full CommonJS export
  resolution, arbitrary class dispatch and runtime dependency injection.
- Dynamic HTTP methods/URLs, external callers, conditional mount order, complex
  proxy transforms and actual configured origin values.
- Full interprocedural dataflow, return types, validation completeness and
  effective auth/permission enforcement. Endpoint traces are capped at 500
  graph nodes; truncation is recorded.
- Effective schema after unexecuted migrations, dynamic table names/prefixes,
  arbitrary query-builder wrappers and ORM dialects other than supported MySQL
  declarations.
- Indirect integration-test coverage, runtime telemetry and actual hosting
  resources. Lack of a detectable import or helper is not proof of absence.

The existing portal's migration acceptance and remaining production-readiness
work are separate from this development dashboard; see the
[migration README](../README.md).
