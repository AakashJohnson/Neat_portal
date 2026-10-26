import { NextResponse } from 'next/server';
import { API_ORIGIN, TOKEN_COOKIE } from '@/lib/config';
import { cookieOptions, getToken } from '@/lib/server/session';

async function swap(request, path) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'User-Agent': request.headers.get('user-agent') ?? '' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) return NextResponse.json(data, { status: res.status });
  const response = NextResponse.json({ success: true });
  response.cookies.set(TOKEN_COOKIE, data.token, cookieOptions());
  return response;
}

export async function POST(request) {
  const { user } = await request.json().catch(() => ({}));
  return swap(request, `/panel/impersonate/${encodeURIComponent(user)}`);
}

export const DELETE = (request) => swap(request, '/panel/impersonate/leave');
