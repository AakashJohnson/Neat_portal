# Deviations register

Every place where the migrated system **intentionally** behaves differently from the original Laravel/Angular system. The default rule is exact parity. A deviation exists only to avoid reproducing a security vulnerability (spec: "Do not reproduce known security vulnerabilities"), or because the new platform cannot express the original behaviour.

Each entry is referenced in code by its ID. Status:
- **PROPOSED** — awaits owner approval.
- **APPROVED** — confirmed by the owner.

Original *functional* defects that are reproduced as-is are not deviations. They are tracked in `INITIAL_RISK_REGISTER.md` (R-xx).

## Requested flow repairs (2026-10-25)

The owner requested working registration, login and B2B enquiry, including complete SQL persistence. These corrections intentionally supersede strict parity with broken original behaviour. They do not alter database structure.

| ID | Correction | Evidence |
|---|---|---|
| FIX-FLOWS-01 | Registration writes account, application number, verification token and Student/Learner profile in one transaction. Required role fields and SQL lengths are validated. New application numbers remain ten-digit strings but are randomly generated, not second-resolution timestamps; existing nominated student numbers are preserved. Duplicate/profile conflicts return 409 with no partial new account. Institute-ID checks are serialized per role. | `express-backend/tests/contract/registration-enquiry.regression.test.js` |
| FIX-FLOWS-02 | Registration returns `email_delivery` (`sent`, `captured`, `failed`, `not_required`) alongside `requires_email_confirmation`. A saved account is not reported as a delivered email. Resend now uses the existing verification-token column. Both verification routes reject missing, invalid, reused or banned-account tokens; the custom route returns 422 rather than a success-shaped 200. | Same regression suite; mail failure and verification tests |
| FIX-FLOWS-03 | API login issues one token only after successful authentication, not two; banned/unconfirmed attempts issue none. Next.js decodes base64url/UTF-8 correctly, reports API/network errors and accepts numeric or string role identifiers for navigation. | Backend suite; `nextjs-frontend/tests/registration-enquiry.mjs` |
| FIX-FLOWS-04 | B2B input is validated before SQL. Company/product fields are resolved from the product, not a hidden client-supplied company ID. Success includes `enquiry_no` and `email_delivery`; mail failure does not undo an already saved enquiry or invite a duplicate submission. | Backend suite; browser-to-SQL test |
| FIX-FLOWS-05 | Role switches clear hidden-field validators; forms display failures and disable in-flight submissions. The registration AISHE field was previously discarded by both backends and has no users-table column: it is now explicitly collected only by the existing institute profile form (`institute_details.institute_aishe_code`), rather than silently discarded at registration. | Browser role-transition tests; existing institute profile mapping |

Historical Angular parity scripts for registration, email verification, login and B2B enquiry are not acceptance criteria for these corrected failure behaviours. Use the targeted flow regression suites.

## Role acceptance corrections (FIX-ACCEPTANCE, 2026-10-25)

The requested browser-to-SQL acceptance pass exposed additional defects. These corrections supersede the affected historical parity assertions without changing the SQL schema:

| Area | Correction |
|---|---|
| Student profile | A legacy HTTP 200 `{message: "Error"}` response is now displayed as failure, not a success toast followed by closing the form. Pending submissions are disabled. |
| Learner profile | Success is shown only after SQL save succeeds. Failed saves retain entered values and display the API error. Saved profiles display correctly after reload; Edit keeps the existing data. A historical account with no `learner` row now creates that row transactionally on a valid profile save instead of reporting success after updating zero rows. Profession and positive integer age are validated. |
| Institute profile | A new account returns a normal incomplete-profile response instead of `Undefined offset: 0`. The submitted institute contact email is stored rather than silently replaced by the login email. Reads/updates use the authenticated application number. Opening Edit no longer deletes the saved row; fields are prefilled and saves update that row transactionally. |
| Institute nomination upload | The downloadable template uses `Father's Name` (curly apostrophe) and has no `Application Number` or `Courses` columns. The API now accepts those exact template headers as well as the older father-name alias. It preserves marks, AICTE code and all three preferences; uses the authenticated institute's saved/master name and permanent ID; reuses an existing Student account's application number or generates a ten-digit number when absent. Every row is validated (including age 18-30, program/category, marks and duplicates) and the entire batch rolls back on failure. An active Institute account is required. |
| Upload UI/list | A new workbook replaces, rather than accumulates with, the previous selection. Empty/unreadable files and API failures have visible messages; upload stays disabled while reading/submitting. The students list fetches the authenticated institute's students directly, avoiding the incorrect array/object profile lookup. |
| Paid/free course lists | `getPurchasedProducts`, `getFreeProducts` and `getAppliedProducts` now receive the BFF session token required by the already-hardened backend. Without it, approved purchases existed in SQL but the student/learner screens remained empty. List failures are now visible. |

