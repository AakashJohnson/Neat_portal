// CAT-01..15, CMT-01..03, PAY-01 — parity with Laravel Api\CourseController.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import { capturedMail, clearCapturedMail } from '../../src/integrations/mail/mailer.js';
import { DB_ERROR_REASON } from '../../src/services/legacyErrors.js';

let reference;
let student; // fixture student (id 13)
let sampleBucket;
let sampleCode;

beforeAll(async () => {
  reference = await laravelAvailable();
  student = await db('users').where('id', 13).first('email', 'application_number');
  const p = await db('product_details').where({ isDetailsSubmitted: 'Yes', product_active: 'Approved' }).whereNotNull('product_bucket').first('code', 'product_bucket');
  sampleBucket = p.product_bucket;
  sampleCode = p.code;
});

const both = (method, path, opts) => Promise.all([callLaravel(method, path, opts), callNode(method, path, opts)]);
const sortById = (body) => (body?.products ? { ...body, products: [...body.products].sort((a, b) => a.id - b.id) } : body);

describe('CAT listing endpoints (ORDER BY RAND() → compared as sets)', () => {
  const listings = [
    ['/api/getProductsLandingPage'],
    ['/api/getB2BProductsLandingPage'],
    ['/api/getB2CProductsLandingPage'],
  ];
  for (const [path] of listings) {
    it(`GET ${path}`, async ({ skip }) => {
      if (!reference) skip();
      const [l, n] = await both('GET', path);
      expect(n.status).toBe(l.status);
      expect(sortById(n.body)).toEqual(sortById(l.body));
    });
  }

  for (const prefix of ['', 'B2B', 'B2C']) {
    it(`GET /api/get${prefix}BucketWiseProducts (All, real bucket, missing, unknown)`, async ({ skip }) => {
      if (!reference) skip();
      for (const query of [{ bucket: 'All' }, { bucket: sampleBucket }, undefined, { bucket: 'No Such Bucket' }]) {
        const [l, n] = await both('GET', `/api/get${prefix}BucketWiseProducts`, query ? { query } : {});
        expect(n.status).toBe(l.status);
        expect(sortById(n.body)).toEqual(sortById(l.body));
      }
    });

    it(`GET /api/get${prefix}BucketWiseSearchProducts (empty, term, missing, wildcard)`, async ({ skip }) => {
      if (!reference) skip();
      for (const query of [{ bucket: '' }, { bucket: 'data' }, undefined, { bucket: '%' }]) {
        const [l, n] = await both('GET', `/api/get${prefix}BucketWiseSearchProducts`, query ? { query } : {});
        expect(n.status).toBe(l.status);
        expect(sortById(n.body)).toEqual(sortById(l.body));
      }
    });

    it(`GET /api/get${prefix}ProductBuckets`, async ({ skip }) => {
      if (!reference) skip();
      const [l, n] = await both('GET', `/api/get${prefix}ProductBuckets`);
      expect(n.body).toEqual(l.body);
    });
  }

  it('GET /api/getHomePageCounter', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await both('GET', '/api/getHomePageCounter');
    expect(n.body).toEqual(l.body);
  });

  it('POST /api/getProductsForAllocation', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await both('POST', '/api/getProductsForAllocation');
    expect(n.body).toEqual(l.body);
  });
});

