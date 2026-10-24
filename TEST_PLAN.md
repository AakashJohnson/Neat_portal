# TEST_PLAN

How the migration is tested. Results go into `TEST_REPORT.md` with the real command output; nothing is reported as passing without it.

## 1. Environments

| Item | Value |
|---|---|
| Database | `neat_portal_test` on the local MySQL 8 (restored from the production dump with owner approval). `tests/setup.js` refuses to run against any other database. `neat_portal` is read only for schema/checksum comparison |
| Reference backend | Laravel 6 from `D:\Anuvadhini\NEAT portal old\backend\backend`, php74, `DB_DATABASE=neat_portal_test` as a process override (its `.env` is untouched), `:8000`/`:8001` |
| Reference frontend | Angular 8 from `D:\Anuvadhini\NEAT portal old\frontend\frontend`, Node 12, `:4200` |
| System under test | Express `:4000` (`.env` → `neat_portal_test`, `MAIL_TRANSPORT=json`), Next.js dev `:3000` and production build `:3100` |
| Mail | never delivered: `MAIL_TRANSPORT=json` (in-memory outbox) |
| External APIs | the EoI API is stubbed (`EOI_API_URL_TEST`); no payment gateway is called |
| Fixtures | role fixture users (admin, student, company, institute, learner) on the test DB; the password comes from `FIXTURE_PASSWORD` in the untracked `.env` |

## 2. Test levels

| Level | Suite | What it proves | Command |
|---|---|---|---|
| Static gates | `check:no-ts` (both), `check:no-ddl`, `check:imports`, ESLint | Gates A, B, C (code), D (lint) | `npm run check:no-ts`, `npm run check:no-ddl`, `npm run lint` |
| Unit | `express-backend/tests/unit/*` | PHP semantics (loose comparison, `empty()`, number coercion), PHP/Carbon date parsing against a PHP oracle (`fixtures/php-carbon-parse-oracle.jsonl`), throttling | `npx vitest run tests/unit` |
| Contract | `express-backend/tests/contract/*` (14 suites) | Each Laravel API route answers identically in Express (status, body, volatile fields masked), including DB side effects, against the running Laravel on the same test DB | `npm test` |
| Security | `express-backend/tests/security/hardening.test.js` | Hardened behaviour (DEV-xx) is in force with `LEGACY_PUBLIC_ENDPOINTS=false` | `npx vitest run tests/security` |
| Backend parity in the browser | `tests/parity/angular-on-express-proxy.mjs` | The unchanged Angular app works against Express | `node tests/parity/angular-on-express-proxy.mjs` |
| Frontend parity | `nextjs-frontend/tests/parity/*.mjs` (Playwright) | Next.js pages behave like the Angular pages: DOM, requests, navigation, dialogs, storage keys, visual diffs at 375/768/1440 px | `node tests/parity/<suite>.mjs` |
| Oracles | `sanitizer-oracle.mjs`, `xlsx-oracle.mjs` | Angular sanitizer port and SheetJS upgrade give identical output | `node tests/parity/<oracle>.mjs` |
| Panel parity | Playwright comparison of `/panel/*` (Next.js) with the Blade pages (Laravel) | Same markup structure, texts, validation messages, flash messages and API side effects | final test phase |
| Build | `next build` + `next start`, Express start + `/health/ready` | Production build works | `npm run build`, `npm start` |
| Schema | `npm run schema:baseline` on `neat_portal` and `neat_portal_test` | Gate C: identical structure hash before and after | compare with `evidence/schema-baseline-*.json` |

## 3. Areas and acceptance criteria

| Area | Acceptance |
|---|---|
| Auth | Login/logout/register/reset/verify identical to the original; tokens accepted by both backends; httpOnly cookie, no token in page scripts |
| Public catalog | Same lists, filters, search, details, comments, counters, B2B enquiry |
| Student / learner | Same forms, validation, purchases, free-seat code flow |
| Institute | Same profile, student list, Excel upload results (valid and invalid sheets) |
| Company | Same products list, details, verification, product form (TipTap editor: same toolbar and output for untouched fields; R-38/R-39 reproduced) |
| Admin | Same dashboards, registrations, MoU management, product approval, reports (Excel), free-seat pages, company preview |
| Payment | Same redirect URL, success/failure handling, mails (captured, not sent) |
| Panel | Every implemented web route: same page, same validation, same flash text, same DB side effects as the Blade panel |
| Security | Authorisation matrix: every endpoint × role (anonymous, student, company, institute, learner, admin) gives the expected status |
| Database | No DDL; schema hash unchanged |

## 4. Test data safety

- Write tests run only on `neat_portal_test`; destructive suites restore what they change in `finally` blocks (institute suite) or work on rows they create.
- No production URL appears in any test configuration. Mails are captured. Uploads go to a temporary directory.
- Reports contain no credentials or personal data. Fixture e-mails are masked in screenshots where they appear.

## 5. Order of the final test phase

1. Start the reference apps (Angular :4200, Laravel :8000/:8001 on `neat_portal_test`) and the new stack (Express :4000, Next.js :3000 and a fresh production build on :3100).
2. Static gates and unit tests.
3. Contract suites (full), security suite.
4. Parity suites: re-run every earlier suite after the route-group move, then company, admin and panel.
5. Build gate and health checks.
6. Schema comparison (Gate C).
7. Record everything in `TEST_REPORT.md`; update `MIGRATION_TRACKER.md`.
