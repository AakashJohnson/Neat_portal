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


export async function checkPassword(plain, hash) {
  if (typeof hash !== 'string' || !hash.startsWith('$2')) return false;
  return bcrypt.compare(String(plain), hash.replace(/^\$2y\$/, '$2b$'));
}


export async function hashPassword(plain) {
  const hash = await bcrypt.hash(String(plain), 10);
  return hash.replace(/^\$2[ab]\$/, '$2y$');
}

/** Authenticate before issuing a token; rejected logins must not leave token rows. */
export async function login(input, ctx) {
  const credentials = getCredentials(input);
  let user = await userRepo.findByCredentials(credentials);
  if (!user || !(await checkPassword(credentials.password, user.password))) return { status: 401, body: { error: 'Invalid credentials.' } };

  if (user.status === UserStatus.BANNED) {
    return { status: 401, body: { error: 'Your account is banned by administrators.' } };
  }
  if (user.status === UserStatus.UNCONFIRMED) {
    return { status: 401, body: { error: 'Please confirm your email address first.' } };
  }

  if (!(await userRepo.refreshUniqueUuid(user.id))) {
    return { status: 500, body: { error: 'Please try again.' } };
  }
  user = await userRepo.findById(user.id);
  // event(new LoggedIn): UpdateLastLoginTimestamp + activity log "Logged in."
  await userRepo.touchLastLogin(user.id);
  await logActivity({ userId: user.id, description: ACTIVITY.LOGGED_IN, ip: ctx.ip, userAgent: ctx.userAgent });
  const token = await issueToken(user, ctx);

  return { status: 200, body: { token } };
}

/** AuthController::logout(): event(LoggedOut) is logged, the token is invalidated. */
export async function logout(auth, ctx) {
  await logActivity({ userId: auth.user.id, description: ACTIVITY.LOGGED_OUT, ip: ctx.ip, userAgent: ctx.userAgent });
  await invalidateToken(auth.token);
  return { status: 200, body: { success: true } };
}
