import { randomBytes } from 'node:crypto';

const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Equivalent of Laravel Str::random($length): cryptographically random [A-Za-z0-9]. */
export function strRandom(length = 16) {
  let out = '';
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      // 248 = 62 * 4: rejection sampling keeps the distribution uniform.
      if (byte < 248) out += ALPHANUM[byte % 62];
      if (out.length === length) break;
    }
  }
  return out;
}

/**
 * Approximation of Laravel 6's `email` validation rule (egulias RFCValidation).
 * Used where Laravel decided between email and username login.
 */
export function isEmail(value) {
  return typeof value === 'string' && /^[^\s@"(),:;<>[\\\]]+@[^\s@"(),:;<>[\\\]]+$/.test(value) && !value.includes('..');
}

/** PHP empty(): null, undefined, '', '0', 0, false, [] and {} are empty. */
export function phpEmpty(value) {
  if (value === null || value === undefined || value === false) return true;
  if (value === '' || value === '0' || value === 0) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}
