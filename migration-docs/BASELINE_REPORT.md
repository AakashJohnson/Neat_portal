# BASELINE_REPORT

Status of the original system as captured before migration work (Phase 0). All
discovery was read-only against the original repositories; database discovery
used `information_schema` reads only.

## 1. Systems under migration

| Item | Value | Evidence |
|---|---|---|
| Frontend | Angular 8.2.14 (CLI 7.3.9, build-angular 0.13.9), TypeScript 3.5 | `frontend/frontend/package.json`, `node_modules/@angular/core/package.json` |
| Frontend runtime | Needs Node ≤ 14 (fails on Node 24: `No such module: http_parser`). Runs locally on portable Node 12.22.12 | run log, 2026-10-23 |
| Backend | Laravel 6.0.3 on PHP `^7.2` (`composer.json`), package name `loshmis/neat` (Vanguard-based starter) | `vendor/laravel/framework/src/Illuminate/Foundation/Application.php` |
| Backend runtime | Fails on PHP 8 (`ReflectionParameter::getClass()` deprecation becomes an exception). Runs locally on portable PHP 7.4.33 | run log, 2026-10-23 |
| Database engine (local) | MySQL 8.0.46, service `MySQL80`, port 3306 | `SELECT VERSION()` |
| Database engine (origin) | **MariaDB 10.4.27** — the supplied dump `neat_portal.sql` was produced by phpMyAdmin 5.2.0 from MariaDB 10.4.27 / PHP 7.4.33 | dump header |
| Database | `neat_portal` (48 tables, 621 columns, 9 FKs, 0 views/triggers/routines) | `DATABASE_SCHEMA_REFERENCE.md` |

> **Engine note.** Production most likely runs MariaDB 10.4 (dump origin). Local
> development and tests use MySQL 8.0. The Node data layer uses `mysql2`, which
> supports both. SQL used by the port must stay within the MariaDB 10.4 / MySQL 8
> common subset (no `JSON_TABLE`, no window functions beyond MariaDB 10.2 support,
> no MySQL-only collations). Recorded as risk R-02.

## 2. Environments discovered

| Environment | API base | Static files base | Source |
|---|---|---|---|
| Local (active in code) | `http://localhost:8000/api` | `http://localhost:8000` | `frontend/frontend/src/app/app.component.ts:80-85` |
| QA (commented) | `https://neatapiqa.aicte-india.org/api` (10.0.0.25) | `https://neatapiqa.aicte-india.org`, `https://qaneatapi.aicte-india.org` | same file |
| Production (commented) | `https://neatapi.aicte-india.org/api` | `https://neatapi.aicte-india.org` | same file |
| Related systems | `neateoi.aicte-india.org`, `neatphase2eoi.aicte-india.org`, `neatphase2eoiapi.aicte-india.org/api/saveDocument` | navbar, `Api/FileController.php:122` |

No CI/CD configuration, Dockerfiles or deployment scripts exist in either repository. Infrastructure details (web server, process manager, hosting) are **not discoverable from source** → risk R-10.

## 3. Build, run and test commands (original)

| App | Build | Run | Tests |
|---|---|---|---|
| Angular | `ng build --prod` → `dist/frontend` | `ng serve` (needs `NODE_OPTIONS` irrelevant on Node 12) | 104 `*.spec.ts` (Karma/Jasmine, mostly generated "should create" specs) + Protractor e2e scaffold; not part of any pipeline |
| Laravel | none (no asset build needed for the API) | `php artisan serve` | none — `phpunit.xml` exists but there is no `tests/` folder |

## 4. Reference instances used for the baseline

