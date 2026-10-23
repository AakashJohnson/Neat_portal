'use client';
// Browser API client — replaces the 13 Angular services' HttpClient calls.
// All requests go to the same-origin BFF (/bff/*), which attaches the JWT.

/**
 * Parsed response: JSON when possible, otherwise text ('' for Laravel's empty
 * 200 responses). Never throws for HTTP status — callers inspect `status`/`data`
 * exactly like the Angular code inspected `data['message']`.
 * @returns {Promise<{ status: number, ok: boolean, data: any }>}
 */
async function request(method, path, { params, body } = {}) {
  const url = new URL(`/bff${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const init = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : '';
  } catch {
    /* plain-text responses (e.g. "Unauthorized.") */
  }
  return { status: res.status, ok: res.ok, data };
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body, params) => request('POST', path, { body, params }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
  /** Binary download (Blob) through the BFF. */
  async blob(path, params) {
    const url = new URL(`/bff${path}`, window.location.origin);
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));
    const res = await fetch(url, { credentials: 'same-origin' });
    return { status: res.status, ok: res.ok, blob: await res.blob() };
  },
};
