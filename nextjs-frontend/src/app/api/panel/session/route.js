// Panel (Laravel web) session of the BFF.
//   POST   {username, password, remember, to} → API /api/panel/login (web login
//          rules); the JWT goes to the httpOnly cookie, also for unverified
//          users (the panel's `verified` middleware shows the notice).
//   DELETE → API /api/logout ("Logged out." activity, token invalidated) and
//          cookie removal (LoginController@logout).
import { NextResponse } from 'next/server';
import { API_ORIGIN, TOKEN_COOKIE } from '@/lib/config';
import { cookieOptions, getToken } from '@/lib/server/session';

const headers = (request) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': request.headers.get('user-agent') ?? '',
  'X-Forwarded-For': request.headers.get('x-forwarded-for') ?? '',
});

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${API_ORIGIN}/api/panel/login`, { method: 'POST', headers: headers(request), body: JSON.stringify({ username: body.username, password: body.password }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) return NextResponse.json(data, { status: res.status });
  const response = NextResponse.json({ success: true, verified: data.verified });
  response.cookies.set(TOKEN_COOKIE, data.token, cookieOptions());
  return response;
}

/** POST with a token from another panel action (password reset logs the user in). */
export async function PUT(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  const check = await fetch(`${API_ORIGIN}/api/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${body.token}` }, cache: 'no-store' });
  if (!check.ok) return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(TOKEN_COOKIE, body.token, cookieOptions());
  return response;
}

export async function DELETE(request) {
  const token = await getToken();
  if (token) await fetch(`${API_ORIGIN}/api/logout?token=${encodeURIComponent(token)}`, { method: 'POST', headers: headers(request) }).catch(() => {});
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}
