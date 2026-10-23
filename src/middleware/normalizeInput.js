// Laravel global middleware TrimStrings (except password fields) followed by
// ConvertEmptyStringsToNull, applied to query string and body recursively.
const TRIM_EXCEPT = new Set(['password', 'password_confirmation']);

function normalize(value, key) {
  if (typeof value === 'string') {
    const v = TRIM_EXCEPT.has(key) ? value : value.trim();
    return v === '' ? null : v;
  }
  if (Array.isArray(value)) return value.map((v) => normalize(v, key));
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, k)]));
  }
  return value;
}

export function normalizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = normalize(req.body);
  // Express 5 exposes req.query as a getter; redefine it with the normalised copy.
  const query = normalize({ ...req.query });
  Object.defineProperty(req, 'query', { value: query, writable: true, configurable: true, enumerable: true });
  next();
}