Evidence: `profile-persistence.regression.test.js`, `registration-enquiry.mjs` with `profile-acceptance.mjs`, and the expanded `recovered-flows.mjs`. Profile and free-template comparisons that required reproducing the old defects were replaced with these independent assertions; the paid-upload legacy comparison remains unchanged.

This pass covers the documented core journeys, not every company product-editor field, admin report, legacy panel action or external integration.

## Recovered API contracts (FIX-RECOVERED, 2026-10-25 follow-up)

The 16 routes formerly served by `unresolved.routes.js` no longer return placeholder 500 responses. The original routed controller methods were absent; therefore these are documented recovery contracts, **not claims of exact Laravel parity**. Inputs and outputs follow actual frontend consumers where present. The quota/allocation, cart and payment implementations were recovered from the original repository or commented implementations. Unused legacy endpoint shapes are defined explicitly below.

All routes require a current, active account. Company actions enforce product ownership; administrator actions require role 1. Buyer identity comes from the authenticated account, not a submitted application number. These checks do not switch off under `LEGACY_PUBLIC_ENDPOINTS`.

| Endpoint(s) | Contract and persistence |
|---|---|
| `POST getCounts`, `GET product-list` | Company/admin product summaries. Counts include successful paid/free quantities. `getCounts` returns `products`, `free_students`, `paid_students`; `product-list` returns `products: [[name, freeSeats, paidSeats], ...]`, matching the existing company screen. |
| `POST getProductFlags` | `{code}` returns `flags` with code, approval/submission state and existing upload flags for an owned product. |
| `GET getStudentTransactionIds` | Company/admin pending paid transactions with non-null transaction IDs; returns `students` as expected by the verification screen. |
| `POST submitTransactionId` | Buyer `{code, transaction_id}` updates only their existing unpaid paid-course application to `Payment Pending`. Already approved purchases cannot be overwritten. |
| `POST assignPaidCourse` | Owning company/admin `{application_number, code, status: Approved|Rejected}` explicitly reviews a submitted transaction. Maps to `Payment Successful`/`Payment Failed`, records `approved_by`, locks the row and makes repeated identical decisions idempotent. This is **manual company verification**, not gateway-signature validation. |
| `POST addToCart`, `POST displayCart` | Buyer `{product_id}` adds/reactivates an available product using the existing unique cart key. Repeated adds do not duplicate rows. Cart reads are restricted to the current buyer. |
| `POST displayPaidProducts` | Returns the buyer's successfully paid products. |
| `POST paymentRedirect` | `{product_id|code, quantity}` shares the existing checkout logic; quantity defaults to 1 and must be a positive integer. Returns `payment_url` as well as `redirect_url`. Client-supplied fee/query data is not trusted. Restarting unpaid checkout now persists its updated quantity. No gateway call is made by this endpoint. |
| `GET getStudentEligibility` | Student's nomination status, `isEligibleFreeCourse` and own allocation summaries, without verification secrets. |
| `POST applyForFreeCourse` | Nominated student `{code}` creates one `Free`/`Applied` audit row, without reserving stock or granting a seat. Repeated pending applications are idempotent. |
| `POST assignFreeCourse` | Admin `{application_number, code?}` allocates a nominated student from current product stock. Omitted code is accepted only for exactly one pending free application. No guessing between multiple applications. |
| `POST allocateseat` | Admin `{course_id}` uses **database** stock and streams, not client copies. Original category quotas are retained (OBC 27%, SC 15%, ST 7.5%, remainder General); percentages are ranked numerically with the original gender/birthdate/name tie ordering and stable ID fallback. |
| `GET allocated-seat` | Admin paginated allocation summaries (`page`, `per_page`, max 100) excluding verification secrets. |
| `POST sendFreeAllocationMail` | Student's own allocation, or admin-selected `{application_number, code}`, is mailed to the nominated student's stored address. Missing allocation is 404; failed/captured-only delivery is 503, not a false success. |

Allocation locks product stock and nominated students, writes allocation/eligibility/audit state atomically, and updates available/registered seat counts in the same transaction. A student cannot receive a second active allocation. Missing free-seat codes cause rollback. Emails happen **after commit**; aggregate `email_delivery` reports sent/captured/failed counts separately from allocated seats. No new expiry or quota-redistribution policy was invented.

The company approval screen now refreshes after a decision and displays failures. The admin allocation screen confirms the action, disables duplicate submissions/exhausted stock and reports notification failures. The older browser clients' supplied fields remain accepted, but authority and current stock come from SQL.

