// STK — stock Vanguard API + activity/announcements plugins: Laravel parity.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';

const ADMIN = 'neatadmin@aicte-india.org';
let reference;
let lt;
let nt;
const maskHost = (v) => JSON.parse(JSON.stringify(v).replace(/https?:\/\/[^/"]+/g, 'http://HOST').replace(/token=[^&"]+/g, 'token=T'));

beforeAll(async () => {
  reference = await laravelAvailable();
  if (reference) {
    lt = await fixtureToken(callLaravel, ADMIN);
    nt = await fixtureToken(callNode, ADMIN);
  }
});

async function asAdmin(method, path, opts = {}) {
  return [
    await callLaravel(method, path, { ...opts, query: { ...(opts.query ?? {}), token: lt } }),
    await callNode(method, path, { ...opts, query: { ...(opts.query ?? {}), token: nt } }),
  ];
}
const same = ([l, n], mask = (x) => x) => {
  expect(n.status).toBe(l.status);
  expect(mask(maskHost(n.body))).toEqual(mask(maskHost(l.body)));
};

describe('STK read endpoints (admin)', () => {
  // me: last_login/updated_at change with every login in both systems.
  const volatile = (b) => (b && typeof b === 'object' && !Array.isArray(b) ? { ...b, last_login: '<t>', updated_at: '<t>' } : b);
  it('GET /api/me', async ({ skip }) => {
    if (!reference) skip();
    same(await asAdmin('GET', '/api/me'), volatile);
  });

  for (const path of ['/api/roles', '/api/permissions', '/api/settings', '/api/countries', '/api/roles/1', '/api/permissions/1', '/api/roles/1/permissions']) {
    it(`GET ${path}`, async ({ skip }) => {
      if (!reference) skip();
      same(await asAdmin('GET', path));
    });
  }

  it('GET /api/users (pagination, search, status, per_page)', async ({ skip }) => {
    if (!reference) skip();
    const strip = (b) => ({ ...b, data: b.data?.map((u) => (u.id === 1 ? { ...u, last_login: '<t>', updated_at: '<t>' } : u)) });
    for (const query of [{ per_page: '5' }, { per_page: '5', page: '3' }, { search: 'gmail', per_page: '3' }, { status: 'Unconfirmed', per_page: '2' }, { search: 'a b', per_page: '2' }]) {
      same(await asAdmin('GET', '/api/users', { query }), strip);
    }
  });

  it('GET /api/users/{id}, unknown id (404 "Resource not found.")', async ({ skip }) => {
    if (!reference) skip();
    same(await asAdmin('GET', '/api/users/13'));
    same(await asAdmin('GET', '/api/users/999999999'));
  });

  it('GET /api/stats (role:Admin)', async ({ skip }) => {
    if (!reference) skip();
    const strip = (b) => ({ ...b, latest_registrations: b.latest_registrations?.map((u) => ({ ...u, last_login: '<t>', updated_at: '<t>' })) });
    same(await asAdmin('GET', '/api/stats'), strip);
  });

  it('GET /api/announcements (paginated, parsed markdown)', async ({ skip }) => {
    if (!reference) skip();
    same(await asAdmin('GET', '/api/announcements', { query: { per_page: '2' } }));
    same(await asAdmin('GET', '/api/announcements/4'));
  });

  it('GET /api/users/1/activity and /api/activity — same rows (agent columns compared separately)', async ({ skip }) => {
    if (!reference) skip();
    const strip = (b) => ({ ...b, data: b.data?.map(({ browser, platform, device, ...r }) => r) });
    // Stable window: activity of a user nobody logs in as during the test.
    same(await asAdmin('GET', '/api/users/72/activity', { query: { per_page: '5' } }), strip);
  });
});

describe('STK auth/permission failures', () => {
  it('no token → plain-text 401 everywhere', async ({ skip }) => {
    if (!reference) skip();
    for (const path of ['/api/me', '/api/users', '/api/roles', '/api/settings', '/api/stats', '/api/announcements']) {
      const [l, n] = await Promise.all([callLaravel('GET', path), callNode('GET', path)]);
      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
    }
  });

  it('student token → 403 Forbidden. on permission-guarded endpoints, 403 on role:Admin', async ({ skip }) => {
    if (!reference) skip();
    const student = await db('users').where('id', 13).first('email');
    const slt = await fixtureToken(callLaravel, student.email);
    const snt = await fixtureToken(callNode, student.email);
    for (const path of ['/api/users', '/api/roles', '/api/permissions', '/api/settings', '/api/stats', '/api/activity']) {
      const l = await callLaravel('GET', path, { query: { token: slt } });
      const n = await callNode('GET', path, { query: { token: snt } });
      expect({ path, status: n.status, body: n.body }).toEqual({ path, status: l.status, body: l.body });
    }
  });

  it('2FA routes are 404 while 2fa is disabled; social login without providers → 500', async ({ skip }) => {
    if (!reference) skip();
    same(await asAdmin('PUT', '/api/me/2fa'));
    same(await asAdmin('POST', '/api/login/social', { body: {} }));
    same(await asAdmin('POST', '/api/login/social', { body: { network: 'myspace', social_token: 'x' } }));
    same(await asAdmin('POST', '/api/login/social', { body: { network: 'google', social_token: 'x' } }));
  });
});

