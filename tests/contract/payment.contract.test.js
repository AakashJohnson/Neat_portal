// PAY-02/03 paymentSuccess / paymentFailure, XLS-01/02 Excel data — Laravel parity.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import { capturedMail, clearCapturedMail } from '../../src/integrations/mail/mailer.js';

const ADMIN = 'neatadmin@aicte-india.org';
const SESSION = 'contract-test-session-0000000000000';
let reference;
let student;
let institute;
let paidCode;

beforeAll(async () => {
  reference = await laravelAvailable();
  student = await db('users').where('id', 13).first('email', 'application_number');
  institute = await db('users').where('id', 56).first('email', 'application_number');
  paidCode = (await db('product_details').where('price', '>', 0).first('code')).code;
});

const seed = (appNo, status = 'Payment pending') =>
  db('product_purchased_audit').insert({ application_number: appNo, code: paidCode, course_type: 'Paid', sessionid: SESSION, status, quantity: 2 });
const cleanup = () => db('product_purchased_audit').where('sessionid', SESSION).delete();
afterAll(cleanup);

const both = (method, path, opts) => Promise.all([callLaravel(method, path, opts), callNode(method, path, opts)]);

describe('PAY-02 POST /api/paymentSuccess', () => {
  it('unknown session → "Cant Complete the Transaction" (both)', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await both('POST', '/api/paymentSuccess', { body: { studentid: student.application_number, courseid: paidCode, token: 'nope' } });
    expect(n.body).toEqual(l.body);
  });

  for (const [label, who, mailable] of [['student/learner', () => student, 'LearnerPayment'], ['institute (role 5)', () => institute, 'InstitutePayment']]) {
    it(`${label}: marks the purchase paid and mails the company (${mailable})`, async ({ skip }) => {
      if (!reference) skip();
      const appNo = who().application_number;
      const body = { studentid: appNo, courseid: paidCode, token: SESSION, success: '1' };

      await cleanup();
      await seed(appNo);
      const l = await callLaravel('POST', '/api/paymentSuccess', { body });
      const lRow = await db('product_purchased_audit').where('sessionid', SESSION).first('status');

      await cleanup();
      await seed(appNo);
      clearCapturedMail();
      const n = await callNode('POST', '/api/paymentSuccess', { body });
      const nRow = await db('product_purchased_audit').where('sessionid', SESSION).first('status');
      await cleanup();

      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
      expect(nRow).toEqual(lRow);
      const companyEmail = (await db('product').where('code', paidCode).first('email')).email;
      expect(capturedMail().at(-1)).toMatchObject({ mailable, to: companyEmail, bcc: 'neatsupport@aicte-india.org' });
    });
  }
});

describe('PAY-03 POST /api/paymentFailure', () => {
  it('without a token / with a token (empty 200 + status Payment Failed)', async ({ skip }) => {
    if (!reference) skip();
    const body = { studentid: student.application_number, courseid: paidCode };
    const [l0, n0] = await both('POST', '/api/paymentFailure', { body });
    expect(n0.body).toEqual(l0.body);

    await cleanup();
    await seed(student.application_number);
    const lt = await fixtureToken(callLaravel, student.email);
    const l = await callLaravel('POST', '/api/paymentFailure', { query: { token: lt }, body });
    const lRow = await db('product_purchased_audit').where('sessionid', SESSION).first('status');
    await cleanup();
    await seed(student.application_number);
    const nt = await fixtureToken(callNode, student.email);
    const n = await callNode('POST', '/api/paymentFailure', { query: { token: nt }, body });
    const nRow = await db('product_purchased_audit').where('sessionid', SESSION).first('status');
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
    expect(nRow).toEqual(lRow);
    expect(nRow.status).toBe('Payment Failed');
  });
});

describe('XLS Excel data endpoints (admin token)', () => {
  async function asAdmin(path, query = {}) {
    const lt = await fixtureToken(callLaravel, ADMIN);
    const nt = await fixtureToken(callNode, ADMIN);
    return [await callLaravel('GET', path, { query: { ...query, token: lt } }), await callNode('GET', path, { query: { ...query, token: nt } })];
  }

  it('getInstitutesWithStudentsForExcel', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await asAdmin('/api/getInstitutesWithStudentsForExcel');
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
  });

  it('getUsersExcel for role_id 4, 6, empty, missing and unknown', async ({ skip }) => {
    if (!reference) skip();
    for (const query of [{ role_id: '4' }, { role_id: '6' }, { role_id: '' }, {}, { role_id: '9' }]) {
      const [l, n] = await asAdmin('/api/getUsersExcel', query);
      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
    }
  });

  it('getUsersExcel role_id 3 (all students) — same rows', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await asAdmin('/api/getUsersExcel', { role_id: '3' });
    expect(n.body.message).toBe('Success');
    expect(n.body.RegisteredUsers.length).toBe(l.body.RegisteredUsers.length);
    expect(n.body).toEqual(l.body);
  }, 120_000);

  it('DEV-08: a student token cannot export user data', async () => {
    const nt = await fixtureToken(callNode, student.email);
    const n = await callNode('GET', '/api/getUsersExcel', { query: { role_id: '3', token: nt } });
    expect(n.status).toBe(403);
  });
});
