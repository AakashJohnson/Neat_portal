import { db, table } from '../database/knex.js';
import { nowSql } from '../utils/time.js';

// Messages from vendor/neatapp/activity-log/resources/lang/en/log.php
export const ACTIVITY = Object.freeze({
  LOGGED_IN: 'Logged in.',
  LOGGED_OUT: 'Logged out.',
  CREATED_ACCOUNT: 'Created an account.',
});

/** neatapp/activity-log Logger::log() */
export function logActivity({ userId, description, ip, userAgent }) {
  return db(table('user_activity')).insert({
    description,
    user_id: userId,
    ip_address: ip ?? '',
    user_agent: String(userAgent ?? '').slice(0, 500),
    created_at: nowSql(),
  });
}