Evidence: `express-backend/tests/contract/recovered.contract.test.js` (all 16 routes plus persistence, role/ownership checks, stock concurrency, rollback, numerical ranking and idempotency); `nextjs-frontend/tests/recovered-flows.mjs` (buyer BFF, company and admin browser-to-SQL flows).

### SMTP correction

SendGrid's required `apikey` username is enforced for `smtp.sendgrid.net`, with a warning for the old incompatible configuration. The API key itself was not changed or logged. SMTP authentication and a single non-sensitive technical email submission were verified; other SMTP providers retain their configured usernames. The transport now has bounded connection/greeting/socket timeouts.

## Backend (Express)

| ID | Original behaviour | Migrated behaviour | Reason | Evidence | Status |
|---|---|---|---|---|---|
| DEV-01 | SQL exception messages (incl. query text and data such as application numbers) returned in response bodies | Generic `DB_ERROR_REASON` text; details only in the redacted server log | Information disclosure | `src/services/legacyErrors.js`; contract tests | PROPOSED |
| DEV-02 | `StartSession` wrote a `sessions` row on every API request | Stateless API, no session rows | Not a business feature; avoids DB growth | R-20; account/stock contract tests | PROPOSED |
| DEV-03 | Mail transport errors `print_r`'d into the response body (corrupting the JSON) | Clean JSON body; error logged | Information disclosure / broken responses | verification service | PROPOSED |
| DEV-04 | Patched vendor exception handler appended " Line: N" (file/line) to error messages | Same message without the source-location suffix | Information disclosure | `src/middleware` error handler; contract tests | PROPOSED |
| DEV-05 | `users` rows serialised with secret columns (password hash, tokens, …) where `$hidden` did not cover them | Secret columns never leave the API | Credential exposure | `src/repositories/userRepository.js` (`SECRET_USER_COLUMNS`) | PROPOSED |
| DEV-06 | Errors `echo`'d / `print_r`'d before the JSON body | Clean JSON body; error logged | Information disclosure / broken responses | course/company services | PROPOSED |
| DEV-08 | Admin endpoints only checked that *a* user was logged in | Admin role (1) required | Broken access control | `src/services/auth/permissions.js`; security tests | PROPOSED |
| DEV-09 | Any logged-in user could edit any company's product | Only the owning company (or admin) | Broken access control (IDOR) | companyService; `company.contract.test.js` | PROPOSED |
| DEV-10 | Uploads trusted the client file extension (PHP upload → RCE), path traversal in file names | Server-side type sniffing, safe names, fixed directories | Remote code execution / traversal | `src/integrations/storage.js`; security tests | PROPOSED |
| DEV-11 | Session ids from MySQL `UUID()` (time-based v1, partly predictable) | Random v4 ids | Predictable identifiers | authService | PROPOSED |
| DEV-12 | Password-reset tokens never expired | Tokens older than 60 minutes rejected | Account takeover window | accountService; `account.contract.test.js` | PROPOSED |
| DEV-14 | Banning a user did not revoke their tokens | Ban revokes tokens | Banned users kept access | stockService; stock contract tests | PROPOSED |
| DEV-15 | Web company-profile endpoints public | Admin-only | Broken access control | `src/routes/company*.js` | PROPOSED |
| DEV-16 | SQL built by string concatenation in company-profile lookups | Parameterised queries | SQL injection | companyService | PROPOSED |
| DEV-17 | Panel e-mail verification links were Laravel signed routes (`URL::temporarySignedRoute`, HMAC with `APP_KEY`, 60 min) | Same URL shape (`/panel/email/verify/{id}/{sha1(email)}?expires&signature`, 60 min), HMAC with a key derived from `JWT_SECRET`; links issued by one backend are not accepted by the other during the overlap | Express has no `APP_KEY`; keeps the signature secret server-side | `src/services/panel/webAuth.js` | PROPOSED |

Security-hardening flags that keep the vulnerable original behaviour available only for contract comparison (`LEGACY_PUBLIC_ENDPOINTS`, default **off**): SEC-IDOR-01/02/03, SEC-UPLOAD-01. See `SECURITY_REVIEW.md` once written.

## Frontend (Next.js)

