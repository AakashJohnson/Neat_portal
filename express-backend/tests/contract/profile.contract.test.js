// PRF — profile (me/*), sessions, and remaining course actions: Laravel parity.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import request from 'supertest';
import { nodeApp } from '../helpers/contract.js';

const ADMIN = 'neatadmin@aicte-india.org';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
let reference;
let learner;
let snapshot;

beforeAll(async () => {
  reference = await laravelAvailable();
  learner = await db('users').where('id', 72).first();
  snapshot = { ...learner };
});
afterAll(async () => {
  const { id, ...rest } = snapshot;
  await db('users').where('id', id).update(rest);
});

const mask = (b) => (b && typeof b === 'object' ? JSON.parse(JSON.stringify(b).replace(/https?:\/\/[^/"]+/g, 'http://HOST').replace(/"(last_login|updated_at)":"[^"]*"/g, '"$1":"<t>"')) : b);
async function asLearner(method, path, opts = {}) {
  const lt = await fixtureToken(callLaravel, learner.email);
  const nt = await fixtureToken(callNode, learner.email);
  return [
    await callLaravel(method, path, { ...opts, query: { ...(opts.query ?? {}), token: lt } }),
    await callNode(method, path, { ...opts, query: { ...(opts.query ?? {}), token: nt } }),
  ];
}
const same = ([l, n]) => {
  expect(n.status).toBe(l.status);
  expect(mask(n.body)).toEqual(mask(l.body));
};

describe('PRF me/details', () => {
  it('PATCH /api/me/details (invalid birthday, valid update)', async ({ skip }) => {
    if (!reference) skip();
    same(await asLearner('PATCH', '/api/me/details', { body: { birthday: 'not-a-date' } }));
    same(await asLearner('PATCH', '/api/me/details', { body: { last_name: 'Contract', address: 'Addr 1', birthday: '1999-09-09' } }));
    expect(await db('users').where('id', 72).first('last_name', 'birthday')).toEqual({ last_name: 'Contract', birthday: '1999-09-09' });
  });

  it('PATCH /api/me/details/auth (validation; password change is single-hashed and works on both)', async ({ skip }) => {
    if (!reference) skip();
    same(await asLearner('PATCH', '/api/me/details/auth', { body: {} }));
    same(await asLearner('PATCH', '/api/me/details/auth', { body: { email: learner.email, password: 'short', password_confirmation: 'short' } }));
    const nt = await fixtureToken(callNode, learner.email);
    const res = await callNode('PATCH', '/api/me/details/auth', { query: { token: nt }, body: { email: learner.email, password: 'Changed#123', password_confirmation: 'Changed#123' } });
    expect(res.status).toBe(200);
    for (const call of [callLaravel, callNode]) {
      expect((await call('POST', '/api/login', { body: { username: learner.email, password: 'Changed#123' } })).status).toBe(200);
    }
    await db('users').where('id', 72).update({ password: snapshot.password });
  });
});

describe('PRF avatar', () => {
  it('external URL, upload (160×160 crop stored under upload/users), delete', async ({ skip }) => {
    if (!reference) skip();
    same(await asLearner('PUT', '/api/me/avatar/external', { body: {} }));
    same(await asLearner('PUT', '/api/me/avatar/external', { body: { url: 'https://example.com/a.png' } }));

    const nt = await fixtureToken(callNode, learner.email);
    const up = await request(nodeApp()).put('/api/me/avatar').query({ token: nt }).attach('file', PNG, 'a.png');
    expect(up.status).toBe(200);
    expect(up.body.avatar).toMatch(/\/upload\/users\/[0-9a-f]{40}\.png$/);
    const served = await request(nodeApp()).get(new URL(up.body.avatar).pathname);
    expect(served.status).toBe(200);

    same(await asLearner('DELETE', '/api/me/avatar'));
  });
});

describe('PRF sessions', () => {
  it('me/sessions and sessions/{id} (show, unknown, delete)', async ({ skip }) => {
    if (!reference) skip();
    // Laravel writes a sessions row on every request (DEV-02), so the Laravel call
    // itself adds rows Node then also lists: every Laravel entry must appear unchanged.
    const [ls, ns] = await asLearner('GET', '/api/me/sessions');
    expect(ns.status).toBe(ls.status);
    const byId = new Map(ns.body.map((s) => [s.id, s]));
    for (const s of ls.body) expect(byId.get(s.id)).toEqual(s);
    same(await asLearner('GET', '/api/sessions/does-not-exist'));
    await db('sessions').insert({ id: 'contract-session-1', user_id: 72, ip_address: '127.0.0.1', user_agent: 'node', payload: 'x', last_activity: Math.floor(Date.now() / 1000) });
    same(await asLearner('GET', '/api/sessions/contract-session-1'));
    const nt = await fixtureToken(callNode, learner.email);
    expect((await callNode('DELETE', '/api/sessions/contract-session-1', { query: { token: nt } })).body).toEqual({ success: true });
    expect(await db('sessions').where('id', 'contract-session-1').first()).toBeUndefined();
  });

  it("another user's session is forbidden without users.manage", async ({ skip }) => {
    if (!reference) skip();
    await db('sessions').insert({ id: 'contract-session-2', user_id: 1, ip_address: '127.0.0.1', user_agent: 'node', payload: 'x', last_activity: Math.floor(Date.now() / 1000) });
    same(await asLearner('GET', '/api/sessions/contract-session-2'));
    await db('sessions').where('id', 'contract-session-2').delete();
  });
});

describe('PRF remaining course actions', () => {
  it('getAppliedStudents / editProductDetails', async ({ skip }) => {
    if (!reference) skip();
    const product = await db('product_details').first('code', 'isDetailsSubmitted');
    const lt = await fixtureToken(callLaravel, ADMIN);
    const nt = await fixtureToken(callNode, ADMIN);
    for (const body of [{ code: product.code }, {}]) {
      const l = await callLaravel('POST', '/api/getAppliedStudents', { query: { token: lt }, body });
      const n = await callNode('POST', '/api/getAppliedStudents', { query: { token: nt }, body });
      expect(n.body).toEqual(l.body);
    }
    const l = await callLaravel('POST', '/api/editProductDetails', { query: { token: lt }, body: { code: product.code } });
    const n = await callNode('POST', '/api/editProductDetails', { query: { token: nt }, body: { code: product.code } });
    expect(n.body).toEqual(l.body);
    await db('product_details').where('code', product.code).update({ isDetailsSubmitted: product.isDetailsSubmitted });
  });

  it('register/verify-email/{token} fails like the original (R-24)', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await Promise.all([callLaravel('POST', '/api/register/verify-email/abc'), callNode('POST', '/api/register/verify-email/abc')]);
    expect(n.status).toBe(l.status);
  });
});
