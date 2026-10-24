// Session endpoint of the BFF.
//   POST   {username, password} → API /api/login; stores the JWT in an httpOnly cookie
//   GET    → current claims (role_id, email, username, application_number, …) or 401
//   DELETE → API /api/logout and cookie removal
// Login response bodies are passed through unchanged except that the token is
// replaced by its public claims.
import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { API_ORIGIN, TOKEN_COOKIE } from '@/lib/config';
import { cookieOptions, getToken, legacyDecodable, publicClaims, readClaims } from '@/lib/server/session';

const forwardHeaders = (request) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': request.headers.get('user-agent') ?? '',
  'X-Forwarded-For': request.headers.get('x-forwarded-for') ?? '',
});

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${API_ORIGIN}/api/login`, {
    method: 'POST',
    headers: forwardHeaders(request),
    body: JSON.stringify({ username: body.username, password: body.password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json({ claims: publicClaims(decodeJwt(data.token)), legacyDecodable: legacyDecodable(data.token) });
  response.cookies.set(TOKEN_COOKIE, data.token, cookieOptions());
  return response;
}

export async function GET() {
  const token = await getToken();
  const claims = await readClaims(token);
  // Not logged in is a normal state for the public site, not an error.
  if (!claims) return NextResponse.json({ claims: null });

  // Same check the Angular app ran on start-up (verifyUserLoggedIn): the API
  // confirms the token (signature, expiry, api_tokens row).
  const res = await fetch(`${API_ORIGIN}/api/verifyUserLoggedIn?token=${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const data = await res.json().catch(() => null);
  if (data?.message !== 'Success') {
    const response = NextResponse.json({ claims: null, reason: data?.reason ?? null });
    response.cookies.delete(TOKEN_COOKIE);
    return response;
  }
  return NextResponse.json({ claims: publicClaims(claims), legacyDecodable: legacyDecodable(token) });
}

export async function DELETE(request) {
  const token = await getToken();
  if (token) {
    await fetch(`${API_ORIGIN}/api/logout?token=${encodeURIComponent(token)}`, { method: 'POST', headers: forwardHeaders(request) }).catch(() => {});
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}
