// Web (Blade) authentication of the admin panel, for the Next.js panel:
// Web\Auth\LoginController, RegisterController, ResetPasswordController and
// VerificationController. They differ from the API (Api\Auth\AuthController):
//   - login: "These credentials do not match our records." / "Your account is
//     banned by administrator.", Unconfirmed users may log in (the `verified`
//     middleware then shows the verification notice), no unique_uuid refresh,
//     ThrottlesLogins keyed by lower(username)|ip with the throttle_* settings;
//   - register: RegisterRequest as modified for NEAT (phone required, which the
//     Blade form never sends — R-41), role "User";
//   - password reset: the stock broker (hashed token, expiry login_reset_token_lifetime);
//   - e-mail verification: signed links (expires + signature), 60 minutes.
import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, table } from '../../database/knex.js';
import { env } from '../../config/env.js';
import { setting, settingEnabled } from '../../config/settings.js';
import { validateOrFail } from '../../validators/laravelValidator.js';
import { httpException } from '../../http/respond.js';
import { checkPassword, getCredentials, hashPassword, UserStatus } from '../auth/authService.js';
import { issueToken } from '../auth/jwtService.js';
import * as userRepo from '../../repositories/userRepository.js';
import { ACTIVITY, logActivity } from '../../repositories/activityRepository.js';
import { sendMail } from '../../integrations/mail/mailer.js';
import { button, renderMessage } from '../../integrations/mail/markdownMail.js';
import { userRegistered } from '../../integrations/mail/templates/authMails.js';
import { nowSql } from '../../utils/time.js';

const ok = (body, status = 200) => ({ status, body });
const errors = (...messages) => ok({ message: messages[0], errors: { general: messages } }, 422);

// ------------------------------------------------------------------ login

/** ThrottlesLogins (RateLimiter in the cache): key → { attempts, lockedUntil }. */
const attempts = new Map();
const throttleKey = (username, ip) => `${String(username ?? '').toLowerCase()}|${ip}`;

export async function login(input, ctx) {
  await validateOrFail(input, { username: 'required', password: 'required' });
  const throttles = settingEnabled('throttle_enabled');
  const key = throttleKey(input.username, ctx.ip);
  const now = Date.now();
  const entry = attempts.get(key);
  if (throttles && entry?.lockedUntil > now) {
    return errors(`Too many login attempts. Please try again in ${Math.ceil((entry.lockedUntil - now) / 1000)} seconds.`);
  }

  const user = await userRepo.findByCredentials(getCredentials(input));
  if (!user || !(await checkPassword(input.password, user.password))) {
    if (throttles) {
      const maxAttempts = Number(setting('throttle_attempts')) || 0;
      const decayMs = (Number(setting('throttle_lockout_time')) || 1) * 60_000;
      const next = { attempts: (entry && entry.windowEnd > now ? entry.attempts : 0) + 1, windowEnd: entry && entry.windowEnd > now ? entry.windowEnd : now + decayMs };
      if (next.attempts >= maxAttempts) next.lockedUntil = now + decayMs;
      attempts.set(key, next);
    }
    return errors('These credentials do not match our records.');
  }
  if (user.status === UserStatus.BANNED) return errors('Your account is banned by administrator.');

  attempts.delete(key);
  // event(new LoggedIn): last login + activity "Logged in."
  await userRepo.touchLastLogin(user.id);
  await logActivity({ userId: user.id, description: ACTIVITY.LOGGED_IN, ip: ctx.ip, userAgent: ctx.userAgent });
  return ok({ token: await issueToken(user, ctx), verified: user.email_verified_at != null });
}

// --------------------------------------------------------------- register

export async function register(input, ctx) {
  if (!settingEnabled('reg_enabled')) throw httpException(404, '');
  await validateOrFail(input, {
    email: 'required|email|unique:users,email',
    username: 'required',
    password: 'required|min:8|regex:/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{6,}$/',
    password_confirmation: 'required|same:password',
    phone: 'required|unique:users,phone|numeric',
  });
  // RegisterRequest::validFormData(): email, username, password + status / email_verified_at (the phone is not stored).
  const confirm = settingEnabled('reg_email_confirmation');
  const role = await db(table('roles')).where('name', 'User').first('id');
  const now = nowSql();
  const [id] = await db(table('users')).insert({
    email: input.email,
    username: input.username,
    password: await hashPassword(input.password),
    role_id: role.id,
    status: confirm ? UserStatus.UNCONFIRMED : UserStatus.ACTIVE,
    email_verified_at: confirm ? null : now,
    created_at: now,
    updated_at: now,
  });
  const user = await userRepo.findById(id);
  await logActivity({ userId: id, description: ACTIVITY.CREATED_ACCOUNT, ip: ctx.ip, userAgent: ctx.userAgent });
  // event(new Registered): SendEmailVerificationNotification, SendSignUpNotification
  // (NeatMailUserRegistered — the verify-email mail — to every Admin).
  if (!user.email_verified_at) await sendVerification(user);
  if (settingEnabled('notifications_signup_email')) {
    const admins = await db(table('users')).join(table('roles'), `${table('roles')}.id`, '=', `${table('users')}.role_id`).where(`${table('roles')}.name`, 'Admin').select(`${table('users')}.email`);
    for (const admin of admins) await sendMail({ to: admin.email, ...userRegistered(user) });
  }
  return ok({
    message: settingEnabled('reg_email_confirmation') ? 'Your account is created successfully! Please confirm your email.' : 'Your account is created successfully!',
  });
}

