// Carbon 2 / PHP date helpers for the panel views. Dates come from the API as
// "YYYY-MM-DD HH:MM:SS" in the app timezone (config app.timezone = GMT).
//   diffForHumans(date)                      → "3 days ago"
//   diffForHumans(date, { absolute, short }) → "3d"
//   formatDate(date, 'Y-m-d \a\t h:i A')      → "2026-10-24 at 07:43 AM"

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "YYYY-MM-DD[ HH:MM:SS]" (GMT) → Date. */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim().replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.length === 10 ? `${s}T00:00:00` : s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** DateTime::diff() components (calendar years / months, then days, h, i, s). */
function components(from, to) {
  let [a, b] = from <= to ? [from, to] : [to, from];
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  let ms = b.getTime() % 86_400_000 - (a.getTime() % 86_400_000);
  if (ms < 0) {
    ms += 86_400_000;
    d -= 1;
  }
  if (d < 0) {
    m -= 1;
    d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  const h = Math.floor(ms / 3_600_000);
  const i = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { y, m, w: Math.floor(d / 7), d: d % 7, h, i, s };
}

const LONG = { y: 'year', m: 'month', w: 'week', d: 'day', h: 'hour', i: 'minute', s: 'second' };
const SHORT = { y: ['yr', 'yrs'], m: ['mo', 'mos'], w: ['w', 'w'], d: ['d', 'd'], h: ['h', 'h'], i: ['m', 'm'], s: ['s', 's'] };

/** Carbon::diffForHumans(null, $absolute, $short) relative to now (one part, NO_ZERO_DIFF). */
export function diffForHumans(value, { absolute = false, short = false, now = new Date() } = {}) {
  const date = parseDate(value);
  if (!date) return '';
  const c = components(date, now);
  let unit = ['y', 'm', 'w', 'd', 'h', 'i', 's'].find((u) => c[u] > 0) ?? 's';
  const count = c[unit] || 1;
  const time = short ? `${count}${SHORT[unit][count === 1 ? 0 : 1]}` : `${count} ${LONG[unit]}${count === 1 ? '' : 's'}`;
  if (absolute) return time;
  return date <= now ? `${time} ago` : `${time} from now`;
}

/** PHP date($format) for the formats the views use (Y m d j n M F D l H h i s A a, \-escapes). */
export function formatDate(value, format) {
  const d = parseDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const H = d.getUTCHours();
  const map = {
    Y: () => String(d.getUTCFullYear()),
    y: () => pad(d.getUTCFullYear() % 100),
    m: () => pad(d.getUTCMonth() + 1),
    n: () => String(d.getUTCMonth() + 1),
    d: () => pad(d.getUTCDate()),
    j: () => String(d.getUTCDate()),
    M: () => MONTHS[d.getUTCMonth()].slice(0, 3),
    F: () => MONTHS[d.getUTCMonth()],
    D: () => DAYS[d.getUTCDay()].slice(0, 3),
    l: () => DAYS[d.getUTCDay()],
    H: () => pad(H),
    G: () => String(H),
    h: () => pad(H % 12 || 12),
    g: () => String(H % 12 || 12),
    i: () => pad(d.getUTCMinutes()),
    s: () => pad(d.getUTCSeconds()),
    A: () => (H < 12 ? 'AM' : 'PM'),
    a: () => (H < 12 ? 'am' : 'pm'),
  };
  let out = '';
  for (let k = 0; k < format.length; k++) {
    const ch = format[k];
    if (ch === '\\') out += format[++k] ?? '';
    else out += map[ch] ? map[ch]() : ch;
  }
  return out;
}

/** config('app.date_format') / config('app.date_time_format') */
export const DATE_FORMAT = 'Y-m-d';
export const DATE_TIME_FORMAT = 'Y-m-d \\a\\t h:i A';
