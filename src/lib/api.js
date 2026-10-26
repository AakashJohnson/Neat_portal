'use client';


import { TOKEN_ENDPOINTS } from './tokenEndpoints';
import { API_DISPLAY_BASE } from './config';

const STATUS_TEXT = { 0: 'Unknown Error', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 422: 'Unprocessable Entity', 429: 'Too Many Requests', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout' };

export function apiErrorMessage(res) {
  const data = res?.data;
  if (data?.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().join(' ');
  if (typeof data?.reason === 'string') return data.reason;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string' && data.message !== 'Error') return data.message;
  if (res?.status === 429) return 'Too many requests. Please wait a minute and try again.';
  return 'Unable to complete the request. Please try again or contact support.';
}


export function httpErrorResponse(res) {
  const status = res?.status ?? 0;
  let url = '(unknown url)';
  if (res?.url) {
    const u = new URL(res.url);
    url = `${API_DISPLAY_BASE}${u.pathname.replace(/^\/bff/, '')}${u.search}`.replace(/([?&]token=)[^&]*/, '$1…');
  }
  return {
    status,
    error: res?.json ? (res.data === '' ? null : res.data) : (res?.data ?? null),
    message: `Http failure response for ${url}: ${status} ${STATUS_TEXT[status] ?? 'Unknown Error'}`,
  };
}

function bffUrl(path, params) {
  const url = new URL(`/bff${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);

  if (TOKEN_ENDPOINTS.has(path.replace(/^\//, '').split(/[/?]/)[0])) url.searchParams.set('token', '');
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  return url;
}

/**
 * Parse JSON when possible, otherwise return text. Callers inspect status/data.
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
  return { status: res.status, ok: res.ok, data, json, url: url.toString() };
}

/**
 * Dispatch successful JSON responses to next; failures go to the error callback.
 * Empty responses are delivered as null. Callback exceptions are logged.
 * @param {Promise<{ ok: boolean, data: any, json: boolean }>} request
 * @param {(data: any) => void} next
 * @param {(res: object) => void} [error]
 */
export async function subscribe(request, next, error) {
  const res = await request.catch((e) => ({ ok: false, status: 0, data: null, json: false, networkError: e }));
  if (!res.ok || !res.json) {
    try {
      error?.(res);
    } catch (e) {
      console.error(e);
    }
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
