'use client';
// API client of the admin panel (port of the Laravel web/Blade panel). Every
// panel request is authenticated, so the BFF is always asked to attach the
// session JWT (`token` parameter); bodies are JSON or FormData.
//   const { status, ok, data } = await panelApi.get('/users', { search, page });

async function call(method, path, { params, body } = {}) {
  const url = new URL(`/bff${path}`, window.location.origin);
  url.searchParams.set('token', '');
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const init = { method, headers: { Accept: 'application/json' } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body (e.g. an empty 204) stays text
  }
  return { status: res.status, ok: res.ok, data };
}

export const panelApi = {
  get: (path, params) => call('GET', path, { params }),
  post: (path, body, params) => call('POST', path, { body, params }),
  put: (path, body) => call('PUT', path, { body }),
  patch: (path, body) => call('PATCH', path, { body }),
  delete: (path) => call('DELETE', path),
};

/** Laravel 422 body → flat list of messages (as $errors->all()). */
export const validationMessages = (data) => (data?.errors ? Object.values(data.errors).flat() : data?.message ? [data.message] : []);
