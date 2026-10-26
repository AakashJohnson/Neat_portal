import { db, table } from '../database/knex.js';
import { nowSql } from '../utils/time.js';

const users = () => db(table('users'));


export const SECRET_USER_COLUMNS = Object.freeze([
  'password',
  'remember_token',
  'sms_otp',
  'email_verification_token',
  'two_factor_options',
]);

export const withoutSecrets = (row) =>
  Object.fromEntries(Object.entries(row).filter(([k]) => !SECRET_USER_COLUMNS.includes(k)));

export const findById = (id) => users().where('id', id).first();


export function findByCredentials(credentials) {
  const q = users();
  for (const [key, value] of Object.entries(credentials)) {
    if (key !== 'password') q.where(key, value);
  }
  return q.first();
}

/** AuthController::updateUUIDForUser(): new MySQL UUID(); true when exactly one row changed. */
export async function refreshUniqueUuid(userId) {
  const [rows] = await db.raw('select UUID() as uuid');
  const count = await users().where('id', userId).update({ unique_uuid: rows[0].uuid });
  return count === 1;
}

/** UpdateLastLoginTimestamp listener (UserRepository::update also bumps updated_at). */
export const touchLastLogin = (userId) => {
  const now = nowSql();
  return users().where('id', userId).update({ last_login: now, updated_at: now });
};
