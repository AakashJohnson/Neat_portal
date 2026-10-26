import { NextResponse } from 'next/server';
import { jwtVerify, decodeJwt } from 'jose';

const TOKEN_COOKIE = 'neat_token';

const p = (s) => new RegExp(`^${s.replace(/:[^/]+/g, '[^/]+')}/?$`);

// Shell → required role_id and its routed children (all under AfterLoginService).
const AREAS = [
  { role: 1, paths: ['/admin', '/admin/dashboard', '/admin/courses', '/admin/registered-student', '/admin/registered-institute', '/admin/registered-company', '/admin/registered-learner', '/admin/mou-management', '/admin/products-management', '/admin/reports', '/admin/free-seat-allocation', '/admin/free-seat-student', '/admin/company-preview/:id'] },
  { role: 3, paths: ['/student', '/student/profile', '/student/paid-Products-details-checkout', '/student/free-Products-details-checkout', '/student/platform', '/student/free-course-details/:id', '/student/free-seat-verification'] },
  { role: 4, paths: ['/company', '/company/form/:id', '/company/company-details', '/company/products', '/company/home', '/company/verification'] },
  { role: 5, paths: ['/institute', '/institute/institute-details', '/institute/file-upload', '/institute/student-details'] },
  // LearnerComponent had no role check (any logged-in user).
  { role: null, paths: ['/learner', '/learner/learner-paid-course', '/learner/learner-free-course'] },
].map((a) => ({ ...a, re: a.paths.map(p) }));

// AfterLoginService outside the shells.
const LOGIN_REQUIRED = ['/payment-redirect'].map(p);
// BeforeLoginService.
const GUEST_ONLY = ['/verify-email', '/verify-otp', '/request-password-reset', '/response-password-reset', '/signup'].map(p);

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
  const matches = (list) => list.some((re) => re.test(pathname));
  const area = AREAS.find((a) => matches(a.re));
  const guest = matches(GUEST_ONLY);
  if (!area && !guest && !matches(LOGIN_REQUIRED)) return NextResponse.next();

  const claims = await claimsOf(request);
  if (guest) return claims ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  if (!claims) return NextResponse.redirect(new URL('/login', request.url));
  if (area && area.role !== null && Number(claims.role_id) !== area.role) {
    // The shells called logout() on a role mismatch.
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(TOKEN_COOKIE);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|bff|api|theme|assets|assets_new|favicon.ico).*)'],
};
