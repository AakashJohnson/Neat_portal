'use client';
// Browser API client — replaces the 13 Angular services' HttpClient calls.
// All requests go to the same-origin BFF (/bff/*), which attaches the JWT.
import { TOKEN_ENDPOINTS } from './tokenEndpoints';

function bffUrl(path, params) {
  const url = new URL(`/bff${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);
  // Angular sent ?token=<localStorage token> on these endpoints only (see tokenEndpoints.js).
  if (TOKEN_ENDPOINTS.has(path.replace(/^\//, '').split(/[/?]/)[0])) url.searchParams.set('token', '');
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  return url;
}

/**
 * Parsed response: JSON when possible, otherwise text ('' for Laravel's empty
 * 200 responses). Never throws for HTTP status — callers inspect `status`/`data`
 * exactly like the Angular code inspected `data['message']`.
 * @returns {Promise<{ status: number, ok: boolean, data: any, json: boolean }>}
 */
async function request(method, path, { params, body } = {}) {
  const url = bffUrl(path, params);
  const init = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data = text;
  let json = text === '';
  try {
    data = text ? JSON.parse(text) : '';
    json = true;
  } catch {
    /* plain-text responses (e.g. "Unauthorized.") */
  }
  return { status: res.status, ok: res.ok, data, json };
}

/**
 * Angular `http.get(...).subscribe(next)` semantics for a request made with `api`:
 * `next` runs only for a 2xx response whose body parsed as JSON (an empty body
 * is `null`, as HttpClient delivers it). HTTP errors and unparseable bodies
 * went to the (absent) error callback, i.e. nothing happened in the UI.
 * An exception thrown by `next` is logged, like an uncaught error in a subscriber.
 * @param {Promise<{ ok: boolean, data: any, json: boolean }>} request
 * @param {(data: any) => void} next
 * @param {(res: object) => void} [error]  only where the Angular code had an error callback
 */
export async function subscribe(request, next, error) {
  const res = await request.catch((e) => ({ ok: false, status: 0, data: null, json: false, networkError: e }));
  if (!res.ok || !res.json) {
    error?.(res);
    return;
  }
  try {
    next(res.data === '' ? null : res.data);
  } catch (e) {
    console.error(e);
  }
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  /**
   * GET with a query string concatenated like the Angular services did
   * (`'?bucket=' + bucket`): no encoding of &, +, =, and undefined/null become
   * the strings "undefined"/"null". The browser only percent-encodes what it
   * always encodes (spaces, non-ASCII) and drops a "#fragment".
   */
  getRaw: (path, rawQuery) => request('GET', `${path}?${rawQuery}`),
  post: (path, body, params) => request('POST', path, { body, params }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
  /** Binary download (Blob) through the BFF. */
  async blob(path, params) {
    const url = bffUrl(path, params);
    const res = await fetch(url, { credentials: 'same-origin' });
    return { status: res.status, ok: res.ok, blob: await res.blob() };
  },
};
