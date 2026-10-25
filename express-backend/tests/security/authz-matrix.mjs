// Authorisation matrix: every Laravel API route × caller (anonymous, student,
// admin), status on Laravel (reference, neat_portal_test) vs Express. GET for
// all callers, POST (empty body) for anonymous and student only; PUT/PATCH/
// DELETE are skipped (they would act on real ids). A route that Express serves
// to a caller Laravel refused is a regression; the reverse is expected where a
// deviation hardens the endpoint (DEV-08/09/10/15, SEC-*).
//   node tests/security/authz-matrix.mjs > matrix.json
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';

if (process.env.DB_DATABASE !== 'neat_portal_test') throw new Error('refusing: test database only');
const LARAVEL = process.env.LARAVEL_REFERENCE_URL ?? 'http://127.0.0.1:8001';
const NODE = process.env.NODE_URL ?? 'http://localhost:4000';
const routes = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../../../migration-docs/generated/api-routes.json'), 'utf8')).routes;
const FIXTURE = Object.fromEntries(process.env.FIXTURE_USERS.split(',').map((x) => x.split(':')));
const { default: knex } = await import('knex');
const db = knex({ client: 'mysql2', connection: { host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE } });
const email = async (role) => (await db('users').where('id', FIXTURE[role]).first('email')).email;

async function token(base, role) {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: await email(role), password: process.env.FIXTURE_PASSWORD }) });
  return (await r.json()).token;
}
const tokens = { laravel: { anonymous: null, student: await token(LARAVEL, 'student'), admin: await token(LARAVEL, 'admin') }, node: { anonymous: null, student: await token(NODE, 'student'), admin: await token(NODE, 'admin') } };

async function call(base, method, p, tok) {
  const url = new URL(base + p.replace(/\{[^}]+\}/g, '1'));
  if (tok) url.searchParams.set('token', tok);
  try {
    const r = await fetch(url, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: method === 'POST' ? '{}' : undefined, redirect: 'manual', signal: AbortSignal.timeout(30000) });
    return r.status;
  } catch (e) {
    return `ERR ${e.name}`;
  }
}

// Side effects on the callers themselves: logout invalidates the token, the
// edit*Details routes delete the caller's profile row (re-opening the form).
const SKIP = new Set(['/api/logout', '/api/editStudentDetails', '/api/editInstituteDetails', '/api/editLearnerDetails', '/api/editProductDetails']);

const cls = (s) => (typeof s !== 'number' ? s : s < 300 ? 'allow' : s === 401 || s === 403 ? 'deny' : s === 404 || s === 405 ? 'absent' : s === 422 ? 'invalid' : s === 429 ? 'throttled' : 'error');
const rows = [];
for (const r of routes) {
  if (SKIP.has(r.path)) continue;
  for (const method of r.method.split('|')) {
    if (!['GET', 'POST'].includes(method)) continue;
    for (const caller of method === 'GET' ? ['anonymous', 'student', 'admin'] : ['anonymous', 'student']) {
      const l = await call(LARAVEL, method, r.path, tokens.laravel[caller]);
      const n = await call(NODE, method, r.path, tokens.node[caller]);
      const verdict = cls(l) === cls(n) ? 'same' : cls(n) === 'allow' && cls(l) !== 'allow' ? 'REGRESSION' : cls(l) === 'allow' && cls(n) === 'deny' ? 'hardened' : 'differs';
      rows.push({ id: r.id, method, path: r.path, caller, laravel: l, node: n, verdict });
    }
  }
}
await db.destroy();
const summary = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] ?? 0) + 1), a), {});
console.log(JSON.stringify({ summary, rows }, null, 1));
