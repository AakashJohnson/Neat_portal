// Route protection (Next.js 16 "proxy", formerly middleware) — replaces the
// Angular AfterLoginService / BeforeLoginService guards and the role checks in
// the admin/student/company/institute/learner shell components. This is an
// optimistic check; the API authorises every call itself.
import { NextResponse } from 'next/server';
import { jwtVerify, decodeJwt } from 'jose';

const TOKEN_COOKIE = 'neat_token';

// Area → required role_id (Angular shells: admin 1, student 3, company 4,
// institute 5). The learner shell had no role check; it is enforced here (role 6).
const AREAS = [
  ['/admin', 1],
  ['/student', 3],
  ['/company', 4],
  ['/institute', 5],
  ['/learner', 6],
];

// Pages under BeforeLoginService: only for visitors who are not logged in.
const GUEST_ONLY = ['/verify-email', '/verify-otp', '/request-password-reset', '/response-password-reset', '/signup'];

// Children of guarded shells that had no guard in Angular.
const PUBLIC_CHILDREN = ['/student/paid-Products-details-checkout', '/student/free-Products-details-checkout'];

async function claimsOf(request) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    if (process.env.NEAT_JWT_SECRET) {
      return (await jwtVerify(token, new TextEncoder().encode(process.env.NEAT_JWT_SECRET), { algorithms: ['HS256'] })).payload;
    }
    const c = decodeJwt(token);
    return c.exp * 1000 > Date.now() ? c : null;
  } catch {
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const claims = await claimsOf(request);

  if (GUEST_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return claims ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (PUBLIC_CHILDREN.includes(pathname)) return NextResponse.next();

  const area = AREAS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (area) {
    if (!claims) {
      const login = new URL('/login', request.url);
      return NextResponse.redirect(login);
    }
    if (Number(claims.role_id) !== area[1]) {
      // Angular called logout() on a role mismatch.
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.delete(TOKEN_COOKIE);
      return res;
    }
  }
  // /payment-redirect required login (AfterLoginService).
  if (pathname === '/payment-redirect' && !claims) return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|bff|api|legacy|assets|assets_new|favicon.ico).*)'],
};
