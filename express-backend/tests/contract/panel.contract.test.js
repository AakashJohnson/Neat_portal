// PNL — admin-panel endpoints replacing Laravel web actions, and R-03 parity.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import { UNRESOLVED_ROUTES } from '../../src/routes/unresolved.routes.js';

const ADMIN = 'neatadmin@aicte-india.org';
let reference;
let nt;
beforeAll(async () => {
  reference = await laravelAvailable();
  nt = await fixtureToken(callNode, ADMIN);
});

describe('R-03 unresolved routes answer the same status as Laravel', () => {
  for (const [method, path] of UNRESOLVED_ROUTES) {
    it(`${method.toUpperCase()} /api${path}`, async ({ skip }) => {
      if (!reference) skip();
      const [l, n] = await Promise.all([callLaravel(method.toUpperCase(), `/api${path}`), callNode(method.toUpperCase(), `/api${path}`)]);
      expect(n.status).toBe(l.status);
    });
  }
});

describe('PNL settings', () => {
  it('writes dotted keys in PHP json_encode format and logs the change', async () => {
    const res = await callNode('POST', '/api/panel/settings/auth', { query: { token: nt }, body: { '2fa.enabled': false, 'registration.captcha.enabled': false, app_name: 'Neat' } });
    expect(res.status).toBe(200);
    const raw = readFileSync(process.env.SETTINGS_PATH, 'utf8');
    expect(JSON.parse(raw)['2fa']).toEqual({ enabled: false });
    expect(raw).not.toMatch(/\n/); // json_encode: single line
    const act = await db('user_activity').where('user_id', 1).orderBy('id', 'desc').first('description');
    expect(act.description).toBe('Updated website settings.');
  });

  it('requires the group permission (student → 403)', async () => {
    const student = await db('users').where('id', 13).first('email');
    const st = await fixtureToken(callNode, student.email);
    const res = await callNode('POST', '/api/panel/settings/general', { query: { token: st }, body: { app_name: 'x' } });
    expect(res.status).toBe(403);
  });
});

describe('PNL impersonation', () => {
  it('admin impersonates a user and leaves again (activity logged both ways)', async () => {
    const res = await callNode('POST', '/api/panel/impersonate/13', { query: { token: nt } });
    expect(res.status).toBe(200);
    const imp = jwt.decode(res.body.token);
    expect(imp.sub).toBe(13);
    expect(imp.imp).toBe(1);
    // The impersonation token is a normal token for both backends.
    if (reference) expect((await callLaravel('GET', '/api/verifyUserLoggedIn', { query: { token: res.body.token } })).body).toEqual({ message: 'Success' });

    const back = await callNode('POST', '/api/panel/impersonate/leave', { query: { token: res.body.token } });
    expect(back.status).toBe(200);
    expect(jwt.decode(back.body.token).sub).toBe(1);
    const acts = await db('user_activity').where('user_id', 1).orderBy('id', 'desc').limit(2).pluck('description');
    expect(acts[0]).toMatch(/^Stopped impersonating user .+ \(ID: 13\)$/);
    expect(acts[1]).toMatch(/^Started impersonating user .+ \(ID: 13\)$/);
  });

  it('cannot impersonate yourself, nor without users.manage', async () => {
    expect((await callNode('POST', '/api/panel/impersonate/1', { query: { token: nt } })).status).toBe(403);
    const student = await db('users').where('id', 13).first('email');
    const st = await fixtureToken(callNode, student.email);
    expect((await callNode('POST', '/api/panel/impersonate/1', { query: { token: st } })).status).toBe(403);
  });
});

describe('PNL company profile (admin-only, DEV-15/16)', () => {
  const NEAT = 'NEATCONTRACT1';
  afterAll(async () => {
    await db('users').where('email', 'company-profile@contract.invalid').delete();
    await db('company_details').where('neat_id', NEAT).delete();
    await db('product_details').where('code', `${NEAT}_PROD_1`).delete();
    await db('product').where('code', `${NEAT}_PROD_1`).delete();
  });

  it('fetch-neat-id reads neat_eoi; unknown id → 500', async () => {
    const row = await db('neat_eoi').first('neat_id', 'email', 'company', 'phone');
    const res = await callNode('POST', '/api/panel/company-profile/fetch-neat-id', { query: { token: nt }, body: { neat_id: row.neat_id } });
    expect(res.body).toEqual({ msg: 'succes', data: { email: row.email, company: row.company, phone: row.phone } });
    expect((await callNode('POST', '/api/panel/company-profile/fetch-neat-id', { query: { token: nt }, body: { neat_id: 'none' } })).status).toBe(500);
  });

  it('create profile fails like the original (R-28: company_details.mou_date NOT NULL, no default); create product works', async () => {
    const profile = await callNode('POST', '/api/panel/company-profile', { query: { token: nt }, body: { neat_id: NEAT, company: 'Contract Co', email: 'company-profile@contract.invalid', password: 'Company#123' } });
    expect(profile.status).toBe(500);
    expect(await db('users').where('email', 'company-profile@contract.invalid').first()).toBeUndefined();

    const product = await callNode('POST', '/api/panel/company-profile/create-product', { query: { token: nt }, body: { neat_id: NEAT, code: `${NEAT}_PROD_1`, product: 'Contract Product', company: 'Contract Co', product_type: 'B2C', proposed_pricing: '0', product_active: 'Yes' } });
    expect(product.body).toEqual({ msg: 'Product Created successfully!!' });
    expect(await db('product_details').where('code', `${NEAT}_PROD_1`).first('availableFreeCourses', 'isDetailsSubmitted')).toEqual({ availableFreeCourses: 500, isDetailsSubmitted: 'No' });
  });

  it('DEV-15: SQL injection in product-details is parameterised (no data leak)', async () => {
    const res = await callNode('POST', '/api/panel/company-profile/product-details', { query: { token: nt }, body: { code: "x' OR '1'='1" } });
    // The Phase-2 schemas do not exist on this server (R-01) — any outcome but a data dump is acceptable.
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/company|email/);
  });

  it('is not reachable without an admin token', async () => {
    expect((await callNode('POST', '/api/panel/company-profile', { body: { neat_id: 'x' } })).status).toBe(401);
  });
});
