export class PhpError extends Error {}

/** PHP ucfirst() (C locale): only an ASCII a-z first byte is upper-cased. */
export const phpUcfirst = (s) => (typeof s === 'string' && /^[a-z]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s);

/** `$obj->name` on null: "Trying to get property 'name' of non-object". */
export function prop(obj, name) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    throw new PhpError(`Trying to get property '${name}' of non-object`);
  }
  return obj[name];
}


export function idx(value, key) {
  if (value === null || value === undefined) throw new PhpError('Trying to access array offset on value of type null');
  if (typeof value === 'string') throw new PhpError(`Illegal string offset '${key}'`);
  if (typeof value === 'boolean') throw new PhpError('Trying to access array offset on value of type bool');
  if (typeof value === 'number') throw new PhpError(`Trying to access array offset on value of type ${Number.isInteger(value) ? 'int' : 'float'}`);
  if (!(key in value)) throw new PhpError(`Undefined index: ${key}`);
  return value[key];
}

/** `'text' . $array` → "Array to string conversion" notice. */
export function strOf(value) {
  if (value !== null && typeof value === 'object') throw new PhpError('Array to string conversion');
  return phpConcat(value);
}

/** `$array[0]` on a missing offset: "Undefined offset: 0". */
export function offset(arr, i) {
  if (!Array.isArray(arr) || i >= arr.length) throw new PhpError(`Undefined offset: ${i}`);
  return arr[i];
}

/**
 * PHP numeric coercion for arithmetic (int|float|numeric-string|null|bool).
 * Throws exactly where PHP 7.4 emitted a warning/notice.
 */
export function toPhpNumber(value) {
  if (value === null || value === undefined || value === false) return 0;
  if (value === true) return 1;
  if (typeof value === 'number') return value;
  const s = String(value);
  if (/^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/.test(s)) return Number(s);
  const leading = s.match(/^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/);
  if (leading) throw new PhpError('A non well formed numeric value encountered');
  throw new PhpError('A non-numeric value encountered');
}

/** `$a * $b` */
export const phpMultiply = (a, b) => toPhpNumber(a) * toPhpNumber(b);

/**
 * PHP string conversion of a number (`'x' . $n`, precision=14): integers print
 * without decimals, floats with up to 14 significant digits ("%.14G").
 */
export function phpNumberToString(n) {
  if (typeof n !== 'number') return String(n ?? '');
  if (Number.isNaN(n)) return 'NAN';
  if (!Number.isFinite(n)) return n > 0 ? 'INF' : '-INF';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const p = Number(n.toPrecision(14));
  const exp = Math.floor(Math.log10(Math.abs(p)));
  if (exp < -5 || exp >= 15) {
    // %.14G exponent form, e.g. 1.0E+25
    const [m, e] = p.toExponential().split('e');
    const mantissa = m.includes('.') ? m : `${m}.0`;
    return `${mantissa}E${e.startsWith('-') ? '-' : '+'}${e.replace(/^[+-]/, '')}`;
  }
  return String(p);
}

/** PHP `.` concatenation of mixed scalars (null → '', true → '1', false → ''). */
export function phpConcat(...parts) {
  return parts
    .map((p) => (p === null || p === undefined || p === false ? '' : p === true ? '1' : typeof p === 'number' ? phpNumberToString(p) : String(p)))
    .join('');
}

/** PHP loose comparison `$a == $b` for scalar values (PHP 7 rules). */
export function looseEq(a, b) {
  if (a === null || a === undefined) a = null;
  if (b === null || b === undefined) b = null;
  if (a === b) return true;
  if (a === null || b === null) {
    const other = a === null ? b : a;
    return other === '' || other === false || other === 0 || other === '0' ? other !== '0' : false;
  }
  const numA = typeof a === 'number' || (typeof a === 'string' && isNumericStr(a));
  const numB = typeof b === 'number' || (typeof b === 'string' && isNumericStr(b));
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a === '0' ? 0 : a) === Boolean(b === '0' ? 0 : b);
  if (numA && numB) return Number(a) === Number(b);
  // PHP 7 (not 8): number vs non-numeric string casts the string to a number
  // using its leading numeric part ("12abc" → 12, "abc" → 0).
  if (typeof a === 'number' && typeof b === 'string') return a === leadingNumber(b);
  if (typeof b === 'number' && typeof a === 'string') return b === leadingNumber(a);
  return String(a) === String(b);
}

const isNumericStr = (s) => /^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/.test(s);
const leadingNumber = (s) => {
  const m = s.match(/^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/);
  return m ? Number(m[0]) : 0;
};
