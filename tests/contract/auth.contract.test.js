// AUTH-01 login / AUTH-02 logout — contract parity with Laravel Api\Auth\AuthController.
import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { callLaravel, callNode, normalise, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';

const ADMIN = 'neatadmin@aicte-india.org';
let reference;

beforeAll(async () => {
  reference = await laravelAvailable();
});

const both = async (method, path, opts) => {
  const [l, n] = await Promise.all([callLaravel(method, path, opts), callNode(method, path, opts)]);
  return { l, n };
};

describe('AUTH-01 POST /api/login', () => {
  const cases = [
    ['missing both fields', {}],
    ['missing password', { username: 'someone' }],
    ['unknown user', { username: 'no-such-user@example.invalid', password: 'x' }],
    ['wrong password', { username: ADMIN, password: 'definitely-wrong' }],
  ];

  for (const [name, body] of cases) {
    it(`matches Laravel: ${name}`, async ({ skip }) => {
      if (!reference) skip();
      const { l, n } = await both('POST', '/api/login', { body });
      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
    });
  }

  it('matches Laravel: valid credentials (token claims, order and types)', async ({ skip }) => {
    if (!reference) skip();
    const body = { username: ADMIN, password: process.env.FIXTURE_PASSWORD };
    const l = await callLaravel('POST', '/api/login', { body });
    const n = await callNode('POST', '/api/login', { body });
    expect(n.status).toBe(200);
    expect(normalise(n.body)).toEqual(normalise(l.body));

    const lp = jwt.decode(l.body.token);
    const np = jwt.decode(n.body.token);
    for (const k of ['prv', 'user_id', 'email', 'role_id', 'application_number', 'username', 'phone', 'email_verified_at', 'sub']) {
      expect(np[k]).toStrictEqual(lp[k]);
    }
    expect(np.exp - np.iat).toBe(lp.exp - lp.iat);
    expect(np.iss.endsWith('/api/login')).toBe(true);
    expect(np.jti).toHaveLength(40);
  });

  it('login by username behaves like Laravel', async ({ skip }) => {
    if (!reference) skip();
    const body = { username: 'admin', password: process.env.FIXTURE_PASSWORD };
    const { l, n } = await both('POST', '/api/login', { body });
    expect(n.status).toBe(l.status);
    expect(normalise(n.body)).toEqual(normalise(l.body));
  });

  it('institute token carries permanent_institute_id before phone (role 5)', async () => {
    const inst = await db('users').where('id', 56).first('email');
    const token = await fixtureToken(callNode, inst.email);
    const keys = Object.keys(jwt.decode(token));
    expect(keys.slice(-2)).toEqual(['permanent_institute_id', 'phone']);
  });

  it('refreshes users.unique_uuid and records last_login + "Logged in." activity', async () => {
    const before = await db('users').where('email', ADMIN).first('unique_uuid', 'id');
    const token = await fixtureToken(callNode, ADMIN);
    const after = await db('users').where('email', ADMIN).first('unique_uuid', 'last_login');
    expect(after.unique_uuid).not.toBe(before.unique_uuid);
    expect(jwt.decode(token).uuid).toBe(after.unique_uuid);
    const act = await db('user_activity').where('user_id', before.id).orderBy('id', 'desc').first();
    expect(act.description).toBe('Logged in.');
  });

  it('tokens are cross-compatible: Laravel accepts a Node-issued token', async ({ skip }) => {
    if (!reference) skip();
    const token = await fixtureToken(callNode, ADMIN);
    const l = await callLaravel('GET', '/api/verifyUserLoggedIn', { query: { token } });
    expect(l.body).toEqual({ message: 'Success' });
  });

  it('tokens are cross-compatible: Node accepts a Laravel-issued token', async ({ skip }) => {
    if (!reference) skip();
    const token = await fixtureToken(callLaravel, ADMIN);
    const n = await callNode('GET', '/api/verifyUserLoggedIn', { query: { token } });
    expect(n.body).toEqual({ message: 'Success' });
    const me = await callNode('GET', '/api/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(ADMIN);
  });
});

describe('AUTH-02 POST /api/logout', () => {
  it('matches Laravel without a token (plain-text 401)', async ({ skip }) => {
    if (!reference) skip();
    const { l, n } = await both('POST', '/api/logout');
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
    expect(n.contentType).toMatch(/text\/html/);
  });

  it('invalidates the token (api_tokens row removed) and returns {"success":true}', async () => {
    const token = await fixtureToken(callNode, ADMIN);
    const { jti } = jwt.decode(token);
    const res = await callNode('POST', '/api/logout', { query: { token } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(await db('api_tokens').where('id', jti).first()).toBeUndefined();
    const again = await callNode('POST', '/api/logout', { query: { token } });
    expect(again.status).toBe(401);
  });

  it('Laravel logout of a Node token has the same effect', async ({ skip }) => {
    if (!reference) skip();
    const token = await fixtureToken(callNode, ADMIN);
    const l = await callLaravel('POST', '/api/logout', { query: { token } });
    expect(l.status).toBe(200);
    expect(l.body).toEqual({ success: true });
  });
});
