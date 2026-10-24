# Deviations register

Every place where the migrated system **intentionally** behaves differently from the original Laravel/Angular system. The default rule is exact parity. A deviation exists only to avoid reproducing a security vulnerability (spec: "Do not reproduce known security vulnerabilities"), or because the new platform cannot express the original behaviour.

Each entry is referenced in code by its ID. Status:
- **PROPOSED** — awaits owner approval.
- **APPROVED** — confirmed by the owner.

Original *functional* defects that are reproduced as-is are not deviations. They are tracked in `INITIAL_RISK_REGISTER.md` (R-xx).

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

Security-hardening flags that keep the vulnerable original behaviour available only for contract comparison (`LEGACY_PUBLIC_ENDPOINTS`, default **off**): SEC-IDOR-01/02/03, SEC-UPLOAD-01. See `SECURITY_REVIEW.md` once written.

## Frontend (Next.js)

| ID | Original behaviour | Migrated behaviour | Reason | Evidence | Status |
|---|---|---|---|---|---|
| DEV-F01 | Footer links for logged-out visitors opened a `#Login` modal that does not exist (click did nothing) | Logged-out visitors are sent to `/login` | The original target is missing; a dead link is not a feature | `src/components/layout/Footer.jsx` | PROPOSED |
| DEV-F02 | Category links `href="javascript:void(0)"` with a click handler | `href="#"` with `preventDefault()` and the same handler | React 19 blocks `javascript:` URLs; the click behaviour is identical, only the hover URL differs | `src/components/course/ProductListing.jsx`; `tests/parity/listing-behaviour.mjs` | PROPOSED |
| DEV-F03 | JWT kept in `localStorage` (readable by any script on the page) and sent as `?token=` | JWT in an httpOnly cookie, added by the BFF; `?token=` is still sent to the API for exactly the 64 endpoints the Angular services used (`null` when logged out) | Token theft via XSS | `src/app/bff/[...path]/route.js`, `src/lib/tokenEndpoints.js`; `tests/parity/form-behaviour.mjs` | PROPOSED |
| DEV-F04 | `[innerHTML]` sanitised by Angular's sanitizer only | Angular's sanitizer (exact port), then DOMPurify as defense in depth (configured so that it does not change Angular-sanitised output) | Defense in depth | `src/lib/ngSanitize.js`, `src/lib/format.js`; `tests/parity/sanitizer-oracle.mjs` (10/10 identical) | PROPOSED |
| DEV-F05 | A failing route guard (`AfterLoginService`/`BeforeLoginService`) cancelled the navigation. On a direct page load the app was left on an empty page at `/` | Login-required pages redirect to `/login`; guest-only pages redirect a logged-in user to `/` (home rendered) | An empty page is not a feature; the redirect gives the user a way forward | `src/proxy.js`; Angular behaviour observed via `.scratch/whatpage.mjs` (`/student`, `/admin` … → `/`, no component) | PROPOSED |
