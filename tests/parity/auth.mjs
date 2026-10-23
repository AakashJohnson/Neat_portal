// Logged-in parity runs: a JWT for a fixture user of neat_portal_test (roles
// and ids in express-backend/.env FIXTURE_USERS, password FIXTURE_PASSWORD),
// and browser contexts holding it the way each app does:
//   Angular: localStorage 'token' (TokenService.handle)
//   Next.js: httpOnly cookie 'neat_token' (BFF session)
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve(import.meta.dirname, '../../../express-backend/package.json'));
const env = require('dotenv').config({ path: path.resolve(import.meta.dirname, '../../../express-backend/.env'), quiet: true }).parsed;
if (env.DB_DATABASE !== 'neat_portal_test') throw new Error(`fixture logins are only allowed on neat_portal_test, not ${env.DB_DATABASE}`);
const API = process.env.PARITY_API ?? 'http://localhost:4000';

const fixtureIds = Object.fromEntries(env.FIXTURE_USERS.split(',').map((p) => p.split(':')));

async function fixtureEmail(role) {
  const knex = require('knex')({
    client: 'mysql2',
    connection: { host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USERNAME, password: env.DB_PASSWORD, database: env.DB_DATABASE },
  });
  try {
    const row = await knex('users').select('email').where('id', fixtureIds[role]).first();
    if (!row) throw new Error(`fixture user for role ${role} not found`);
    return row.email;
  } finally {
    await knex.destroy();
  }
}

/** POST /api/login on Express for the fixture user of `role`; returns the JWT. */
export async function fixtureToken(role) {
  const res = await fetch(`${API}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: await fixtureEmail(role), password: env.FIXTURE_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(`fixture login failed for ${role}: ${res.status}`);
  return data.token;
}

/** A browser context in which `base` (Angular or Next.js) is logged in with `token`. */
export async function loggedInContext(browser, base, token, options = {}) {
  const context = await browser.newContext(options);
  const url = new URL(base);
  if (url.port === '4201' || url.port === '4200') {
    await context.addInitScript((t) => window.localStorage.setItem('token', t), token);
  } else {
    await context.addCookies([{ name: 'neat_token', value: token, domain: url.hostname, path: '/', httpOnly: true, sameSite: 'Lax' }]);
  }
  return context;
}
