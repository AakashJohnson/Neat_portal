# TEST_PLAN

How the migration is tested. Results go into `TEST_REPORT.md` with the real command output; nothing is reported as passing without it.

## 1. Environments

| Item | Value |
|---|---|
| Database | `neat_portal_test` on the local MySQL 8 (restored from the production dump with owner approval). `tests/setup.js` refuses to run against any other database. `neat_portal` is read only for schema/checksum comparison |
| Reference backend | Laravel 6 from `D:\Anuvadhini\NEAT portal old\backend\backend`, php74, `DB_DATABASE=neat_portal_test` as a process override (its `.env` is untouched), `:8000`/`:8001` |
| Reference frontend | Angular 8 from `D:\Anuvadhini\NEAT portal old\frontend\frontend`, Node 12, `:4200` |
| System under test | Always override `DB_DATABASE=neat_portal_test` explicitly. The current local Express `.env` targets `neat_portal`, not the test copy. For the targeted repair run use dedicated Express `:4101` and Next.js `:3101`; never run write-based parity scripts against the user's `:4000` service. |
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

## 6. Registration/login/B2B repair validation (2026-10-25)

This is a targeted repair result, **not** the final migration acceptance report.

| Check | Result |
|---|---|
| Isolated SQL regression suite | PASS: 20 tests covering atomic Student/Learner/Institute account creation, role fields, validation, concurrency, generated-number collision retry, duplicate-profile rollback, email failure/capture status, confirmation disabled, verification/replay/banned cases, login token rows, B2B field persistence and invalid seat boundaries. See `express-backend/tests/contract/registration-enquiry.regression.test.js`. |
| Real Chromium -> Next BFF -> Express -> SQL | PASS: all three registration roles after role switches; verification links including `+` email aliases; login destinations; UTF-8/base64url claims; httpOnly cookie; visible server errors; B2B invalid input blocked and all valid fields persisted. Temporary accounts/enquiries were removed. See `nextjs-frontend/tests/registration-enquiry.mjs`. |
| Changed-file ESLint | PASS (backend and frontend) |
| Next production build | PASS, 96 static pages generated |
| No-DDL guard | PASS; no schema changes were made |
| JavaScript-only guards and backend imports | PASS for both apps after removing the isolated Next-generated build; 77/77 backend modules import cleanly |
| Wider selected contracts, follow-up | **57 passed, 54 skipped, 0 failed** across eight files: registration/enquiry, recovered routes, auth, account, verification, profile, course and SMTP unit tests. Auth tests now create/clean up their own fixture accounts; existing passwords were not reset. Reference-dependent skips are not passing parity evidence. |
| Recovered API SQL tests | PASS: 25 tests cover all 16 restored routes, company ownership, current-user carts, checkout quantity persistence, manual transaction review, allocation quotas/ranking, concurrency/rollback, mail failure and pagination. |
| Recovered Chromium flows | PASS: buyer cart/checkout/transaction submission through BFF; company approval and refreshed totals; administrator confirmation, eight-seat allocation, persisted SQL counts and exhausted-stock UI. |
| Actual SMTP submission | PASS: SendGrid authentication succeeded after username correction. One technical message to the configured sender was accepted (1 accepted recipient, 0 rejected). Inbox placement cannot be asserted from SMTP acceptance. |
| Existing/test schema comparison | PASS: both schemas still match the original structure hash `9fbd3dadd84a6cf898b1f7d1c1c5680a7ad3f52fadd1d0c63150867c90c0be6d` and CREATE hash `d07a9c16492d0bd72b7882e1a405c60ade4ad4401e6dd80852ba943803b5031d`: 48 tables, 621 columns, 9 foreign keys. Read-only fingerprints captured 2026-10-25. |
| User's running API | PASS: stale process replaced; current watch-mode API on port 4000 is responsive and serves corrected validation/recovered routes. |

Run backend regression tests in PowerShell from `express-backend`:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:LOG_LEVEL='silent'
npm test -- tests\contract\registration-enquiry.regression.test.js
```

For browser tests, use three **dedicated** terminals. From `express-backend`, start the test API:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:MAIL_TRANSPORT='json'
$env:PORT='4101'
$env:API_BASE_URL='http://localhost:4101/api'
node --watch scripts\start-flow-server.js
```

From `nextjs-frontend`, start the test web server without sharing the user's dev build/lock:

