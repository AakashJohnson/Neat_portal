// active-users (ActiveUsersController@index, auth + users.manage): a Vanguard
// stub that answers a plain-text greeting, kept for route parity.
import { NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/config';
import { getToken } from '@/lib/server/session';

export async function GET(request) {
  const token = await getToken();
  const res = token ? await fetch(`${API_ORIGIN}/api/panel/context`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }) : null;
  if (!res?.ok) return NextResponse.redirect(new URL('/panel/login', request.url));
  const ctx = await res.json();
  if (!ctx.permissions?.includes('users.manage')) return new NextResponse('Forbidden', { status: 403 });
  return new NextResponse('Hello from ActiveUsersController', { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
}
