// Backend-for-frontend proxy: /bff/<endpoint> → <API>/api/<endpoint>.
// Adds the JWT from the httpOnly cookie both as "Authorization: Bearer" and as
// ?token= (the Angular contract; some endpoints read $request->token). Bodies
// (JSON, form data, multipart uploads) are streamed through unchanged.
import { API_ORIGIN } from '@/lib/config';
import { getToken } from '@/lib/server/session';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer', 'upgrade', 'host', 'cookie', 'authorization', 'content-length']);

async function proxy(request, { params }) {
  const { path } = await params;
  const incoming = new URL(request.url);
  const target = new URL(`${API_ORIGIN}/api/${path.map(encodeURIComponent).join('/')}`);
  incoming.searchParams.forEach((v, k) => {
    if (k !== 'token') target.searchParams.append(k, v);
  });

  const token = await getToken();
  const headers = new Headers();
  request.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers.set(k, v);
  });
  headers.set('Accept', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    target.searchParams.set('token', token);
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const res = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? 'half' : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  const out = new Headers();
  for (const name of ['content-type', 'content-disposition', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'retry-after']) {
    const v = res.headers.get(name);
    if (v) out.set(name, v);
  }
  return new Response(res.body, { status: res.status, headers: out });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
