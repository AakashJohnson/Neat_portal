# INTEGRATIONS_INVENTORY

External systems the NEAT portal talks to, with the configuration each needs. No credential values appear in this document. Every key is listed in `express-backend/.env.example` with an empty or placeholder value.

| ID | Integration | Direction / protocol | Original | Port | Config keys | Status |
|---|---|---|---|---|---|---|
| INT-01 | **SMTP mail** (10 Mailables + announcement mails + panel verification/sign-up mails) | outbound SMTP | Laravel mail, `MAIL_MAILER` (R-15: Laravel 6 reads `MAIL_DRIVER`) | Nodemailer (`integrations/mail/mailer.js`); templates ported to `integrations/mail/templates/*` and the Laravel markdown theme (`markdownMail.js`) | `MAIL_TRANSPORT`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | IMPLEMENTED; dev/test use `MAIL_TRANSPORT=json` (no delivery) |
| INT-02 | **MySQL `neat_portal`** | SQL | PDO (`DB_*`) | Knex + mysql2 (`database/knex.js`), `dateStrings`, big numbers as strings | `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_PREFIX`, `DB_POOL_MAX` | TESTED (contract suites on `neat_portal_test`) |
| INT-03 | **Phase-2 EoI databases** `neatphase2eoi`, `neatphase2` (same MySQL server) | cross-database SQL | raw SQL with concatenated input (SQL injection) | parameterised raw SQL; schema names validated (`panelService`) | `EOI_DB_SCHEMA`, `EOI_REGISTRY_DB_SCHEMA` | IMPLEMENTED; the local test server has no Phase-2 schemas, so these lookups return 500 there (as Laravel does on the same server) |
| INT-04 | **NEAT EoI document API** (`saveDocument`) | outbound HTTPS multipart | Guzzle, `http_errors=false`, 60 s timeout, 40 s connect timeout | `integrations/eoiApi.js` (fetch + FormData, same timeouts and fields) | `EOI_API_URL` | IMPLEMENTED (not called by tests; MoU uploads in tests do not reach it) |
| INT-05 | **Company payment gateways** | browser redirect out to `payment_link`; result back through the browser to `/neatstudentresponse.php` → `POST /api/paymentSuccess` | no server-to-server confirmation | same flow (the Next.js route `/neatstudentresponse.php` is the payment-verification page, `app/(site)/neatstudentresponse.php/page.js`) | none (links are stored per product) | IMPLEMENTED; SEC-PAY-01 open (owner decision) |
| INT-06 | **Gravatar** | browser image URLs | `present()->avatar` | `md5` of the e-mail → `https://www.gravatar.com/avatar/…` (`lib/md5.js`, `userForms.jsx`) | none | IMPLEMENTED |
| INT-07 | **Google Analytics / Tag Manager, Twitter widgets, Facebook SDK, Google Fonts** | browser scripts | `src/index.html` | `next/script` and `<link>` in the site root layout | none | IMPLEMENTED |
| INT-08 | **YouTube / Vimeo embeds** | browser iframes | product details pages | same embeds | none | IMPLEMENTED |
| INT-09 | **Social login** (Facebook, Twitter, Google via Socialite) | OAuth 2 redirect | buttons shown on the panel login/register; API `/api/login/social` | buttons kept; the redirect answers "Social authentication is not configured." | provider client id/secret (none in the repository) | BLOCKED (R-45, DEV-F12) |
| INT-10 | **Authy 2FA** | HTTPS API | panel and API 2FA routes | settings card shows the "not configured" alert; 2FA routes not ported | `AUTHY_KEY` | BLOCKED (R-45) |
| INT-11 | **Google reCAPTCHA** (registration) | browser script + server verify | settings toggle; the rule in `RegisterRequest` is commented out | settings card shows the "not configured" alert | `RECAPTCHA_SITEKEY`, `RECAPTCHA_SECRETKEY` | BLOCKED (the original never enforced it) |
| INT-12 | **SMS OTP** (ValueFirst `psms` HTTP API) | outbound HTTP | `Api\sendSms`, called only from `RegistrationController::sendOTPSMS`, which has been commented out since 29 May 2025 ("service not in use"); the credentials were hard-coded | not ported (unreachable) | none | UNREACHABLE (hard-coded credentials recorded in SECURITY_REVIEW) |
| INT-13 | **Shared files** `public/files/*`, `public/upload/users` | filesystem | Laravel `public/` | same directory (`PUBLIC_STORAGE_PATH`), served at the same URLs | `PUBLIC_STORAGE_PATH` | IMPLEMENTED |
| INT-14 | **Settings store** `storage/settings.json` | filesystem (JSON) | akaunting/setting json driver | read on every call; written by the panel settings pages | `SETTINGS_PATH` | IMPLEMENTED |

## Transition notes

- INT-13 and INT-14 are shared files. During an overlap period both backends must point at the same `public/` directory and the same `settings.json`, or uploads and settings will diverge (see ROLLBACK_PLAN).
- INT-02: no DDL is issued by the port. Knex migrations are never configured, and `npm run check:no-ddl` (run in CI) rejects DDL statements in the source (Gate C).
