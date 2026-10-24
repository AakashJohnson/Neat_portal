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
