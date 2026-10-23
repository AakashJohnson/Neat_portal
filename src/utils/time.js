// Laravel's app timezone is GMT (config/app.php) and Carbon writes timestamps
// as "Y-m-d H:i:s". These helpers produce exactly that format in UTC.

const pad = (n) => String(n).padStart(2, '0');

/** @param {Date} [date] @returns {string} "YYYY-MM-DD HH:mm:ss" (UTC) */
export function toSqlDateTime(date = new Date()) {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

export const nowSql = () => toSqlDateTime(new Date());

export const addMinutesSql = (minutes, from = new Date()) =>
  toSqlDateTime(new Date(from.getTime() + minutes * 60_000));

/** Unix timestamp in seconds. */
export const unixNow = () => Math.floor(Date.now() / 1000);