describe('CAT-PD POST /api/getProductDetails', () => {
  it('matches Laravel (view_counter increments once per call)', async ({ skip }) => {
    if (!reference) skip();
    const l = await callLaravel('POST', '/api/getProductDetails', { body: { code: sampleCode } });
    const n = await callNode('POST', '/api/getProductDetails', { body: { code: sampleCode } });
    expect(n.status).toBe(l.status);
    expect(n.body.products.view_counter).toBe(l.body.products.view_counter + 1);
    const mask = (b) => ({ ...b, products: { ...b.products, view_counter: '<n>', updated_at: '<t>' } });
    expect(mask(n.body)).toEqual(mask(l.body));
  });

  it('matches Laravel for unknown code, malformed token, forged token and a valid student token', async ({ skip }) => {
    if (!reference) skip();
    const studentToken = await fixtureToken(callLaravel, student.email);
    const forged = jwt.sign({ sub: 13 }, 'wrong-secret');
    const cases = [
      { body: { code: 'NO_SUCH_CODE' } },
      { body: { code: sampleCode }, query: { token: 'abc' } },
      { body: { code: sampleCode }, query: { token: forged } },
      { body: { code: sampleCode }, query: { token: studentToken } },
      { body: {} },
    ];
    for (const opts of cases) {
      const l = await callLaravel('POST', '/api/getProductDetails', opts);
      const n = await callNode('POST', '/api/getProductDetails', opts);
      const mask = (b) => (b?.products ? { ...b, products: { ...b.products, view_counter: '<n>', updated_at: '<t>' } } : b);
      expect(n.status).toBe(l.status);
      expect(mask(n.body)).toEqual(mask(l.body));
    }
  });
});

describe('CMT comments', () => {
  it('getComments matches Laravel (count=1, missing count, no token)', async ({ skip }) => {
    if (!reference) skip();
    const lt = await fixtureToken(callLaravel, student.email);
    const nt = await fixtureToken(callNode, student.email);
    const withComments = await db('comments').first('course_id');
    for (const body of [{ code: withComments?.course_id, count: 1 }, { code: withComments?.course_id }]) {
      const l = await callLaravel('POST', '/api/getComments', { query: { token: lt }, body });
      const n = await callNode('POST', '/api/getComments', { query: { token: nt }, body });
      expect(n.body).toEqual(l.body);
    }
    const [l, n] = await both('POST', '/api/getComments', { body: { code: 'x', count: 1 } });
    expect(n.body).toEqual(l.body);
  });

  it('addComment + addReplyToComment store equivalent rows', async ({ skip }) => {
    if (!reference) skip();
    const lt = await fixtureToken(callLaravel, student.email);
    const nt = await fixtureToken(callNode, student.email);
    const body = { comment: 'contract test comment', course_id: 'CONTRACT_TEST', type: 'question' };
    const l = await callLaravel('POST', '/api/addComment', { query: { token: lt }, body });
    const n = await callNode('POST', '/api/addComment', { query: { token: nt }, body });
    expect(n.body).toEqual(l.body);
    const rows = await db('comments').where('course_id', 'CONTRACT_TEST').orderBy('id');
    expect(rows).toHaveLength(2);
    const strip = ({ id, comment_id, created_at, updated_at, ...rest }) => rest;
    expect(strip(rows[1])).toEqual(strip(rows[0]));
    expect(rows[1].comment_id).toMatch(/^[0-9a-f-]{36}$/);

    const lr = await callLaravel('POST', '/api/addReplyToComment', { query: { token: lt }, body: { comment_id: rows[0].comment_id, reply: 'r' } });
    const nr = await callNode('POST', '/api/addReplyToComment', { query: { token: nt }, body: { comment_id: rows[1].comment_id, reply: 'r' } });
    expect(nr.body).toEqual(lr.body);
    const after = await db('comments').where('course_id', 'CONTRACT_TEST').orderBy('id').pluck('replied');
    expect(after).toEqual(['Yes', 'Yes']);
  });

  afterAll(async () => {
    const ids = await db('comments').where('course_id', 'CONTRACT_TEST').pluck('comment_id');
    await db('replies').whereIn('comment_id', ids).delete();
    await db('comments').where('course_id', 'CONTRACT_TEST').delete();
  });
});

