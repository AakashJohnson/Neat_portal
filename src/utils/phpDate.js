// Carbon::parse($string)->age as used by InstituteController::validateStudent()
// for the "Date of Birth" column of institute Excel uploads.
//
// The rules below reproduce PHP 7.4's date parser for the formats that Excel
// (SheetJS sheet_to_json raw:false) and people realistically produce. They were
// derived from, and are unit-tested against, real PHP output
// (tests/unit/phpDate.test.js). Anything outside these formats raises the same
// warning text PHP raised (Laravel turned it into the API "reason").
import { PhpError } from './php.js';

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

// Inside Laravel the failure surfaces from DateTime::__construct() (observed
// via the live reference); positions/reasons match PHP's parser.
const fail = (s, pos, reason = 'Unexpected character') =>
  new PhpError(`DateTime::__construct(): Failed to parse time string (${s}) at position ${pos} (${s[pos] ?? ''}): ${reason}`);

// PHP accepts day 0..31 and month 1..12 syntactically, then normalises
// overflow (Feb 30 → Mar 1, day 0 → last day of the previous month).
const make = (y, m, d, hh = 0, mi = 0, ss = 0) => new Date(Date.UTC(y, m - 1, d, hh, mi, ss));

// Two-digit years: 00-69 → 2000s, 70-99 → 1900s.
const expandYear = (yy) => (yy.length === 2 ? (Number(yy) < 70 ? 2000 + Number(yy) : 1900 + Number(yy)) : Number(yy));

/**
 * @param {string|null|undefined} input
 * @param {Date} [now]
 * @returns {Date} UTC date-time
 * @throws {PhpError} with PHP's warning text
 */
export function carbonParse(input, now = new Date()) {
  const raw = input == null ? '' : String(input);
  const s = raw.trim();
  if (s === '') return now;

  let m;
  // ISO: YYYY-M-D, optional " HH:MM[:SS]" or "THH:MM:SS[Z]"
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?Z?)?$/))) {
    const [, y, mo, d, hh = 0, mi = 0, ss = 0] = m;
    if (Number(mo) < 1 || Number(mo) > 12) throw fail(raw, 6);
    if (Number(d) > 31) throw fail(raw, 9);
    return make(Number(y), Number(mo), Number(d), Number(hh), Number(mi), Number(ss));
  }
  // YY-MM-DD (two-digit year first)
  if ((m = s.match(/^(\d{2})-(\d{2})-(\d{2})$/))) {
    return make(expandYear(m[1]), Number(m[2]), Number(m[3]));
  }
  // D-M-YYYY
  if ((m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) {
    if (Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[1]) > 31) throw fail(raw, 0);
    return make(Number(m[3]), Number(m[2]), Number(m[1]));
  }
  // D.M.YYYY
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) {
    if (Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[1]) > 31) throw fail(raw, 0);
    return make(Number(m[3]), Number(m[2]), Number(m[1]));
  }
  // HH.MM.SS — "15.01.00" is a time of day (today), not a date.
  if ((m = s.match(/^(\d{1,2})\.(\d{2})\.(\d{2})$/)) && Number(m[1]) < 24 && Number(m[2]) < 60 && Number(m[3]) < 60) {
    return make(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), Number(m[1]), Number(m[2]), Number(m[3]));
  }
  // American M/D/YY or M/D/YYYY, optional time
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/))) {
    const [, mo, d, y, hh = 0, mi = 0, ss = 0] = m;
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) > 31) throw fail(raw, 0);
    return make(expandYear(y), Number(mo), Number(d), Number(hh), Number(mi), Number(ss));
  }
  // YYYY/M/D
  if ((m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/))) {
    if (Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[3]) > 31) throw fail(raw, 5);
    return make(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  // D-Mon-YYYY / D Mon YYYY / D Month YYYY
  if ((m = s.match(/^(\d{1,2})[-\s]+([A-Za-z]+)[-\s,]+(\d{4})$/)) && MONTHS[m[2].toLowerCase()]) {
    return make(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  }
  // Mon D, YYYY / Month D YYYY
  if ((m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)) && MONTHS[m[1].toLowerCase()]) {
    return make(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]));
  }

  if (/^[A-Za-z]/.test(s)) throw fail(raw, 0, 'The timezone could not be found in the database');
  if (/^\d+$/.test(s)) throw fail(raw, Math.max(0, s.length - 1));
  throw fail(raw, 0);
}

/** Carbon's ->age: whole years between the date and now (negative dates → 0..). */
export function carbonAge(date, now = new Date()) {
  let years = now.getUTCFullYear() - date.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() &&
      (now.getUTCDate() < date.getUTCDate() ||
        (now.getUTCDate() === date.getUTCDate() && now.getTime() % 86_400_000 < date.getTime() % 86_400_000)));
  if (beforeBirthday) years -= 1;
  return Math.abs(years);
}
