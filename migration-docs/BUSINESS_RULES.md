# BUSINESS_RULES

The business rules of the NEAT portal as implemented in the original system, and where each one lives in the port. The rules were read from the Laravel controllers/repositories and the Angular components; the Express code names the original method above each port.

Statuses: **KEPT** = same behaviour (contract/parity-tested where the column says so) · **CHANGED** = intentional deviation (see `DEVIATIONS.md`) · **BROKEN IN ORIGINAL** = reproduced defect (see `INITIAL_RISK_REGISTER.md`).

## 1. Roles and accounts

| ID | Rule | Original | Port | Status |
|---|---|---|---|---|
| BR-01 | Role ids: 1 Admin, 2 User (panel default), 3 Student, 4 Company, 5 Institute, 6 Learner. The Angular app picks the dashboard by `role_id` in the JWT | `roles` table, `navbar.component.ts`, `AfterLoginService` | `src/proxy.js` (route guard), `src/components/providers/SessionProvider.jsx` | KEPT |
| BR-02 | User status is `Active`, `Unconfirmed` or `Banned`. API login rejects Banned ("Your account is banned by administrators.") and Unconfirmed ("Please confirm your email address first.") after issuing and invalidating the token | `Api\Auth\AuthController@login` | `services/auth/authService.js` | KEPT (auth.contract) |
| BR-03 | The panel (web) login accepts Unconfirmed users and sends them to the e-mail verification notice; `verified` middleware guards every panel page | `Web\Auth\LoginController`, `routes/web.php` | `services/panel/webAuth.js`, `components/panel/PanelShell.jsx` | KEPT |
| BR-04 | Login with e-mail **or** username (`LoginRequest::getCredentials`: an `@` selects e-mail) | `LoginRequest` | `authService.getCredentials` | KEPT |
| BR-05 | Every API login rotates `users.unique_uuid` (`SELECT UUID()`), writes **two** `api_tokens` rows (attempt() is called twice, R-14), updates `last_login` and logs "Logged in." | `AuthController@login`, `UpdateLastLoginTimestamp` | `authService.login` | KEPT (auth.contract) |
| BR-06 | JWT: HS256 with `JWT_SECRET`, 60-min TTL, custom claims (`user_id, email, email_verified_at, uuid, role_id, application_number, username, phone`, plus `permanent_institute_id` for role 5); valid only while its `jti` row exists in `api_tokens` | `User::getJWTCustomClaims`, `ExtendsJwtValidation` | `services/auth/jwtService.js` | KEPT (tokens interchangeable both ways) |
| BR-07 | `verifyUser` (uuid/e-mail/role check) never rejects a token: `get() != null` is always true | `Controller::verifyUser` | `services/auth/legacyAuth.js` | BROKEN IN ORIGINAL (R-04), KEPT |
| BR-08 | Throttling: `throttle_enabled`, `throttle_attempts` (default 3), `throttle_lockout_time` (minutes, default 2) per username+IP on the panel login; API routes 60 requests/min/IP | `ThrottlesLogins`, `Kernel` `throttle:60,1` | `webAuth.js` throttle map, `express-rate-limit` | KEPT |
| BR-09 | Registration (portal API): `RegisterRequest` rules; status `Unconfirmed` when `reg_email_confirmation` is on, else `Active`; sends `UserRegistered`; 404 when `reg_enabled` is off | `Api\Auth\RegistrationController@index` | `services/auth/accountService.js` | KEPT (account.contract) |
| BR-10 | Registration (panel): role "User", requires `phone`, which the form never sends | `Web\Auth\RegisterController` | `webAuth.register` | BROKEN IN ORIGINAL (R-41), KEPT |
| BR-11 | Sign-up notification to administrators when `notifications_signup_email` is on (panel registration only; the API registration does not fire `Registered`) | `SendSignUpNotification` | `webAuth.register` | KEPT |
| BR-12 | Banning a user invalidates sessions and tokens | `InvalidateSessionsAndTokens` | `stockService` (users update) | CHANGED: the original compared status after the update and never revoked (DEV-14) |
| BR-13 | Verifying an e-mail activates the user (`ActivateUser` listener) | `Verified` event | `webAuth.verifyEmail` | KEPT |
| BR-14 | Mobile register double-hashed the password and fails under strict SQL mode | `MobileUserAuthController` | `accountService` | BROKEN IN ORIGINAL (R-07), KEPT as failure |

