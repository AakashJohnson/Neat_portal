// CMP-01 getProducts, CMP-02 submitProductDetails — parity with Laravel CompanyController.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';

let reference;
let company;
let product;
let snapshot;

beforeAll(async () => {
  reference = await laravelAvailable();
  company = await db('users').where('id', 39).first('email', 'application_number');
  product = await db('product_details').where('neat_id', company.application_number).first();
  snapshot = { ...product };
});
afterAll(async () => {
  const { id, ...rest } = snapshot;
  await db('product_details').where('id', id).update(rest);
});

const same = ([l, n]) => {
  expect(n.status).toBe(l.status);
  expect(n.body).toEqual(l.body);
};
async function asCompany(method, path, opts = {}) {
  const lt = await fixtureToken(callLaravel, company.email);
  const nt = await fixtureToken(callNode, company.email);
  return [
    await callLaravel(method, path, { ...opts, query: { ...(opts.query ?? {}), token: lt } }),
    await callNode(method, path, { ...opts, query: { ...(opts.query ?? {}), token: nt } }),
  ];
}

describe('CMP-01 POST /api/getProducts (legacy public mode)', () => {
  it('company products, unknown company, missing input', async ({ skip }) => {
    if (!reference) skip();
    for (const body of [{ application_number: company.application_number }, { application_number: 'NOPE' }, {}]) {
      same(await Promise.all([callLaravel('POST', '/api/getProducts', { body }), callNode('POST', '/api/getProducts', { body })]));
    }
  });
});

describe('CMP-02 POST /api/submitProductDetails', () => {
  it('no token / unknown code ("Exists" quirk)', async ({ skip }) => {
    if (!reference) skip();
    same(await Promise.all([callLaravel('POST', '/api/submitProductDetails', { body: { code: product.code } }), callNode('POST', '/api/submitProductDetails', { body: { code: product.code } })]));
    same(await asCompany('POST', '/api/submitProductDetails', { body: { code: 'NO_SUCH_CODE' } }));
  });

  it('own product: same response and same resulting row (empty links become "0")', async ({ skip }) => {
    if (!reference) skip();
    const body = { code: product.code, application_number: company.application_number, product_highlights: 'Contract highlights', short_description: 'Short', payment_link: '', product_direct_url: null, description: '<p>desc</p>' };
    const [l, n] = await asCompany('POST', '/api/submitProductDetails', { body });
    same([l, n]);
    const row = await db('product_details').where('code', product.code).first();
    expect(row).toMatchObject({ product_highlights: 'Contract highlights', payment_link: '0', product_direct_url: '0', isDetailsSubmitted: 'Yes' });
  });

  it("DEV-09: another company's product cannot be edited (Laravel allowed it)", async () => {
    const other = await db('product_details').whereNot('neat_id', company.application_number).first('code');
    const nt = await fixtureToken(callNode, company.email);
    const n = await callNode('POST', '/api/submitProductDetails', { query: { token: nt }, body: { code: other.code, product_highlights: 'hijack' } });
    expect(n.status).toBe(403);
    expect((await db('product_details').where('code', other.code).first('product_highlights')).product_highlights).not.toBe('hijack');
  });
});