```powershell
$env:NEAT_API_ORIGIN='http://localhost:4101'
$env:NEXT_PUBLIC_FILES_ORIGIN='http://localhost:4101'
$env:NEAT_DIST_DIR='.scratch\next-flow'
npm run dev -- --port 3101
```

From `nextjs-frontend` in the third terminal:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:FLOW_API_ORIGIN='http://localhost:4101'
$env:FLOW_NEXT_ORIGIN='http://localhost:3101'
npm run test:flows
npm run test:recovered
```

Stop only the dedicated test processes afterwards. Remove their `.scratch\next-flow` generated build before running `check:no-ts`; Next's generated declaration files are not application TypeScript source. Do not change the working `.env` database or reset existing fixture passwords just to make a test pass.

The final focused backend command additionally includes:

```powershell
$env:DB_DATABASE='neat_portal_test'
$env:LOG_LEVEL='silent'
$env:LARAVEL_REFERENCE_URL='http://127.0.0.1:59998' # unavailable reference; skips are explicit
npm test -- tests\contract\recovered.contract.test.js tests\contract\registration-enquiry.regression.test.js tests\contract\auth.contract.test.js tests\contract\account.contract.test.js tests\contract\verification.contract.test.js tests\contract\profile.contract.test.js tests\contract\course.contract.test.js tests\unit\mailer.test.js
```

SMTP tests use mocked transports; SQL/browser tests force capture mode. Only the separately documented technical SMTP check contacted the configured provider.

## 7. Core role acceptance pass (2026-10-25 follow-up)

All writes below used disposable fixtures on `neat_portal_test`. This is a **core-journey acceptance pass**, not complete page-by-page migration certification.

| Role/area | Browser and SQL evidence | Result |
|---|---|---|
| Student | Registration/verification/login; all profile fields; reload/edit/save; rejected save stays editable; approved paid products visible; free application and assigned-course listing | PASS |
| Institute | Registration/login; every profile field including a contact email different from login; reload and non-destructive edit; exact downloadable Excel template uploaded; invalid workbook rejected then replaced with a valid one; all 20 template fields mapped/persisted; generated application number and student-list visibility | PASS |
| Learner | Registration/login; profile failure displayed without false success; save/reload/edit; cart/checkout/transaction submission; paid product becomes visible after company approval | PASS |
| Company | Login; pending transaction visible; acceptance persists status/approver; list refresh and correct paid-seat totals | PASS |
| Admin | Login; confirmed bulk allocation of eight seats; SQL allocations/stock counts; exhausted-stock action disabled; manual free application approval through authenticated BFF | PASS |
| Free-seat redemption | Invalid code rejected without changing allocation; valid code through authenticated BFF marks the student's allocation availed | PASS (BFF/SQL; email-link/code-entry navigation not certified) |
| B2B | Empty form does not submit; valid enquiry persists every field and displays acknowledgement | PASS |
| Backend | 11 affected test files: **65 passed, 77 skipped, 0 failed**. Eight new profile/template tests cover missing profiles, complete persistence, non-destructive edits, concurrent saves, invalid inputs, real template headers and batch rollback | PASS; skipped cases need the unavailable Laravel reference |
| Build/static gates | Frontend production build (96 static pages), changed-file ESLint, 80/80 backend imports, no-DDL and JavaScript-only guards | PASS |
| Schema | Repeated read-only fingerprints for both schemas at 09:50 UTC match the original structure and CREATE hashes in section 6 exactly | PASS |

Run both browser suites using the section 6 setup. `scripts/start-flow-server.js` refuses any database other than `neat_portal_test`, forces capture-only mail, and uses the same raised **test-only** rate limit as the contract helper. The expanded rapid browser run exceeded the normal 60 requests/minute limit; production throttling was not changed.

For the expanded backend run, add `tests\contract\profile-persistence.regression.test.js`, `tests\contract\institute.contract.test.js` and `tests\contract\student.contract.test.js` to the eight-file command above. The larger selection explains the increase from 54 to 77 reference-dependent skips; they remain explicitly unverified.

Corrections are documented under `FIX-ACCEPTANCE` in `DEVIATIONS.md`. Remaining acceptance work includes company product creation/editing, full admin/report and panel coverage, legacy cross-runtime comparisons, external integrations and staging deployment. No external mail or payment was sent during this pass.