## 2. Password reset

| ID | Rule | Original | Port | Status |
|---|---|---|---|---|
| BR-20 | Portal reset (`/forgot-password` → mail → `/reset-password`): token stored in `password_resets`, reset via `/api/resetPassword` | `ResetPasswordController`, `ChangePasswordController` | `accountService` | CHANGED: tokens expire after 60 min instead of never (DEV-12) |
| BR-21 | Broker reset (`/api/password/remind`, panel "forgot password"): one bcrypt-hashed token per e-mail; mail links to the portal `/response-password-reset`, whose API compares the plain token with the hash and never succeeds | `RemindController`, `ForgotPasswordController`, `Neat\Mail\ResetPassword` | `accountService.passwordRemind`, `webAuth.remindPassword` | BROKEN IN ORIGINAL (R-42), KEPT |
| BR-22 | Panel `/password/reset/{token}`: verifies the hashed token within `login_reset_token_lifetime`, sets the password, logs "Reseted password using "Forgot Password" option." and logs the user in | `Web\Auth\ResetPasswordController` | `webAuth.resetPassword` | KEPT |
| BR-23 | `forgot_password` setting off → reset routes answer 404 (`password-reset` middleware) | middleware | `accountService`, `webAuth`, panel pages | KEPT |

## 3. Catalog and products

| ID | Rule | Original | Port | Status |
|---|---|---|---|---|
| BR-30 | A product is listed only when `product_details.isDetailsSubmitted = 'Yes'` and `product.product_active = 'Approved'` | `CourseController` catalog queries | `repositories/productRepository.js` | KEPT (course.contract) |
| BR-31 | Landing lists are random (`inRandomOrder()`); B2B lists ignore the type filter (commented out), B2C filters by type | `CourseController` | `courseService` | KEPT |
| BR-32 | Bucket filter: `bucket == "All"` (PHP loose) means no filter; search `bucket == ""` (also null) means no search | `CourseController` | `courseService` | KEPT |
| BR-33 | Every product-details view increments `product_details.view_counter` | `getProductDetails` | `courseService.getProductDetails` | KEPT |
| BR-34 | Comments: `getComments {count}` returns `count*3` rows; replies attach to a comment | `CourseController` | `courseService` | KEPT |
| BR-35 | Company edits its product page (`submitProductDetails`); an unknown code answers `{"message":"Exists"}` | `CompanyController` | `companyService` | CHANGED: product must belong to the token's company or an admin (DEV-09) |
| BR-36 | Admin approves/rejects products (`changeProductStatus`), sets MoU dates, sees statistics that exclude staff/test accounts | `AdminController`, `ProductController` | `adminService` | KEPT; admin role now required (DEV-08) |
| BR-37 | Company product form: `setPreviousValuesForm` writes `product_direct_url` into `payment_link` | `company-form.component.ts` | `components/company/CompanyForm.jsx` | BROKEN IN ORIGINAL (R-39), KEPT |

## 4. Students, institutes, learners, free seats

| ID | Rule | Original | Port | Status |
|---|---|---|---|---|
| BR-40 | Student details uniqueness checks compare against fields the form no longer sends (NULL) | `StudentController@submitStudentDetails` | `studentService` | KEPT |
| BR-41 | Institutes upload nominated students from Excel (parsed in the browser with SheetJS); only the **first** row is validated; a failure deletes the rows inserted so far | `InstituteController@ecxelUpload` | `instituteService`, `institute/file-upload` page | KEPT (institute parity, 14 checks) |
| BR-42 | Paid Excel upload inserts `'No'` into an integer column and always fails | `uploadExcelPaid` | `instituteService` | BROKEN IN ORIGINAL (R-22), KEPT |
| BR-43 | Institute "add student" (new) always fails (insert omits a NOT NULL column) | `submitStudentDetailsFromInstitute` | `instituteService` | BROKEN IN ORIGINAL (R-21), KEPT |
| BR-44 | DOB parsing follows PHP `strtotime`/Carbon rules (`15/01/2004` rejected, `1/15/04` US-style) | `InstituteController` | `utils/phpDate.js` (oracle-tested against PHP) | KEPT (R-23) |
| BR-45 | Free seats: a student proves eligibility with the NEAT secret code (`checkStudentSecretCode`), then the company code (`checkCompanySecretCode`) marks the seat availed | `StudentController` | `studentService` | KEPT |
| BR-46 | The automatic free-seat allocation engine (bucketing by stream, category-wise seats, `FreeSeatAllocation` mail with 2 s pauses) is only reachable through `ProductController@allocateseat`, which does not exist | `ProductRepository` | `routes/unresolved.routes.js` (same 500) | BROKEN IN ORIGINAL (R-03), not reachable |

