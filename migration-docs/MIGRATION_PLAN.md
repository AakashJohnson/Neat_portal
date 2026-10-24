# MIGRATION_PLAN

Execution plan of the NEAT portal technology migration: Angular 8 → Next.js (React, plain JavaScript) and Laravel 6 → Node.js + Express (plain JavaScript), on the unchanged MySQL 8 database. The governing specification is the owner's `MASTER_TECHNOLOGY_MIGRATION_PLAN.md`; this document is its project-specific execution.

## 1. Scope

| In scope | Out of scope |
|---|---|
| Every effective Angular route and component (`FRONTEND_INVENTORY.md`) | Unreachable Angular components and Blade views (listed as UNREACHABLE in the inventories) |
| Every Laravel API route (`API_MAPPING.md`) and web route (`BACKEND_INVENTORY.md` §2) | Vanguard installer, Ignition/Debugbar (dev tooling) |
| Mail templates, file storage, settings, integrations (`INTEGRATIONS_INVENTORY.md`) | Database schema changes (forbidden) |
| Security hardening where the original is vulnerable (`DEVIATIONS.md`) | Fixing original functional defects (owner decisions, `INITIAL_RISK_REGISTER.md`) |
| Documentation (23 documents) and quality gates A–G | Production deployment and traffic switch (needs explicit authorisation) |

## 2. Constraints

- No TypeScript and no NestJS. No DDL. Tests never touch production (`neat_portal_test` only, enforced in `tests/setup.js`). No secrets in reports. Originals are read-only (moved to `D:\Anuvadhini\NEAT portal old` at the owner's request).
- Status vocabulary: NOT STARTED · IN PROGRESS · IMPLEMENTED (code exists) · TESTED (automated test passes) · VERIFIED (compared against the running original, or confirmed by the owner) · BLOCKED · UNRESOLVED (broken in the original).

## 3. Batches

| Batch | Scope | Exit evidence |
|---|---|---|
| B0 | Test DB, read-only schema baseline (hash + checksums), reference apps on the test DB, fixture users | BASELINE_REPORT, DATABASE_SCHEMA_REFERENCE, DEPENDENCY_INVENTORY, INITIAL_RISK_REGISTER |
| B1 | Inventories and traceability | FRONTEND/BACKEND/API inventories, API_MAPPING, BUSINESS_RULES, BACKGROUND_JOBS, INTEGRATIONS |
| B2 | Express foundation: config, Knex, JWT/api_tokens, RBAC, errors, serialisers, mail, uploads, health | token cross-compatibility tests |
| B3–B10 | API by area: auth/account, catalog, students/learners, institutes, companies/files, admin/free seats, payment/excel, stock API + panel endpoints | contract suites vs Laravel (`tests/contract/*`) |
| B11 | Unchanged Angular app run against Express | `tests/parity/angular-on-express-proxy.mjs` |
| B12–B16 | Next.js: shell/auth → public pages → student/learner → institute/company (TipTap editor) → admin → panel | parity suites vs Angular / Blade (`tests/parity/*`) and visual comparisons |
| B17 | Security and performance review | SECURITY_REVIEW, PERFORMANCE_REPORT |
| B18 | Build/lint gates, Dockerfiles, CI, deployment/rollback runbooks, final schema comparison, reports | DEPLOYMENT, ROLLBACK_PLAN, TEST_PLAN, TEST_REPORT, AUTHENTICATION_MIGRATION, FINAL_MIGRATION_REPORT |

Per batch: inspect the original → write acceptance criteria and IDs → implement → test → compare with the running original → update `MIGRATION_TRACKER.md`.

## 4. Quality gates

| Gate | Check | Command / evidence |
|---|---|---|
| A | No TypeScript in the frontend | `npm run check:no-ts` (nextjs-frontend) |
| B | No TypeScript or NestJS in the backend | `npm run check:no-ts` (express-backend), `package.json` |
| C | Database structure unchanged | `npm run check:no-ddl`; `npm run schema:baseline` before/after, identical hash and per-table structure |
| D | Lint and build | `npm run lint` (both), `next build`, backend start + `/health/ready` |
| E | Behaviour parity | contract suites (Express vs Laravel), parity suites (Next.js vs Angular/Blade) |
| F | Security | `tests/security/*`, authorisation matrix, SECURITY_REVIEW |
| G | Documentation complete | the 23 documents in `migration-docs` |

## 5. Cut-over strategy (summary)

Both stacks share the database, JWT secret, uploaded files and settings, so the switch is a routing change: point the public host at Next.js and `/api` at Express, keep Laravel/Angular deployed and idle for rollback. Details in `DEPLOYMENT.md` and `ROLLBACK_PLAN.md`. The switch itself requires the owner's explicit authorisation.