// ---------------------------------------------------------- password reset

/** ResetPasswordController@reset (ResetsPasswords): broker token, then log in. */
export async function resetPassword(input, ctx) {
  await validateOrFail(input, { token: 'required', email: 'required|email', password: 'required|confirmed|min:8' });
  const user = await db(table('users')).where('email', input.email).first();
  if (!user) return errors("We can't find a user with that e-mail address.");
  const row = await db(table('password_resets')).where('email', input.email).first();
  const lifetimeMs = (Number(setting('login_reset_token_lifetime')) || 60) * 60_000;
  const fresh = row && Date.now() - new Date(`${String(row.created_at).replace(' ', 'T')}Z`).getTime() < lifetimeMs;
  if (!row || !fresh || !(await bcrypt.compare(String(input.token), String(row.token).replace(/^\$2y\$/, '$2b$')))) {
    return errors('This password reset token is invalid.');
  }
  await db(table('users')).where('id', user.id).update({ password: await hashPassword(input.password), updated_at: nowSql() });
  await db(table('password_resets')).where('email', input.email).delete();
  await logActivity({ userId: user.id, description: 'Reseted password using "Forgot Password" option.', ip: ctx.ip, userAgent: ctx.userAgent });
  await userRepo.touchLastLogin(user.id);
  return ok({ token: await issueToken(user, ctx), message: 'Your password has been reset!' });
}

// --------------------------------------------------------- e-mail verification

const panelBase = () => (process.env.PANEL_URL || 'http://localhost:3000/panel').replace(/\/$/, '');
const signingKey = () => createHmac('sha256', env.JWT_SECRET).update('panel-email-verification').digest();
const sign = (url) => createHmac('sha256', signingKey()).update(url).digest('hex');
const sha1 = (s) => createHmac('sha1', '').update(String(s)).digest('hex');

/** URL::temporarySignedRoute('verification.verify', +60 min, {id, hash: sha1(email)}). */
function verificationUrl(user) {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  const unsigned = `${panelBase()}/email/verify/${user.id}/${sha1(user.email)}?expires=${expires}`;
  return `${unsigned}&signature=${sign(unsigned)}`;
}

async function sendVerification(user) {
  const appName = setting('app_name');
  const body = `# Hello!\n\nPlease click the button below to verify your email address.\n\n${button(verificationUrl(user), 'Verify Email Address', 'primary')}\n\nIf you did not create an account, no further action is required.\n\nRegards,<br>${appName}`;
  await sendMail({ mailable: 'VerifyEmail', to: user.email, subject: 'Verify Email Address', ...renderMessage(body, { appUrl: panelBase(), appName }) });
}

/** POST email/resend (auth): verified users are redirected home without a mail. */
export async function resendVerification(ctx) {
  if (ctx.user.email_verified_at) return ok({ verified: true });
  await sendVerification(ctx.user);
  return ok({ resent: true, message: 'A fresh verification link has been sent to your email address.' });
}

/** GET email/verify/{id}/{hash}?expires&signature (auth + signed). */
export async function verifyEmail(ctx, { id, hash, expires, signature }) {
  const unsigned = `${panelBase()}/email/verify/${id}/${hash}?expires=${expires}`;
  const expected = Buffer.from(sign(unsigned));
  const given = Buffer.from(String(signature ?? ''));
  if (expected.length !== given.length || !timingSafeEqual(expected, given) || Number(expires) < Date.now() / 1000) throw httpException(403, 'Invalid signature.');
  if (String(id) !== String(ctx.user.id) || hash !== sha1(ctx.user.email)) throw httpException(403, 'This action is unauthorized.');
  if (!ctx.user.email_verified_at) await db(table('users')).where('id', ctx.user.id).update({ email_verified_at: nowSql(), updated_at: nowSql() });
  return ok({ verified: true });
}
