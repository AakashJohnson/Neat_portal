/** Laravel $request->ip(): plain IPv4 for IPv4-mapped IPv6 addresses. */
export function clientIp(req) {
  const ip = req.ip ?? req.socket?.remoteAddress ?? '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/** Laravel $request->url(): scheme://host/path without the query string. */
export function requestUrl(req) {
  return `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path === '/' && req.baseUrl ? '' : req.path}`;
}

/** Laravel $request->all(): query string merged with the body (body wins). */
export const requestAll = (req) => ({ ...req.query, ...(req.body && typeof req.body === 'object' ? req.body : {}) });

/**
 * Laravel `$request->name` for several keys: missing input is null (never
 * undefined), so query-builder calls behave like Eloquent (`col IS NULL`).
 */
export function input(req, ...keys) {
  const all = requestAll(req);
  return Object.fromEntries(keys.map((k) => [k, all[k] ?? null]));
}
