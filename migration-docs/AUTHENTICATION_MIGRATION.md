# AUTHENTICATION_MIGRATION

How authentication and authorisation move from Laravel (tymon/jwt-auth + session/Blade) and Angular (token in `localStorage`) to Express + Next.js, and how both systems can run side by side.

## 1. Original system

| Part | Mechanism |
|---|---|
| API identity | tymon/jwt-auth 1.0.0-rc.5, HS256 with `JWT_SECRET`, TTL 60 min, refresh TTL 20160 min. Customised in `app/Services/Auth/Api/*`: the token's `jti` must exist in `api_tokens` (`ExtendsJwtValidation`); custom claims from `User::getJWTCustomClaims()` |
| Token transport | Angular stored the token in `localStorage` and appended `?token=` to 64 endpoints; other API consumers may send `Authorization: Bearer` |
| Login side effects | `users.unique_uuid = UUID()` on every login; two `api_tokens` rows per login (R-14); `last_login`; activity "Logged in." |
| Account state | Banned / Unconfirmed users are refused at API login; the panel login lets Unconfirmed users in and shows the verification notice (`verified` middleware) |
| Panel | Laravel session cookie + CSRF, `auth`, `verified`, `permission:*` middleware, lab404 impersonation |
| Authorisation | `CheckRole` / `CheckPermissions` (role → permissions in `permission_role`); many custom endpoints only call `verifyUser()`, which never rejects (R-04) |
| Passwords | bcrypt `$2y$10$` |

## 2. Migrated system

```
Browser ──cookie neat_token (httpOnly, SameSite=Lax, Secure in prod)──▶ Next.js
   │                                                                     │
   │  /bff/<endpoint>[?token=]  (BFF route handler)                      │ adds ?token=<JWT> and
   │  /api/session, /api/panel/session, /api/panel/impersonate          │ Authorization: Bearer
   ▼                                                                     ▼
 (no token in JS)                                        Express /api/<endpoint>
                                                        jwtService: HS256 + jti row
```

| Part | Port |
|---|---|
| Token format | Identical (`services/auth/jwtService.js`): same header (`{"typ":"JWT","alg":"HS256"}`), claim order, `iss` = issuing URL, `prv` = sha1("Neat\\User"), `jti` row in `api_tokens`. **A Laravel-issued token is accepted by Express and an Express-issued token by Laravel** (auth.contract tests) |
| Token parsing | Same chain as tymon's Laravel provider: `Authorization` header, `?token=`, `token` input field, `token` cookie. External API consumers keep working unchanged |
| Token storage in the browser | **httpOnly cookie** `neat_token`, `maxAge` = `NEAT_JWT_TTL` minutes (DEV-F03). Page scripts never see the JWT; non-secret claims come from `GET /api/session` (without `jti`/`prv`) |
| BFF | `app/bff/[...path]/route.js` forwards to Express. Requests the client marks with a `token` parameter (exactly the endpoints Angular called with `?token=`, `lib/tokenEndpoints.js`) get the cookie's token as `?token=` and `Authorization: Bearer`, or `?token=null` when logged out, as Angular sent from an empty `localStorage` |
| Portal login/logout | `POST /api/session` → Express `/api/login`, sets the cookie; `DELETE` → `/api/logout`, clears it |
| Panel login | `POST /api/panel/session` → Express `/api/panel/login` (web rules: throttling, Unconfirmed allowed); `PUT` adopts a token issued by `/api/panel/password/reset`; `DELETE` logs out |
| Route guards | `src/proxy.js` (Next.js 16 proxy) reproduces `AfterLoginService` / `BeforeLoginService` and the shells' role checks from the effective Angular route table. It verifies the signature when `NEAT_JWT_SECRET` is set (else expiry only). The panel guard (`PanelShell`) redirects to `/panel/login` or `/panel/email/verify`. **Express authorises every call itself**; the frontend guard is only for navigation |
| Panel permissions | `GET /api/panel/context` returns the role's permission names; the sidebar and pages use them, and every `/api/panel/*` and stock endpoint checks them server-side |
| Impersonation | `POST /api/panel/impersonate/{user}` issues a token for the target with an `imp` claim (impersonator id); `/leave` swaps back. Replaces the session-based lab404 package |
| Passwords | `bcryptjs`, cost 10, `$2y$` prefix kept on write, so Laravel can verify hashes written by Express and vice versa. No re-hashing of existing users |
| E-mail verification (panel) | Signed URL `/panel/email/verify/{id}/{sha1(email)}?expires&signature`, 60 min, HMAC key derived from `JWT_SECRET` (DEV-17) |

## 3. Hardening (no reproduced vulnerabilities)

| Original weakness | Port | Reference |
|---|---|---|
| JWT readable by any script (`localStorage`) | httpOnly cookie | DEV-F03 |
| Token shown in error toasts | redacted | DEV-F07 |
| Admin endpoints accepted any logged-in user | admin role required | DEV-08 |
| Any company could edit any product | ownership check | DEV-09 |
| Ban did not revoke tokens | revoked | DEV-14 |
| Public upload/delete/MoU, public company-profile tools | authenticated / admin-only (`LEGACY_PUBLIC_ENDPOINTS=false`) | DEV-10, DEV-15, SEC-UPLOAD-01 |
| Secrets in user payloads | removed | DEV-05 |
| Password reset tokens never expired (custom flow) | 60 min | DEV-12 |
| `verifyUser()` never rejects | **kept** (R-04): changing it would reject tokens the original accepts; the JWT signature and `jti` checks still apply | R-04 |
| Payment callback unsigned | **kept**, owner decision; session ids made unguessable | SEC-PAY-01, DEV-11 |

## 4. Coexistence and cut-over

1. **Shared secret.** Express must use the same `JWT_SECRET` as Laravel, and Next.js uses it as `NEAT_JWT_SECRET`. Tokens then work against either backend, so traffic can move per route or all at once.
2. **Shared tables.** Both backends write `api_tokens`, `users.unique_uuid`, `last_login` and `activity_log` with the same semantics (R-11). A user logged in through one backend stays logged in through the other.
3. **Existing sessions.** Angular users have their token in `localStorage`; after the switch to Next.js they log in once, and the cookie replaces it. No password reset or migration of credentials is needed.
4. **Panel sessions.** Laravel web sessions (`sessions` table) are not carried over; panel users log in once at `/panel/login`.
5. **Rotation.** Rotating `JWT_SECRET` invalidates every token on both backends. Do it only with explicit authorisation, and never during the overlap.

## 5. Evidence

- `express-backend/tests/contract/auth.contract.test.js`: login/logout/refresh against the running Laravel reference on `neat_portal_test`, including cross-acceptance of tokens.
- `express-backend/tests/security/hardening.test.js`: the hardened behaviours above.
- `nextjs-frontend/tests/parity/login-behaviour.mjs`, `form-behaviour.mjs`: the browser never receives the JWT; requests carry `?token=` exactly where Angular did.

Results of the final run are in `TEST_REPORT.md`.
