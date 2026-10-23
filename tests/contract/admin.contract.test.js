// ADM-01..16 — parity with Laravel Api\AdminController / ProductController::productDetails.
import { describe, it, expect, beforeAll } from 'vitest';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';

const ADMIN = 'neatadmin@aicte-india.org';
let reference;
let student;
beforeAll(async () => {
  reference = await laravelAvailable();
  student = await db('users').where('id', 13).first('email');
});

// Paginator URLs contain the serving host; compare them host-independently.
const maskHost = (v) => JSON.parse(JSON.stringify(v).replace(/https?:\/\/[^/"]+\/api/g, 'http://HOST/api'));

async function asAdmin(method, path, opts = {}) {
  const lt = await fixtureToken(callLaravel, ADMIN);
  const nt = await fixtureToken(callNode, ADMIN);
  return [
    await callLaravel(method, path, { ...opts, query: { ...(opts.query ?? {}), token: lt } }),
    await callNode(method, path, { ...opts, query: { ...(opts.query ?? {}), token: nt } }),
  ];
}
const same = ([l, n]) => {
  expect(n.status).toBe(l.status);
  expect(maskHost(n.body)).toEqual(maskHost(l.body));
};
const both = (method, path, opts) => Promise.all([callLaravel(method, path, opts), callNode(method, path, opts)]);

describe('ADM admin token: identical responses', () => {
  const simple = [
    ['GET', '/api/getAdminCounts'],
    ['GET', '/api/getAdminProducts'],
    ['GET', '/api/getCompanies'],
    ['GET', '/api/getInstitutes'],
    ['GET', '/api/free-seat-student'],
    ['GET', '/api/mou-list'],
    ['GET', '/api/product-management'],
  ];
  for (const [method, path] of simple) {
    it(`${method} ${path}`, async ({ skip }) => {
      if (!reference) skip();
      same(await asAdmin(method, path));
    });
  }

  it('getAdminStudents: pages, per_page bounds, search', async ({ skip }) => {
    if (!reference) skip();
    for (const query of [{}, { page: '2', per_page: '10' }, { per_page: '500' }, { per_page: 'abc' }, { search: 'gmail', per_page: '5' }, { page: '999999' }]) {
      same(await asAdmin('GET', '/api/getAdminStudents', { query }));
    }
  });

  it('getAdminLearners: pages and search', async ({ skip }) => {
    if (!reference) skip();
    for (const query of [{}, { page: '3', per_page: '20' }, { search: 'teacher' }]) {
      same(await asAdmin('GET', '/api/getAdminLearners', { query }));
    }
  });

  it('getCompanyWiseProduct / getCourseWiseProduct', async ({ skip }) => {
    if (!reference) skip();
    const company = await db('company_details').first('name');
    same(await asAdmin('POST', '/api/getCompanyWiseProduct', { body: { company_name: company.name } }));
    same(await asAdmin('POST', '/api/getCompanyWiseProduct', { body: {} }));
    same(await asAdmin('POST', '/api/getCourseWiseProduct', { body: { course_company_name: 'data' } }));
    same(await asAdmin('POST', '/api/getCourseWiseProduct', { body: {} }));
  });

  it('changeProductStatus updates product_active', async ({ skip }) => {
    if (!reference) skip();
    const p = await db('product_details').first('code', 'product_active');
    same(await asAdmin('POST', '/api/changeProductStatus', { body: { code: p.code, status: p.product_active } }));
    expect((await db('product_details').where('code', p.code).first('product_active')).product_active).toBe(p.product_active);
  });

  it('update-mou-date (missing parameters, success)', async ({ skip }) => {
    if (!reference) skip();
    const c = await db('company_details').first('neat_id', 'mou_date');
    same(await asAdmin('POST', '/api/update-mou-date', { body: { neat_id: c.neat_id } }));
    same(await asAdmin('POST', '/api/update-mou-date', { body: { neat_id: c.neat_id, mou_date: '2026-01-01' } }));
    await db('company_details').where('neat_id', c.neat_id).update({ mou_date: c.mou_date });
  });
});

describe('ADM public endpoints', () => {
  it('getAdminCountsForAICTEDashboard / getCompanyAndProductsForAICTEDashboard', async ({ skip }) => {
    if (!reference) skip();
    same(await both('GET', '/api/getAdminCountsForAICTEDashboard'));
    same(await both('GET', '/api/getCompanyAndProductsForAICTEDashboard'));
  });

  it('getCompanyDetails (legacy public mode) — always Error: financial_competence missing (R-01)', async ({ skip }) => {
    if (!reference) skip();
    const c = await db('company_details').first('neat_id');
    const [l, n] = await both('GET', '/api/getCompanyDetails', { query: { neat_id: c.neat_id } });
    expect(l.body).toEqual({ message: 'Error' });
    same([l, n]);
  });
});

describe('ADM auth failures', () => {
  it('no token behaves like Laravel', async ({ skip }) => {
    if (!reference) skip();
    for (const [method, path] of [
      ['GET', '/api/getAdminCounts'],
      ['GET', '/api/getAdminStudents'],
      ['GET', '/api/getAdminLearners'],
      ['GET', '/api/product-management'],
      ['POST', '/api/update-mou-date'],
      ['POST', '/api/getCourseWiseProduct'],
    ]) {
      const [l, n] = await both(method, path);
      expect(n.status).toBe(l.status);
      // DEV-04: Laravel's 500 bodies here carry PHP line numbers; compare without them.
      const strip = (b) => (b && typeof b === 'object' ? Object.fromEntries(Object.entries(b).filter(([k]) => k !== 'line')) : b);
      expect(strip(n.body)).toEqual(strip(l.body));
    }
  });

  it('DEV-08: a student token is rejected on admin-only endpoints (Laravel allowed it)', async ({ skip }) => {
    if (!reference) skip();
    const lt = await fixtureToken(callLaravel, student.email);
    const nt = await fixtureToken(callNode, student.email);
    const l = await callLaravel('GET', '/api/getAdminCounts', { query: { token: lt } });
    expect(l.body.message).toBe('Success'); // privilege escalation in the original
    const n = await callNode('GET', '/api/getAdminCounts', { query: { token: nt } });
    expect(n.status).toBe(403);
    const ns = await callNode('GET', '/api/getAdminStudents', { query: { token: nt } });
    expect(ns.status).toBe(403);
  });

  it('getCompanies / getCompanyWiseProduct stay available to any logged-in user (grievance page)', async ({ skip }) => {
    if (!reference) skip();
    const lt = await fixtureToken(callLaravel, student.email);
    const nt = await fixtureToken(callNode, student.email);
    const l = await callLaravel('GET', '/api/getCompanies', { query: { token: lt } });
    const n = await callNode('GET', '/api/getCompanies', { query: { token: nt } });
    same([l, n]);
  });
});