## 5. Purchases and payment

| ID | Rule | Original | Port | Status |
|---|---|---|---|---|
| BR-50 | `applyForPaidCourse {code, quantity}` records a `product_purchased_audit` row with a session id and returns the company `payment_link` (or `product_direct_url`) with `courseid, studentname, email, mobile` appended unencoded | `CourseController@applyForPaidCourse` | `courseService.applyForPaidCourse` | CHANGED: random v4 session id instead of time-based `UUID()` (DEV-11); PII in URL kept (R-34) |
| BR-51 | Gateway result comes back through the browser (`/neatstudentresponse.php?Success=1&sessionid=…` → `paymentSuccess`); exactly one matching audit row is required, then status "Payment Successful" and the institute/learner payment mail (BCC neatsupport) | `PaymentController` | `paymentService` | KEPT; no signature check (SEC-PAY-01, owner decision) |
| BR-52 | `paymentFailure` answers an empty 200 | `PaymentController` | `paymentService` | KEPT |

## 6. Files

| ID | Rule | Original | Port | Status |
|---|---|---|---|---|
| BR-60 | Uploads go to `public/files/{course_logo,product_video,b2b_discount_table,mou_file}` and `public/upload/users` with the original naming, served at the same URLs | `FileController` | `fileService`, `integrations/storage.js` | KEPT |
| BR-61 | Allowed types: logo/discount table png/jpg/jpeg ≤ 2 MB, video mp4 ≤ 100 MB, MoU pdf ≤ 10 MB (`updateMou`: pdf/doc/docx) | Angular client checks; server trusted the client | `fileService` (magic bytes) | CHANGED: enforced server-side (DEV-10) |
| BR-62 | A MoU upload is forwarded to the NEAT EoI system (`saveDocument`, 60 s timeout) | `FileController@uploadFile` | `integrations/eoiApi.js` | KEPT |
| BR-63 | Avatars: cropped to the selected points, resized to 160×160 | `AvatarController` (Intervention) | `stockService.uploadAndCropAvatar` (sharp) | KEPT |

## 7. Panel administration

| ID | Rule | Original | Port | Status |
|---|---|---|---|---|
| BR-70 | Permissions gate every panel page (`users.manage`, `users.activity`, `roles.manage`, `permissions.manage`, `settings.general/auth/notifications`, `announcements.manage`) | route middleware | `routes/panel.routes.js`, `PanelShell` sidebar | KEPT |
| BR-71 | Roles/permissions marked non-removable cannot be deleted | `RolesController`, `PermissionsController` | stock API | KEPT |
| BR-72 | Settings are stored in `storage/settings.json`; switches post hidden `0` + checkbox `1` | `SettingsController` | `panelService.updateSettings`, `components/panel/settings.jsx` | KEPT |
| BR-73 | Announcements: 10 per page (index), 7 per page (list), optional e-mail to all users; updates log the "created" text (quirk) | `neatapp/announcements` | `announcementsPanel.js` | KEPT (body sanitised, DEV-F10) |
| BR-74 | Activity log: 20 per page, searchable by message | `UserActivity` plugin | `activityPanel.js` | KEPT |
| BR-75 | Impersonation: an admin can act as another user and leave again | lab404/laravel-impersonate | `/api/panel/impersonate` (`imp` claim) | KEPT |
| BR-76 | Company-profile tools create a company login from a NEAT ID (`neat_eoi`) and copy accepted Phase-2 products (cross-database `neatphase2eoi`/`neatphase2`) | `CompanyCreateProfile` | `panelService` company-profile functions | CHANGED: admin-only and parameterised (DEV-15/16, DEV-F13); profile creation fails like the original (R-28) |
