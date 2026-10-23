// Contract-test helpers: send the same request to the Laravel reference
// (LARAVEL_REFERENCE_URL, running on neat_portal_test) and to the Express app,
// then compare normalised responses.
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';

export const LARAVEL = process.env.LARAVEL_REFERENCE_URL ?? 'http://127.0.0.1:8001';

// The production limit (60/min) is covered by tests/unit/throttle.test.js;
// contract suites need far more requests per minute.
let app;
export const nodeApp = () => (app ??= createApp({ rateLimit: 100_000 }));

export async function laravelAvailable() {
  try {
    await fetch(`${LARAVEL}/api/getStates`, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

function buildUrl(path, query) {
  const qs = query ? new URLSearchParams(query).toString() : '';
  return qs ? `${path}?${qs}` : path;
}

const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/** Request against Laravel. */
export async function callLaravel(method, path, { query, body, headers = {} } = {}) {
  const res = await fetch(`${LARAVEL}${buildUrl(path, query)}`, {
    method,
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, contentType: res.headers.get('content-type'), body: parse(await res.text()) };
}

/** Same request against the Express app (in-process). */
export async function callNode(method, path, { query, body, headers = {} } = {}) {
  let r = request(nodeApp())[method.toLowerCase()](buildUrl(path, query)).set('Accept', 'application/json');
  for (const [k, v] of Object.entries(headers)) r = r.set(k, v);
  if (body) r = r.send(body);
  const res = await r;
  return { status: res.status, contentType: res.headers['content-type'], body: parse(res.text) };
}

/**
 * Replace values that legitimately differ between two runs (JWTs, generated
 * ids, timestamps) with placeholders so the remaining shape can be compared.
 */
export function normalise(value, volatileKeys = []) {
  if (Array.isArray(value)) return value.map((v) => normalise(v, volatileKeys));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => {
        if (k === 'token' && typeof v === 'string' && v.split('.').length === 3) {
          return [k, { jwtClaims: Object.keys(jwt.decode(v) ?? {}) }];
        }
        if (volatileKeys.includes(k)) return [k, `<${k}>`];
        return [k, normalise(v, volatileKeys)];
      }),
    );
  }
  return value;
}

/** Log in on a backend with the fixture password and return the JWT. */
export async function fixtureToken(call, email) {
  const res = await call('POST', '/api/login', { body: { username: email, password: process.env.FIXTURE_PASSWORD } });
  if (res.status !== 200) throw new Error(`fixture login failed for ${email}: ${res.status}`);
  return res.body.token;
}
