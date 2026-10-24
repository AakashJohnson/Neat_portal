// Ports of Api\Auth\RegistrationController, Api\ResetPasswordController,
// Api\ChangePasswordController, Api\Auth\Password\RemindController and
// Api\Auth\MobileUserAuthController.
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, table } from '../../database/knex.js';
import { settingEnabled } from '../../config/settings.js';
import { validateOrFail } from '../../validators/laravelValidator.js';
import { httpException } from '../../http/respond.js';
import { sendMail } from '../../integrations/mail/mailer.js';
import { resetPassword as resetPasswordMail, userRegistered } from '../../integrations/mail/templates/authMails.js';
import { ACTIVITY, logActivity } from '../../repositories/activityRepository.js';
import { withoutSecrets } from '../../repositories/userRepository.js';
import { checkPassword, hashPassword, UserStatus } from './authService.js';
import { issueToken } from './jwtService.js';
import { logger } from '../../config/logger.js';
import { strRandom } from '../../utils/str.js';
import { nowSql, unixNow } from '../../utils/time.js';

const users = () => db(table('users'));
const ok = (body, status = 200) => ({ status, body });

// ------------------------------------------------------------ registration

const REGISTER_RULES = {
  email: 'required|email|unique:users,email',
  username: 'required',
  password: 'required|min:8|regex:/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{6,}$/',
  password_confirmation: 'required|same:password',
  phone: 'required|unique:users,phone|numeric',
};

const ROLE_NAMES = { Student: 'Student', Institute: 'Institute', Learner: 'Learner' };

/** Middleware `registration`: 404 unless setting reg_enabled. */
export function assertRegistrationEnabled() {
  if (!settingEnabled('reg_enabled')) throw httpException(404, '');
}

/** POST /api/register — RegistrationController@index (RegisterRequest validation first: 422). */
export async function register(input) {
  assertRegistrationEnabled();
  await validateOrFail(input, REGISTER_RULES);

  const roleName = ROLE_NAMES[input.role_id];
  if (!roleName) return ok({ message: 'Error', reason: 'Wrong Role' });
  const role = await db(table('roles')).where('name', roleName).first('id');

  let applicationNumber;
  if (roleName === 'Student') {
    const existing = await db(table('student')).where('email', input.email).first('application_number');
    const [{ n }] = await db(table('student')).where('email', input.email).count({ n: '*' });
    applicationNumber = Number(n) === 0 ? unixNow() : existing?.application_number ?? null;
    await db(table('student_details')).insert({
      application_number: applicationNumber,
      college_name: input.college_name ?? null,
      name_of_learner: input.username,
      admission_registration_number: input.admission_number ?? null,
      email: input.email,
      contact_number: input.phone,
    });
  } else if (roleName === 'Institute') {
    applicationNumber = unixNow();
    const [{ n }] = await users().where('permanent_institute_id', input.permanent_institute_id ?? null).where('role_id', '5').count({ n: '*' });
    if (Number(n) > 0) return ok({ message: 'Error', reason: 'This institute is not allowed to register currently' });
  } else {
    applicationNumber = unixNow();
    await db(table('learner')).insert({
      application_number: applicationNumber,
      profession: input.profession ?? 'Learner',
      name: input.username,
      phone: input.phone,
      email: input.email,
    });
  }

  // validFormData(): status depends on reg_email_confirmation.
  const confirm = settingEnabled('reg_email_confirmation');
  const [[{ uuid }]] = await db.raw('select UUID() as uuid');
  const now = nowSql();
  const [userId] = await users().insert({
    email: input.email,
    username: input.username,
    password: await hashPassword(input.password), // Eloquent setPasswordAttribute: bcrypt once
    status: confirm ? UserStatus.UNCONFIRMED : UserStatus.ACTIVE,
    email_verified_at: confirm ? null : now,
    role_id: role.id,
    unique_uuid: uuid,
    phone: input.phone,
    created_at: now,
    updated_at: now,
  });

  await users().where('id', userId).update({
    email_verification_token: strRandom(100),
    permanent_institute_id: input.permanent_institute_id ?? null,
    application_number: applicationNumber,
  });

  // UserRegistered is a queued (sync) mailable: SerializesModels reloads the
  // user from the database, so the link carries the token written above.
  const fresh = await users().where('id', userId).first();
  try {
    await sendMail({ to: fresh.email, ...userRegistered(fresh) });
  } catch (err) {
    // DEV-06: the original print_r()'d the error into the response body.
    logger.warn({ err: err.message }, 'UserRegistered mail failed');
  }

  return ok({ requires_email_confirmation: confirm }, 201);
}

/**
 * POST /api/register/verify-email/{token} — stock route. Broken in the original
 * (R-24): it queries users.confirmation_token, a column that does not exist,
 * so with reg_email_confirmation enabled it always fails with HTTP 500.
 */
export async function verifyEmailToken() {
  assertRegistrationEnabled();
  if (!settingEnabled('reg_email_confirmation')) return ok({ error: 'Resource Not Found' }, 404);
  return { status: 500, body: { message: 'Server Error' } };
}

// --------------------------------------------------- custom password reset

// DEV-12: the original reused a stored reset token forever. Tokens are now
// only reused/accepted for 60 minutes (config/auth.php passwords.users.expire).
const RESET_TOKEN_MINUTES = 60;
const tokenFresh = (createdAt) =>
  createdAt != null && Date.now() - new Date(`${String(createdAt).replace(' ', 'T')}Z`).getTime() < RESET_TOKEN_MINUTES * 60_000;