describe('CAT-B2B POST /api/submitB2BEnquiry', () => {
  it('validates incomplete enquiries before looking up the product', async () => {
    const n = await callNode('POST', '/api/submitB2BEnquiry', { body: { product_code: 'NO_SUCH' } });
    expect(n.status).toBe(422);
    expect(n.body.errors).toHaveProperty('college_email');
  });

  it('matches Laravel on success, stores the enquiry and mails the company', async ({ skip }) => {
    if (!reference) skip();
    clearCapturedMail();
    const body = { neat_id: 'CONTRACT', product_code: sampleCode, college_representative_name: 'Rep', designation: 'Dean', college_name: 'Test College', college_email: 'college@example.invalid', no_of_seats: '5', mobile_number: '9876543210', message: 'contract' };
    const [l, n] = await both('POST', '/api/submitB2BEnquiry', { body });
    expect(n.body).toMatchObject(l.body);
    const rows = await db('b2b_enquiry').where({ college_email: body.college_email, message: body.message }).orderBy('id');
    const strip = ({ id, enquiry_no, created_at, updated_at, ...rest }) => rest;
    const product = await db('product_details').where('code', sampleCode).first('neat_id');
    expect(strip(rows.at(-1))).toEqual({ ...strip(rows.at(-2)), neat_id: product.neat_id });
    expect(capturedMail().at(-1)).toMatchObject({ mailable: 'B2BCompany', subject: 'B2 B Company' });
    await db('b2b_enquiry').whereIn('id', rows.slice(-2).map(r => r.id)).delete();
  });
});

describe('PAY-01 POST /api/applyForPaidCourse', () => {
  let paidCode;
  let freeCode;
  beforeAll(async () => {
    paidCode = (await db('product_details').where('price', '>', 0).whereNotNull('payment_link').first('code'))?.code;
    freeCode = (await db('product_details').where('price', '0').first('code'))?.code;
  });

  const cleanup = (code) => db('product_purchased_audit').where({ application_number: student.application_number, code }).delete();

  it('matches Laravel without a token', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await both('POST', '/api/applyForPaidCourse', { body: { code: paidCode, quantity: 1 } });
    expect(n.body).toEqual(l.body);
  });

  for (const [label, codeOf, quantity] of [
    ['paid product, quantity 2', () => paidCode, 2],
    ['paid product, missing quantity (fee 0 → treated as free)', () => paidCode, undefined],
    ['free product', () => freeCode, 1],
  ]) {
    it(`matches Laravel: ${label} (response, redirect URL and audit row)`, async ({ skip }) => {
      const code = codeOf();
      if (!reference || !code) skip();
      const body = quantity === undefined ? { code } : { code, quantity };
      await cleanup(code);
      const lt = await fixtureToken(callLaravel, student.email);
      const l = await callLaravel('POST', '/api/applyForPaidCourse', { query: { token: lt }, body });
      const lRow = await db('product_purchased_audit').where({ application_number: student.application_number, code }).first();
      await cleanup(code);
      const nt = await fixtureToken(callNode, student.email);
      const n = await callNode('POST', '/api/applyForPaidCourse', { query: { token: nt }, body });
      const nRow = await db('product_purchased_audit').where({ application_number: student.application_number, code }).first();
      await cleanup(code);

      const maskUrl = (b) => (b?.redirect_url ? { ...b, redirect_url: b.redirect_url.replace(/sessionid=[0-9a-f-]{36}/, 'sessionid=<uuid>') } : b);
      expect(n.status).toBe(l.status);
      if (typeof l.body?.reason === 'string' && l.body.reason.startsWith('SQLSTATE')) {
        // DEV-01: Laravel leaks the SQL (incl. the student's application number).
        expect(n.body).toEqual({ message: 'Error', reason: DB_ERROR_REASON });
      } else {
        expect(maskUrl(n.body)).toEqual(maskUrl(l.body));
      }
      const strip = (r) => r && Object.fromEntries(Object.entries(r).filter(([k]) => !['id', 'sessionid', 'created_at', 'updated_at'].includes(k)));
      expect(strip(nRow)).toEqual(strip(lRow));
    });
  }
});