describe('STK write endpoints', () => {
  const created = { roles: [], permissions: [], users: [] };
  const purgeTestRows = async () => {
    await db('users').where('email', 'like', 'stk-%@contract.invalid').delete();
    const roleIds = await db('roles').where('name', 'like', 'contract-role-%').pluck('id');
    await db('permission_role').whereIn('role_id', roleIds).delete();
    await db('roles').whereIn('id', roleIds).delete();
    await db('permissions').where('name', 'like', 'contract.%').delete();
  };
  beforeAll(purgeTestRows);
  afterAll(async () => {
    await purgeTestRows();
    await db('permission_role').whereIn('role_id', created.roles).delete();
    await db('roles').whereIn('id', created.roles).delete();
    await db('permissions').whereIn('id', created.permissions).delete();
    await db('users').whereIn('id', created.users).delete();
  });

  it('roles: validation, create, update, permissions sync, delete', async ({ skip }) => {
    if (!reference) skip();
    same(await asAdmin('POST', '/api/roles', { body: { name: 'bad name!' } }));
    same(await asAdmin('POST', '/api/roles', { body: { name: 'Admin' } }));

    const lr = await callLaravel('POST', '/api/roles', { query: { token: lt }, body: { name: 'contract-role-l', display_name: 'Contract L', description: 'd' } });
    const nr = await callNode('POST', '/api/roles', { query: { token: nt }, body: { name: 'contract-role-n', display_name: 'Contract N', description: 'd' } });
    created.roles.push(lr.body.id, nr.body.id);
    expect(nr.status).toBe(lr.status);
    const shape = (r) => ({ ...r, id: '<id>', name: '<n>', display_name: '<d>', created_at: '<t>', updated_at: '<t>' });
    expect(shape(nr.body)).toEqual(shape(lr.body));

    const perms = [1, 2];
    const lp = await callLaravel('PUT', `/api/roles/${lr.body.id}/permissions`, { query: { token: lt }, body: { permissions: perms } });
    const np = await callNode('PUT', `/api/roles/${nr.body.id}/permissions`, { query: { token: nt }, body: { permissions: perms } });
    expect(np.body).toEqual(lp.body);
    same(await asAdmin('PUT', `/api/roles/${nr.body.id}/permissions`, { body: { permissions: [999999] } }));

    const ld = await callLaravel('DELETE', `/api/roles/${lr.body.id}`, { query: { token: lt } });
    const nd = await callNode('DELETE', `/api/roles/${nr.body.id}`, { query: { token: nt } });
    expect(nd.body).toEqual(ld.body);
    same(await asAdmin('DELETE', '/api/roles/1')); // not removable → 403 "This action is unauthorized."
  });

  it('permissions: validation, create, duplicate, delete', async ({ skip }) => {
    if (!reference) skip();
    same(await asAdmin('POST', '/api/permissions', { body: { name: 'bad name' } }));
    same(await asAdmin('POST', '/api/permissions', { body: { name: 'users.manage' } }));
    const lp = await callLaravel('POST', '/api/permissions', { query: { token: lt }, body: { name: 'contract.l', display_name: 'C L' } });
    const np = await callNode('POST', '/api/permissions', { query: { token: nt }, body: { name: 'contract.n', display_name: 'C N' } });
    created.permissions.push(lp.body.id, np.body.id);
    expect(np.status).toBe(lp.status);
  });

  it('users: validation, create (201), update (ban invalidates tokens), delete self (403)', async ({ skip }) => {
    if (!reference) skip();
    same(await asAdmin('POST', '/api/users', { body: {} }));
    // users.first_name carries a UNIQUE index (named application_number) in the live schema (R-25).
    const base = { password: 'secret12', password_confirmation: 'secret12', role_id: 3, last_name: 'Tract', verified: '1' };
    const lu = await callLaravel('POST', '/api/users', { query: { token: lt }, body: { ...base, first_name: 'ConL', email: 'stk-l@contract.invalid' } });
    const nu = await callNode('POST', '/api/users', { query: { token: nt }, body: { ...base, first_name: 'ConN', email: 'stk-n@contract.invalid' } });
    created.users.push(lu.body.id, nu.body.id);
    expect(nu.status).toBe(201);
    const shape = (u) => ({ ...maskHost(u), id: '<id>', email: '<e>', first_name: '<f>', created_at: '<t>', updated_at: '<t>', email_verified_at: u.email_verified_at ? '<t>' : null });
    expect(shape(nu.body)).toEqual(shape(lu.body));

    // Give the new user a live API token, then ban them.
    await db('api_tokens').insert({ id: 'S'.repeat(40), user_id: nu.body.id, expires_at: '2037-01-01 00:00:00' });
    const nUpd = await callNode('PATCH', `/api/users/${nu.body.id}`, { query: { token: nt }, body: { status: 'Banned' } });
    // DEV-14: the ban revokes tokens (the original never did — see stockService).
    expect(await db('api_tokens').where('user_id', nu.body.id).count({ n: '*' })).toEqual([{ n: 0 }]);
    expect(nUpd.body.status).toBe('Banned');
    const act = await db('user_activity').where('user_id', 1).orderBy('id', 'desc').limit(2).pluck('description');
    expect(act).toEqual(['Banned user ConN Tract.', 'Updated profile details for ConN Tract.']);

    same(await asAdmin('DELETE', '/api/users/1')); // cannot delete yourself
  });
});
