import { db, table } from '../database/knex.js';
import { addMinutesSql, nowSql } from '../utils/time.js';
import { strRandom } from '../utils/str.js';

const tokens = () => db(table('api_tokens'));

// config/jwt.php 'lottery' => [5, 100]
const LOTTERY = [5, 100];

/** TokenFactory::forUser(): one api_tokens row per issued JWT (its jti). */
export async function createForUser(userId, { ip, userAgent, ttlMinutes }) {
  const now = nowSql();
  const row = {
    id: strRandom(40),
    user_id: userId,
    ip_address: ip ?? null,
    user_agent: String(userAgent ?? '').slice(0, 500),
    expires_at: ttlMinutes == null ? null : addMinutesSql(ttlMinutes),
    created_at: now,
    updated_at: now,
  };
  await tokens().insert(row);

  if (Math.floor(Math.random() * LOTTERY[1]) + 1 <= LOTTERY[0]) {
    await tokens().where('expires_at', '<=', nowSql()).delete();
  }
  return row;
}

/** ExtendsJwtValidation::jtiIsValid() */
export async function isValid(jti, userId) {
  const [{ n }] = await tokens()
    .where('id', jti)
    .where('user_id', userId)
    .where('expires_at', '>', nowSql())
    .count({ n: '*' });
  return Number(n) === 1;
}

/** ExtendsJwtValidation::invalidate() */
export const deleteById = (jti) => tokens().where('id', jti).delete();

/** InvalidateSessionsAndTokens listener (user banned). */
export const deleteForUser = (userId) => tokens().where('user_id', userId).delete();
