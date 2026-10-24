# ROLLBACK_PLAN

How to return to Laravel/Angular after a cut-over. Rollback is a routing change because both stacks use the same database (unchanged schema), the same JWT secret, the same files and the same settings file.

## 1. Triggers

Roll back when any of these happens after the switch and cannot be fixed forward within the agreed window:

- sustained 5xx rate above the pre-switch baseline;
- login, registration, payment callback or file upload failing for real users;
- data written in a shape the original cannot read (none are expected: the port writes the same columns and formats; see the contract suites);
- the schema baseline hash differs from the pre-switch value (must never happen; check what changed it before anything else).

## 2. Procedure

1. **Switch routing back:** `/api` → Laravel, the site → Angular build, old panel paths → Laravel. Next.js and Express stay deployed but receive no traffic.
2. **Sessions:** API tokens issued by Express stay valid on Laravel (same secret, same `api_tokens` rows), so portal users stay logged in through the API. Browser sessions do not carry over in either direction: Next.js keeps the token in its own cookie, Angular in `localStorage`, so users log in once. Panel users log in again on the Blade panel.
3. **Data written during the new-stack period:** no conversion needed. Express writes the same tables and columns as Laravel, including `api_tokens`, `users.unique_uuid`, `user_activity`, `product_purchased_audit`, and files under the shared `public/`.
4. **Settings:** `storage/settings.json` is shared, so changes made in the new panel stay in effect after rollback.
5. **Verify:** health of Laravel, a login per role, a catalog page, an upload, a payment callback on a test purchase (test DB or staging only), the panel login.
6. **Schema check:** run `npm run schema:baseline` and compare with the pre-switch JSON.

## 3. Differences users may notice after a rollback

| Area | Effect |
|---|---|
| Hardening | Original vulnerabilities return (public uploads, unrestricted admin endpoints, …); see `DEVIATIONS.md` |
| Password reset tokens | Tokens created by Express (`DEV-12`, 60-minute expiry) are still accepted by Laravel, which ignores expiry |
| Panel e-mail verification links | Links issued by Express (DEV-17) do not validate on Laravel; users request a new link |
| Announcement fan-out | A fan-out in progress on Express stops with the Express process |

## 4. Ownership during an overlap

If both stacks receive traffic at the same time (for example, the mobile app on Laravel and the site on Express), there are no locking conflicts beyond what the original already has: both use the same row-level writes, and there is no cache or queue to coordinate. Two exceptions:

- `storage/settings.json` is read and written as a whole file by both. Make panel settings changes on one stack only.
- Login rotates `users.unique_uuid` on either stack (R-11). This has no effect on token validity, because `verifyUser` never rejects (R-04).

## 5. Point of no return

There is none on the data side: the schema never changes and the written data is format-compatible. Rollback stays possible for as long as the old stack is kept deployed and its configuration (database credentials, JWT secret, file paths) is kept in step.