| Instance | Port | Database | Purpose |
|---|---|---|---|
| Laravel (user's working copy) | 8000 | `neat_portal` | User's own dev use. **Not** used for automated tests. |
| Laravel reference | 8001 | `neat_portal_test` | Golden responses for contract tests. Started with a process-level `DB_DATABASE` override; the Laravel `.env` was not edited. |
| Angular | 4200 | via Laravel :8000 | UI reference |
| Express (new) | 4000 | `neat_portal_test` | Port under test |

`neat_portal_test` was created on 2026-10-23 from `C:\Users\aakas\Downloads\neat_portal.sql` (no `USE`/`CREATE DATABASE` statements in the dump, verified before import). Its structure hash equals `neat_portal`'s (`9fbd3dad…0be6d`).

### Fixture accounts (test DB only)

Passwords of five accounts were set to a random test-only value **in `neat_portal_test` only** (stored in the gitignored `express-backend/.env` as `FIXTURE_PASSWORD`):

| Role | role_id | users.id | Chosen because |
|---|---|---|---|
| Admin | 1 | 1 | only admin |
| Student | 3 | 13 | Active, verified, `student_details.isDetailsSubmitted='Yes'` |
| Company | 4 | 39 | Active, verified, has `company_details` + `product` rows |
| Institute | 5 | 56 | Active, verified, has `institute_details` |
| Learner | 6 | 72 | Active, verified, `learner.isDetailsSubmitted='Yes'` |

## 5. Database baseline (read-only)

| Database | Structure hash | CREATE hash | Data hash | File |
|---|---|---|---|---|
| `neat_portal` | `9fbd3dadd84a6cf898b1f7d1c1c5680a7ad3f52fadd1d0c63150867c90c0be6d` | `d07a9c16492d0bd72b7882e1a405c60ade4ad4401e6dd80852ba943803b5031d` | `f16d92890221bd64209ce5b268fe289fcdce6039596482456f357311f5dff291` | `evidence/schema-baseline-neat_portal-2026-10-23T18-31-53-202Z.json` |
| `neat_portal_test` | identical | identical | (not captured — test data changes by design) | `evidence/schema-baseline-neat_portal_test-2026-10-23T18-31-57-703Z.json` |

Data notes for `neat_portal`:
- Before the baseline, the user-approved admin password reset (2026-10-23) had changed one `users.password` value.
- After the baseline, one verification login against the user's Laravel instance (:8000) refreshed `users.unique_uuid`/`last_login` of the admin and inserted `api_tokens` / `user_activity` / `sessions` rows. This is normal application behaviour, not migration activity. From then on, no migration tooling writes to `neat_portal`.
- Consequence: the Gate C **data** comparison excludes auth-churn tables/columns (`api_tokens`, `sessions`, `user_activity`, `users.unique_uuid`, `users.last_login`, `users.updated_at`) and any change the user makes through their own app use. The **structure** comparison is exact.

Row counts at baseline (largest tables): `user_activity` 318,831 · `users` 163,602 · `sms_details` 162,024 · `student_details` 139,642 · `product_purchased_audit` 63,216 · `learner` 22,579 · `institute` 10,917 · `password_resets` 8,919. Full list in the evidence file.

## 6. Behavioural baseline captured so far

| Area | Captured | How |
|---|---|---|
| Login / logout contract (all branches) | yes | `express-backend/tests/contract/auth.contract.test.js` runs every case against Laravel :8001 |
| JWT structure | yes | header `{"typ":"JWT","alg":"HS256"}`; claims `iss, iat, exp, nbf, jti, sub, prv, user_id, email, email_verified_at, uuid, role_id, application_number, username, [permanent_institute_id], phone`; `exp-iat = 3600`; `iss` = request URL of `/api/login`; `prv = sha1("Neat\User")`; `jti` = 40-char `api_tokens.id` |
| Error formats | yes | 404 `{"message":""}`; 422 `{"message":"The given data was invalid.","errors":{…}}`; `auth` middleware 401 = plain text `Unauthorized.` (text/html); throttle headers `X-RateLimit-Limit: 60` |
| Remaining endpoints | in progress | golden JSON recorded per batch (see MIGRATION_TRACKER) |
| UI screenshots | pending | Playwright reference run planned before frontend batches |

## 7. High-risk modules

1. **Authentication/JWT** — shared tokens between old and new backends during overlap (verified compatible).
2. **Free-seat allocation engine** (`app/Repositories/Product/ProductRepository.php`) — quota maths, bulk updates, emails.
3. **Payments** — redirect to company payment links, unsigned success callback.
4. **Uploads** — unauthenticated, client-controlled extension.
5. **Evaluation/grading** — code references 14 tables absent from the database (R-01).
6. **Bulk Excel imports** (institute student uploads).
