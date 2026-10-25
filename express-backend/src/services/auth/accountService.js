// Ports of Api\Auth\RegistrationController, Api\ResetPasswordController,
// Api\ChangePasswordController, Api\Auth\Password\RemindController and
// Api\Auth\MobileUserAuthController.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, table } from '../../database/knex.js';
import { settingEnabled } from '../../config/settings.js';
import { validateOrFail } from '../../validators/laravelValidator.js';
import { HttpError, httpException } from '../../http/respond.js';
import { env } from '../../config/env.js';
import { sendMail } from '../../integrations/mail/mailer.js';
import { resetPassword as resetPasswordMail, userRegistered } from '../../integrations/mail/templates/authMails.js';
import { ACTIVITY, logActivity } from '../../repositories/activityRepository.js';
import { withoutSecrets } from '../../repositories/userRepository.js';
import { checkPassword, hashPassword, UserStatus } from './authService.js';
import { issueToken } from './jwtService.js';
import { logger } from '../../config/logger.js';
import { strRandom } from '../../utils/str.js';
import { nowSql } from '../../utils/time.js';
import { emailVerification } from '../verificationService.js';

const users = () => db(table('users'));
const ok = (body, status = 200) => ({ status, body });

// ------------------------------------------------------------ registration

const REGISTER_RULES = {
  email: 'required|string|email|max:191|unique:users,email',
  username: 'required|string|max:191',
  password: 'required|string|min:8|regex:/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{6,}$/',
  password_confirmation: 'required|same:password',
  phone: 'required|unique:users,phone|digits:10',
  college_name: 'required_if:role_id,Student|string|max:191',
  admission_number: 'required_if:role_id,Student|string|max:191',
  permanent_institute_id: 'required_if:role_id,Institute|string|max:191',
  profession: 'nullable|string|max:191',
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
  if (!role) throw httpException(503, 'Registration is unavailable for this role. Please contact support.');

  const confirm = settingEnabled('reg_email_confirmation');
  const password = await hashPassword(input.password);
  const now = nowSql();
  let fresh;
  for (let attempt = 0; attempt < 5; attempt++) {
    let nominatedStudent = false;
    try {
      fresh = await db.transaction(async (trx) => {
      // Serialize registrations of the same role, including the institute-ID
      // check (the legacy users table has no unique constraint on that field).
        await trx(table('roles')).where('id', role.id).forUpdate().first();
        if (roleName === 'Institute' && await trx(table('users')).where({
          permanent_institute_id: input.permanent_institute_id, role_id: role.id,
        }).first('id')) {
          throw new HttpError(409, { message: 'This institute is already registered. Please sign in or reset your password.' });
        }
        const existing = roleName === 'Student'
          ? await trx(table('student')).where('email', input.email).first('application_number')
          : null;
        nominatedStudent = existing?.application_number != null;
        // Keep the legacy ten-digit shape, without collisions for registrations
        // submitted during the same second.
        const applicationNumber = existing?.application_number ?? String(randomInt(1_000_000_000, 10_000_000_000));
        const [id] = await trx(table('users')).insert({
          email: input.email, username: input.username, password,
          status: confirm ? UserStatus.UNCONFIRMED : UserStatus.ACTIVE,
          email_verified_at: confirm ? null : now,
          email_verification_token: confirm ? strRandom(100) : null,
          role_id: role.id, unique_uuid: randomUUID(), phone: input.phone,
          application_number: applicationNumber,
          permanent_institute_id: roleName === 'Institute' ? input.permanent_institute_id : null,
          created_at: now, updated_at: now,
        });
        if (roleName === 'Student') {
          await trx(table('student_details')).insert({
            application_number: applicationNumber, college_name: input.college_name,
            name_of_learner: input.username, admission_registration_number: input.admission_number,
            email: input.email, contact_number: input.phone,
          });
        } else if (roleName === 'Learner') {
          await trx(table('learner')).insert({
            application_number: applicationNumber, profession: input.profession ?? 'Learner',
            name: input.username, phone: input.phone, email: input.email,
          });
        }
        return trx(table('users')).where('id', id).first();
      });
      break;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      const applicationCollision = /for key ['`](?:[^'`]*\.)?application_number(?:_2)?['`]/.test(err.sqlMessage ?? '');
      if (!nominatedStudent && applicationCollision && attempt < 4) {
        logger.warn({ code: err.code }, 'Generated registration number conflicted; retrying transaction');
        continue;
      }
      logger.warn({ code: err.code }, 'Registration conflicted with an existing account or profile; rolled back');
      throw new HttpError(409, { message: 'An account or profile with these details already exists. Please sign in, reset your password, or contact support.' });
    }
  }

  const delivery = confirm ? await sendVerificationMail(fresh) : 'not_required';
  return ok({ requires_email_confirmation: confirm, email_delivery: delivery }, 201);
}

async function sendVerificationMail(user) {
  try {
    await sendMail({ to: user.email, ...userRegistered(user) });
    if (env.MAIL_TRANSPORT !== 'smtp') {
      logger.warn('Verification email captured only; configure MAIL_TRANSPORT=smtp for delivery');
      return 'captured';
    }
    return 'sent';
  } catch (err) {
    logger.warn({ code: err.code, name: err.name }, 'Verification email delivery failed');
    return 'failed';
  }
}

export async function resendEmailVerificationLink(input) {
  assertRegistrationEnabled();
  await validateOrFail(input, { email: 'required|string|email' });
  const user = await users().where('email', input.email).first();
  if (!user || user.email_verified_at || user.status === UserStatus.BANNED) {
    return ok({ message: 'Success', reason: 'If your account needs verification, a verification email will be sent.' });
  }
  // Reuse the pending token so a retry never invalidates a link already sent.
  if (!user.email_verification_token) {
    await users().where('id', user.id).whereNull('email_verification_token').update({ email_verification_token: strRandom(100) });
  }
  const fresh = await users().where('id', user.id).first();
  const delivery = await sendVerificationMail(fresh);
  if (delivery !== 'sent') {
    throw httpException(503, 'Verification email could not be delivered. Please contact support to check the mail configuration.');
  }
  return ok({ message: 'Success', reason: 'If your account needs verification, a verification email will be sent.' });
}

/** Compatibility route backed by the existing email_verification_token column. */
export async function verifyEmailToken(token) {
  assertRegistrationEnabled();
  if (!settingEnabled('reg_email_confirmation')) return ok({ error: 'Resource Not Found' }, 404);
  const user = typeof token === 'string' && token
    ? await users().where('email_verification_token', token).first('email')
    : null;
  if (!user) return ok({ error: 'Invalid confirmation token.' }, 400);
  const result = await emailVerification({ email: user.email, token });
  return result.body.message === 'Success' ? ok({ success: true }) : result;
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
