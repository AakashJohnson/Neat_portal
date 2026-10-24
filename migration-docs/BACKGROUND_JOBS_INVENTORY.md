# BACKGROUND_JOBS_INVENTORY

Everything in the original system that runs outside the request/response cycle (queues, scheduler, event listeners, long-running loops), and how the port handles it.

## Summary

The original system has **no background workers in practice**:

- **Queue:** `config/queue.php` defaults to `QUEUE_CONNECTION`, but `.env` sets the Laravel 5 key `QUEUE_DRIVER` (R-15), so the connection is `sync`. The two `ShouldQueue` mailables therefore run inside the request.
- **Scheduler:** `app/Console/Kernel.php::schedule()` is empty (only the commented `inspire` example). `app/Console/Commands` has no application commands. No cron entry is referenced anywhere in the repository.
- **Broadcasting:** not used (no events implement `ShouldBroadcast`).

The port therefore runs no worker process and no scheduler. Work that the original did synchronously stays synchronous, with one exception: the announcement e-mail fan-out (see J-06).

## Inventory

| ID | Job / listener | Trigger | Original execution | Port | Status |
|---|---|---|---|---|---|
| J-01 | `UserRegistered` mail (`ShouldQueue`) | API registration | sync (queue misconfigured) | sync in `accountService.register`; a mail failure is logged, the request still succeeds | KEPT |
| J-02 | `ResetPassword` mail (`ShouldQueue`) | `/api/password/remind`, panel forgot password, mobile forgot password | sync | sync in `accountService` / `webAuth` | KEPT |
| J-03 | `SendEmailVerificationNotification` + `SendSignUpNotification` listeners | `Registered` event (panel registration only) | sync | `webAuth.register`: verification mail when `reg_email_confirmation`, admin notification when `notifications_signup_email` | KEPT |
| J-04 | `UpdateLastLoginTimestamp` listener | `LoggedIn` | sync | `userRepository.touchLastLogin` + activity "Logged in." | KEPT |
| J-05 | `InvalidateSessionsAndTokens` listener | `Banned` | never fired (status compared after the update) | tokens and sessions revoked on ban | CHANGED (DEV-14) |
| J-06 | Announcement e-mail to every user (`email_notification`, `SendEmailNotification` listener, not queued) | `EmailNotificationRequested` on announcement create | sync `User::chunk(200)` loop inside the request (with ~160k users the request times out) | `setImmediate` after the response, chunks of 200 recipients, errors logged | CHANGED (performance; same recipients and content) |
| J-07 | `ActivateUser` listener | `Verified` | sync | `webAuth.verifyEmail` | KEPT |
| J-08 | Activity log subscriber (`UserActivity` plugin) | user/role/permission/settings/announcement events | sync | `repositories/activityRepository.js`, called by each service with the original texts | KEPT |
| J-09 | `FreeSeatAllocation` mails with `sleep(2)` between recipients | free-seat allocation engine | unreachable (R-03: `ProductController@allocateseat` missing) | not ported (route answers the same 500) | UNRESOLVED |
| J-10 | MoU forward to the NEAT EoI API | `uploadFile` with `inputField = mouFile` | sync Guzzle call (60 s timeout) | sync `fetch` with the same timeouts (`integrations/eoiApi.js`) | KEPT |
| J-11 | `StartSession` `sessions` row on every API request | every request | sync | not reproduced (stateless API) | CHANGED (DEV-02) |

## Operational notes

- **J-06** runs inside the Express process. If the process stops in the middle of a fan-out, the remaining recipients are not mailed. The original lost the whole request in that case, so nothing that used to be guaranteed is lost. If guaranteed delivery is wanted later, the chunk loop can move to a queue (BullMQ/Redis) without changing the API.
- Mail in development and tests uses `MAIL_TRANSPORT=json`, which keeps an in-memory outbox capped at 1000 messages, so no real e-mail is sent (R-17).
- Graceful shutdown: `server.js` stops accepting connections and exits after 10 s at the latest. The only in-flight background work is J-06.
