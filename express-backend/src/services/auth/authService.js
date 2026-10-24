// Port of Api\Auth\AuthController (login/logout) and its listeners.
import bcrypt from 'bcryptjs';
import * as userRepo from '../../repositories/userRepository.js';
import { ACTIVITY, logActivity } from '../../repositories/activityRepository.js';
import { issueToken, invalidateToken } from './jwtService.js';
import { isEmail } from '../../utils/str.js';

export const UserStatus = Object.freeze({ ACTIVE: 'Active', BANNED: 'Banned', UNCONFIRMED: 'Unconfirmed' });

/** LoginRequest::getCredentials(): email or username, depending on the input. */
export function getCredentials({ username, password }) {
  return isEmail(username) ? { email: username, password } : { username, password };
}

/**
 * Laravel bcrypt hashes use the "$2y$" prefix; bcryptjs only emits "$2a$"/"$2b$"
 * but the algorithm is identical, so the prefix is normalised for comparison.
 */
export async function checkPassword(plain, hash) {
  if (typeof hash !== 'string' || !hash.startsWith('$2')) return false;
  return bcrypt.compare(String(plain), hash.replace(/^\$2y\$/, '$2b$'));
}

/** Laravel Hash::make() equivalent: bcrypt cost 10 with the "$2y$" prefix. */
export async function hashPassword(plain) {
  const hash = await bcrypt.hash(String(plain), 10);
  return hash.replace(/^\$2[ab]\$/, '$2y$');
}

/** JWTAuth::attempt(): validate credentials, then issue a token for the (fresh) user row. */
async function attempt(credentials, ctx) {
  const user = await userRepo.findByCredentials(credentials);
  if (!user || !(await checkPassword(credentials.password, user.password))) return null;
  return { user, token: await issueToken(user, ctx) };
}

/**
 * AuthController::login(). Returns { status, body } exactly as Laravel responds.
 * The original calls attempt() twice; the first token only proves the password
 * (its api_tokens row is still created), the second carries the refreshed uuid.
 */
export async function login(input, ctx) {
  const credentials = getCredentials(input);

  const first = await attempt(credentials, ctx);
  if (!first) return { status: 401, body: { error: 'Invalid credentials.' } };

  if (!(await userRepo.refreshUniqueUuid(first.user.id))) {
    return { status: 500, body: { error: 'Please try again.' } };
  }

  const second = await attempt(credentials, ctx);
  const { user, token } = second;

  if (user.status === UserStatus.BANNED) {
    await invalidateToken(token);
    return { status: 401, body: { error: 'Your account is banned by administrators.' } };
  }
  if (user.status === UserStatus.UNCONFIRMED) {
    await invalidateToken(token);
    return { status: 401, body: { error: 'Please confirm your email address first.' } };
  }

  // event(new LoggedIn): UpdateLastLoginTimestamp + activity log "Logged in."
  await userRepo.touchLastLogin(user.id);
  await logActivity({ userId: user.id, description: ACTIVITY.LOGGED_IN, ip: ctx.ip, userAgent: ctx.userAgent });

  return { status: 200, body: { token } };
}

/** AuthController::logout(): event(LoggedOut) is logged, the token is invalidated. */
export async function logout(auth, ctx) {
  await logActivity({ userId: auth.user.id, description: ACTIVITY.LOGGED_OUT, ip: ctx.ip, userAgent: ctx.userAgent });
  await invalidateToken(auth.token);
  return { status: 200, body: { success: true } };
}
