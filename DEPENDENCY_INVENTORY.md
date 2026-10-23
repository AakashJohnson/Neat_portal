# DEPENDENCY_INVENTORY

## 1. Laravel backend (`backend/backend/composer.json`)

| Package | Version | Used for | Node.js/Express replacement |
|---|---|---|---|
| laravel/framework | ^6.0 (6.0.3 installed) | framework | express 5 |
| tymon/jwt-auth | 1.0.0-rc.5 (+ `app/Services/Auth/Api/*` overrides) | JWT API auth, jti→`api_tokens` | jsonwebtoken + `src/services/auth/jwtService.js` |
| laravel/socialite | ^4.0 | Facebook/Twitter/Google login | provider OAuth via `openid-client`/fetch (BLOCKED until keys exist) |
| akaunting/setting | ^1.0 (json driver → `storage/settings.json`) | app settings | read of the same JSON file |
| lab404/laravel-impersonate | ^1.2 | admin impersonation (web panel) | session-scoped impersonation in Next.js panel |
| league/fractal | ^0.16.0 | API transformers + `DataArraySerializer` | explicit serializer module |
| intervention/image | ^2.3 | avatar resize 160×160 | sharp |
| jenssegers/agent | ^2.5 | user-agent parsing (sessions view) | `ua-parser-js` (when sessions UI is ported) |
| anhskohbo/no-captcha | 3.* | reCAPTCHA (disabled in settings) | fetch to Google siteverify (only if enabled) |
| proengsoft/laravel-jsvalidation | 2.5.* | Blade client validation | n/a (React forms) |
| laravelcollective/html | ^6.0 | Blade forms | n/a |
| webpatser/laravel-countries | dev-master | `countries` table seeding | n/a (table already populated) |
| webpatser/laravel-uuid | ^3.0 | UUIDs | `crypto.randomUUID` / MySQL `UUID()` |
| neatapp/activity-log, neatapp/announcements, neatapp/plugins | ^1.0.0 (vendor zips) | activity log, announcements, dashboard plugins | `activityRepository`, announcements module |
| fideloper/proxy | ~4.0 | trusted proxies | `app.set('trust proxy')` |
| laravel/tinker | ^1.0 | REPL | n/a |
| dev: phpunit 8, faker, mockery, ide-helper, debugbar, ignition, collision | — | dev only | vitest, supertest |

## 2. Angular frontend (`frontend/frontend/package.json`)

| Package | Version | Used for | Next.js replacement |
|---|---|---|---|
| @angular/* | 8.2.14 (cdk/material 7.3.7, CLI 7.3.9) | framework, Material tables/dialogs/etc. | next 15, react 19, MUI |
| bootstrap / jquery / popper.js | 4.4.1 / 3.7.1 (+1.12.1 via angular.json) / 1.16 | layout, theme scripts | Bootstrap 5 CSS, React components (no jQuery) |
| @ngx-translate/core + http-loader | 11 / 4 | en + Hindi (`fr.json`) | next-intl |
| ngx-toastr | 11.2.1 | toasts | sonner |
| ngx-pagination | 5 | (imported, unused) | — |
| @kolkov/angular-editor | 1.1.2 | rich text in company form | TipTap |
| xlsx / file-saver | 0.15.4 / 2.0.2 | Excel import/export | SheetJS `xlsx` / file-saver |
| hammerjs | 2.0.8 | Material gestures | — |
| ngx-twitter-timeline | 0.1.5 | (installed, unused) | Twitter widgets via `next/script` |
| core-js, zone.js, tslib, rxjs | — | runtime | — |

Scripts loaded globally by `angular.json`: modernizr, jquery-1.12.1, popper, bootstrap, ajax-mail, plugins, styleswitch, main, custom-js, `assets/js/modal.js`, `assets_new/js/custom.js`, jquery 3.7.1. Styles: `styles_old.css`, theme color-switcher, font-awesome, material-design-iconic-font, bootstrap, plugins, color, responsive, owl.theme.default, `styles.css`, toastr, owl.carousel.

## 3. External services

| Service | Where | Credentials | Notes |
|---|---|---|---|
| SMTP mail | `config/mail.php`, 10 Mailables | `.env` MAIL_* | `.env` uses `MAIL_MAILER` while Laravel 6 reads `MAIL_DRIVER` → default `smtp` applies |
| ValueFirst SMS (XML over HTTP) | `app/Http/Controllers/Api/sendSms.php` | **hard-coded in source** | currently unused (OTP sending commented out May 2025) |
| Company payment links | `CourseController::applyForPaidCourse`, table `product_payment_gateway_url` | none | redirect only; callback `paymentSuccess` unsigned |
| NEAT EoI API | `Api/FileController.php:122` → `https://neatphase2eoiapi.aicte-india.org/api/saveDocument` | none seen | outbound POST |
| Cross-database reads | `Web/CompanyCreateProfile.php` → `neatphase2eoi.*`, `neatphase2.neat_eoi` | same DB server | schemas absent locally |
| Authy 2FA | `app/Services/Auth/TwoFactor/Authy.php` | `services.authy.key` (unset) | 2FA disabled in settings |
| Socialite (FB/Twitter/Google) | `config/services.php` | unset | not configured |
| Google Analytics UA-162699883-1, Twitter widgets, Facebook page plugin, YouTube, Google Maps iframe | `src/index.html`, page templates | public | frontend only |
| upGrad | free-seat flow redirect | none | outbound link |

## 4. Target runtime (new code)

| Component | Version | Location |
|---|---|---|
| Node.js | 24.15 locally (engines `>=22`) | system |
| express | 5.x | `express-backend/package.json` |
| knex + mysql2 | 3.x / 3.x | data access, no migrations |
| jsonwebtoken, bcryptjs | 9.x, 3.x | auth |
| zod, helmet, cors, express-rate-limit, pino, multer, nodemailer, sharp, date-fns(-tz), decimal.js | current | see package.json |
| vitest, supertest, eslint | 5.x, 7.x, 10.x | tests/lint |
| next, react | 15.x, 19.x | `nextjs-frontend` (Phase 6) |

## 5. Local tooling installed for the migration

| Tool | Path | Why |
|---|---|---|
| PHP 7.4.33 (portable, NTS) | `%USERPROFILE%\tools\php74` | run the Laravel reference (Laravel 6 fails on PHP 8) |
| Node 12.22.12 (portable) | `%USERPROFILE%\tools\node-v12.22.12-win-x64` | run the Angular reference |

Neither changes system PATH, WAMP or the system Node install.
