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
  let res;
  try {
    res = await fetch(`${API_ORIGIN}/api/login`, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: JSON.stringify({ username: body.username, password: body.password }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error('Login API unavailable:', err.name);
    return NextResponse.json({ error: 'Login service is unavailable. Please try again shortly.' }, { status: 503 });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) return NextResponse.json(data ?? { error: 'Login failed. Please try again.' }, { status: res.status });
  if (!data?.token) {
    console.error('Login API returned no token');
    return NextResponse.json({ error: 'Invalid login response. Please contact support.' }, { status: 502 });
  }


  let claims;
  try {
    claims = decodeJwt(data.token);
  } catch {
    console.error('Login API returned an invalid token');
    return NextResponse.json({ error: 'Invalid login response. Please contact support.' }, { status: 502 });
  }
  const decodable = legacyDecodable(data.token);
  const stored = decodable && claims.email_verified_at != null;
  const response = NextResponse.json({ claims: publicClaims(claims), legacyDecodable: decodable, stored });
  if (stored) response.cookies.set(TOKEN_COOKIE, data.token, cookieOptions());
  return response;
}

export async function GET() {
  const token = await getToken();
  const claims = await readClaims(token);
  // Not logged in is a normal state for the public site, not an error.
  if (!claims) return NextResponse.json({ claims: null });


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
  const revoke = new URL(request.url).searchParams.get('revoke') !== '0';
  if (token && revoke) {
    await fetch(`${API_ORIGIN}/api/logout?token=${encodeURIComponent(token)}`, { method: 'POST', headers: forwardHeaders(request) }).catch(() => {});
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}