| ID | Original behaviour | Migrated behaviour | Reason | Evidence | Status |
|---|---|---|---|---|---|
| DEV-F01 | Footer links for logged-out visitors opened a `#Login` modal that does not exist (click did nothing) | Logged-out visitors are sent to `/login` | The original target is missing; a dead link is not a feature | `src/components/layout/Footer.jsx` | PROPOSED |
| DEV-F02 | Category links `href="javascript:void(0)"` with a click handler | `href="#"` with `preventDefault()` and the same handler | React 19 blocks `javascript:` URLs; the click behaviour is identical, only the hover URL differs | `src/components/course/ProductListing.jsx`; `tests/parity/listing-behaviour.mjs` | PROPOSED |
| DEV-F03 | JWT kept in `localStorage` (readable by any script on the page) and sent as `?token=` | JWT in an httpOnly cookie, added by the BFF; `?token=` is still sent to the API for exactly the 64 endpoints the Angular services used (`null` when logged out) | Token theft via XSS | `src/app/bff/[...path]/route.js`, `src/lib/tokenEndpoints.js`; `tests/parity/form-behaviour.mjs` | PROPOSED |
| DEV-F04 | `[innerHTML]` sanitised by Angular's sanitizer only | Angular's sanitizer (exact port), then DOMPurify as defense in depth (configured so that it does not change Angular-sanitised output) | Defense in depth | `src/lib/ngSanitize.js`, `src/lib/format.js`; `tests/parity/sanitizer-oracle.mjs` (10/10 identical) | PROPOSED |
| DEV-F05 | A failing route guard (`AfterLoginService`/`BeforeLoginService`) cancelled the navigation. On a direct page load the app was left on an empty page at `/` | Login-required pages redirect to `/login`; guest-only pages redirect a logged-in user to `/` (home rendered) | An empty page is not a feature; the redirect gives the user a way forward | `src/proxy.js`; Angular behaviour observed via `.scratch/whatpage.mjs` (`/student`, `/admin` … → `/`, no component) | PROPOSED |
| DEV-F06 | `/request-password-reset` failed to render (NullInjectorError, R-35) leaving an empty page at `/` | Redirect to `/` with the home page rendered | A broken route has no behaviour worth reproducing | `src/app/request-password-reset/page.js`; `tests/parity/verify-behaviour.mjs` | PROPOSED |
| DEV-F07 | HttpErrorResponse messages shown in toasts contain the request URL including `?token=<JWT>` ("Http failure response for …?token=eyJ…: 500 …") | Same text with the token shown as `token=…` | Never display the session token in the UI | `src/lib/api.js` (`httpErrorResponse`) | PROPOSED |
| DEV-F08 | The company product form's rich-text fields use @kolkov/angular-editor 1.1.2 (contenteditable + `document.execCommand`) | Same `<angular-editor>` DOM, toolbar, styles and form behaviour on a **TipTap 3.32** engine with a schema for the legacy markup (b/i/u/strike/sub/sup, `<font face size color>`, spans with class/lang/dir/role, inline-only div/li/blockquote/td, tables, headings, pre). Fields that are not edited are submitted unchanged; an edited field is re-serialised by TipTap (new paragraphs/lists use `<p>`, attributes outside the schema are dropped) and then sanitised as before | Replacement required by the migration plan (no Angular editor in React); execCommand is deprecated | `src/components/editor/*`, `scripts/extract-angular-editor-css.mjs` | PROPOSED |
| DEV-F09 | jsvalidation also ran the `unique:users,email` / `unique:users,username` / `exists:users,email` rules remotely while typing | Those rules run on submit only (server 422 with the same messages); the local rules (required, email, min, regex, confirmed, same, date, numeric, boolean) run client-side as before | No remote-validation endpoint in the new API; avoids an account-enumeration oracle | `src/lib/jsValidation.js` | PROPOSED |
| DEV-F10 | Announcement `parsed_body` echoed unescaped (R-43) | Same markdown HTML, sanitised with DOMPurify before rendering | Stored XSS | `src/components/panel/AnnouncementCard.jsx` | PROPOSED |
| DEV-F11 | Register success flash lost on the redirect to `/` (R-44) | Message shown on the login form | A success message that is never shown is not a feature | `src/app/(panel)/panel/(auth)/register/page.js`, `login/page.js` | PROPOSED |
| DEV-F12 | Social buttons redirected to the provider via Socialite (no keys configured) | Same buttons; `/panel/auth/{provider}/login` returns to the login form with "Social authentication is not configured." | Provider keys unavailable (R-45, BLOCKED) | `src/components/panel/SocialButtons.jsx`, `src/app/(panel)/panel/auth/[provider]/login/page.js` | PROPOSED |
| DEV-F13 | `create-company-profile` and `product` were public pages | Same pages, behind the panel login; the endpoints need `users.manage` (DEV-15/16) | Unauthenticated writes to users/products | `src/app/(panel)/panel/(standalone)/*` | PROPOSED |
| DEV-F14 | The Blade panel was served at the root of the Laravel host (`/login`, `/users`, `/settings`, …) | Served by Next.js under `/panel/*` (`/panel/login`, `/panel/users`, …); the site keeps its own paths. A redirect from the old host paths is a deployment task | One frontend for both the portal and the panel | `src/app/(panel)`; DEPLOYMENT.md | PROPOSED |