/** POST /api/sendPasswordResetLink {email} — ResetPasswordController@sendEmail */
export async function sendPasswordResetLink({ email }) {
  if (!(await users().where('email', email ?? null).first('id'))) {
    return ok({ error: "Email Does't exist on our database" }, 404);
  }
  const old = await db(table('password_resets')).where('email', email).first();
  let token;
  if (old && tokenFresh(old.created_at)) {
    token = old.token;
  } else {
    if (old) await db(table('password_resets')).where('email', email).delete();
    token = strRandom(60);
    await db(table('password_resets')).insert({ email, token, created_at: nowSql() });
  }
  await sendMail({ to: email, ...resetPasswordMail(token) });
  return ok({ data: 'Email sent successfully, Please Check Your Inbox' });
}

/** POST /api/resetPassword {token, email, password, password_confirmation} — ChangePasswordController@process */
export async function changePassword(input) {
  await validateOrFail(input, { token: 'required', email: 'required|email', password: 'required|confirmed|min:8' });
  const row = await db(table('password_resets')).where({ email: input.email, token: input.token }).first();
  if (!row || !tokenFresh(row.created_at)) {
    return ok({ error: 'Token or Email is incorrect' }, 422);
  }
  const user = await users().where('email', input.email).first('id');
  if (user) await users().where('id', user.id).update({ password: await hashPassword(input.password), updated_at: nowSql() });
  await db(table('password_resets')).where({ email: input.email, token: input.token }).delete();
  // Original: response()->json(['data' => '...', Response::HTTP_CREATED]) → {"data":…,"0":201} with status 200.
  return ok({ data: 'Password Successfully Changed', 0: 201 });
}

// ---------------------------------------------------- stock password broker

/** DatabaseTokenRepository::create(): one hashed token per e-mail. */
export async function createBrokerToken(email) {
  await db(table('password_resets')).where('email', email).delete();
  // hash_hmac('sha256', Str::random(40), APP_KEY): a 64-char hex secret; only its randomness matters.
  const token = randomBytes(32).toString('hex');
  await db(table('password_resets')).insert({ email, token: await bcrypt.hash(token, 10).then((h) => h.replace(/^\$2[ab]\$/, '$2y$')), created_at: nowSql() });
  return token;
}

/** POST /api/password/remind {email} — guest + password-reset middleware. */
export async function passwordRemind(input, ctx) {
  if (!settingEnabled('forgot_password')) throw httpException(404, '');
  await validateOrFail(input, { email: 'required|email|exists:users,email' });
  const user = await users().where('email', input.email).first();
  const token = await createBrokerToken(user.email);
  await sendMail({ to: user.email, ...resetPasswordMail(token) });
  await logActivity({ userId: user.id, description: ACTIVITY.REQUESTED_PASSWORD_RESET, ip: ctx.ip, userAgent: ctx.userAgent });
  return ok({ success: true });
}

// ------------------------------------------------------------------ mobile

/** Eloquent toArray() of a users row ($hidden + $dates), minus secrets (DEV-05). */
function serializeUser(row) {
  const out = withoutSecrets(row);
  if (out.birthday && /^\d{4}-\d{2}-\d{2}$/.test(out.birthday)) out.birthday = `${out.birthday} 00:00:00`;
  return out;
}

/** POST /api/mobile/login {email, password} */
export async function mobileLogin(input, ctx) {
  await validateOrFail(input, { email: 'required|email', password: 'required' });
  const user = await users().where('email', input.email).first();
  if (!user) return ok({ success: false, message: 'User not found' }, 404);
  if (!(await checkPassword(input.password, user.password))) return ok({ success: false, message: 'Invalid credentials' }, 401);
  if (user.status === UserStatus.BANNED) return ok({ success: false, message: 'Your account is banned' }, 403);
  const token = await issueToken(user, ctx);
  return ok({ success: true, message: 'Login successful', token, user: serializeUser(user) });
}

/**
 * POST /api/mobile/register — fails in the original under strict SQL mode
 * (role_id/status are NOT NULL without defaults and are not supplied), and it
 * double-hashed the password (R-07). The port reproduces the failure (500)
 * instead of creating unusable accounts.
 */
export async function mobileRegister(input) {
  await validateOrFail(input, { name: 'required', email: 'required|email|unique:users,email', password: 'required|min:6' });
  return { status: 500, body: { message: 'Server Error' } };
}

/** POST /api/mobile/forgot-password {email} — Password::sendResetLink() */
export async function mobileForgotPassword(input, ctx) {
  await validateOrFail(input, { email: 'required|email' });
  const user = await users().where('email', input.email).first();
  if (!user) return ok({ success: false, message: 'Unable to send reset link' }, 400);
  const token = await createBrokerToken(user.email);
  // User::sendPasswordResetNotification(): ResetPassword mail + RequestedPasswordResetEmail event.
  await sendMail({ to: user.email, ...resetPasswordMail(token) });
  await logActivity({ userId: user.id, description: ACTIVITY.REQUESTED_PASSWORD_RESET, ip: ctx.ip, userAgent: ctx.userAgent });
  return ok({ success: true, message: 'Password reset link sent to email' });
}

