export function clientIp(req) {
  const ip = req.ip ?? req.socket?.remoteAddress ?? '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}


export function requestUrl(req) {
  return `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path === '/' && req.baseUrl ? '' : req.path}`;
}


export const requestAll = (req) => ({ ...req.query, ...(req.body && typeof req.body === 'object' ? req.body : {}) });


export function input(req, ...keys) {
  const all = requestAll(req);
  return Object.fromEntries(keys.map((k) => [k, all[k] ?? null]));
}
