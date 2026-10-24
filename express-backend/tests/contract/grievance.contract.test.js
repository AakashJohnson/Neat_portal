// GRV-01..05 — parity with Laravel Api\GrievanceController.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import { capturedMail, clearCapturedMail } from '../../src/integrations/mail/mailer.js';
import { DB_ERROR_REASON } from '../../src/services/legacyErrors.js';

let reference;
beforeAll(async () => {
  reference = await laravelAvailable();
});

const both = (method, path, opts) => Promise.all([callLaravel(method, path, opts), callNode(method, path, opts)]);
const latest = (tbl) => db(tbl).orderBy('id', 'desc').first();
// grievance_id / feedback_id = prefix + unix timestamp under a UNIQUE key: two
// submissions in the same second collide (original defect R-19), so wait for
// the next second between the Laravel and the Node call.
const nextSecond = () => new Promise((r) => setTimeout(r, 1100 - (Date.now() % 1000)));
const strip = (row, keys) => Object.fromEntries(Object.entries(row).filter(([k]) => !keys.includes(k)));

describe('GRV-01 POST /api/submitGrievance', () => {
  it('matches Laravel for invalid input (200 + "The given data was invalid.")', async ({ skip }) => {
    if (!reference) skip();
    const bad = [{}, { name: 'a', email: 'not-an-email', mobile: '9999999999', description: 'x' }, { name: 'a', email: 'a@b.co', mobile: '12345', description: 'x' }];
    for (const body of bad) {
      const [l, n] = await both('POST', '/api/submitGrievance', { body });
      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
    }
  });

  it('matches Laravel on success and stores an equivalent row', async ({ skip }) => {
    if (!reference) skip();
    const body = { name: 'Contract Test', email: 'contract-test@example.invalid', mobile: '9876543210', organization: 'Org', description: 'parity check' };
    const l = await callLaravel('POST', '/api/submitGrievance', { body });
    const lRow = await latest('grievance');
    await nextSecond();
    const n = await callNode('POST', '/api/submitGrievance', { body });
    const nRow = await latest('grievance');
    expect(n.body).toEqual(l.body);
    expect(nRow.id).toBe(lRow.id + 1);
    expect(strip(nRow, ['id', 'grievance_id', 'created_at', 'updated_at'])).toEqual(strip(lRow, ['id', 'grievance_id', 'created_at', 'updated_at']));
    expect(nRow.grievance_id).toMatch(/^GRIV\d{10}$/);
  });
});

describe('GRV-02 POST /api/submitFeedback', () => {
  beforeEach(() => clearCapturedMail());

  it('matches Laravel without a token / with a malformed or forged token', async ({ skip }) => {
    if (!reference) skip();
    for (const query of [undefined, { token: 'abc' }, { token: 'a.b.c' }]) {
      const [l, n] = await both('POST', '/api/submitFeedback', query ? { query } : {});
      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
    }
  });

  it('matches Laravel for invalid input with a valid token', async ({ skip }) => {
    if (!reference) skip();
    const lt = await fixtureToken(callLaravel, 'neatadmin@aicte-india.org');
    const nt = await fixtureToken(callNode, 'neatadmin@aicte-india.org');
    const l = await callLaravel('POST', '/api/submitFeedback', { query: { token: lt }, body: { name: 'x' } });
    const n = await callNode('POST', '/api/submitFeedback', { query: { token: nt }, body: { name: 'x' } });
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
  });

  it('matches Laravel on success, stores an equivalent row and sends FeedbackRaised', async ({ skip }) => {
    if (!reference) skip();
    const body = { name: 'Contract Test', email: 'contract-test@example.invalid', experience: 'Good', feedback: 'parity <b>check</b>' };
    const lt = await fixtureToken(callLaravel, 'neatadmin@aicte-india.org');
    const l = await callLaravel('POST', '/api/submitFeedback', { query: { token: lt }, body });
    const lRow = await latest('feedback');
    await nextSecond();
    const nt = await fixtureToken(callNode, 'neatadmin@aicte-india.org');
    const n = await callNode('POST', '/api/submitFeedback', { query: { token: nt }, body });
    const nRow = await latest('feedback');
    expect(n.body).toEqual(l.body);
    expect(strip(nRow, ['id', 'feedback_id', 'created_at', 'updated_at'])).toEqual(strip(lRow, ['id', 'feedback_id', 'created_at', 'updated_at']));

    const mails = capturedMail();
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({ mailable: 'FeedbackRaised', to: 'neatadmin@aicte-india.org', bcc: 'neat.grievance@gmail.com', subject: 'Feedback Raised' });
    expect(mails[0].html).toContain('Feedback raised successfully.');
    expect(mails[0].html).toContain('parity &lt;b&gt;check&lt;/b&gt;'); // Blade escaping preserved
  });
});

describe('GRV-03 GET /api/getAnnouncements', () => {
  it('returns exactly the Laravel body', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await both('GET', '/api/getAnnouncements');
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
  });
});

describe('GRV-04 GET /api/get-details-article', () => {
  it('returns exactly the Laravel body (existing, unknown and missing id)', async ({ skip }) => {
    if (!reference) skip();
    const any = await db('articles').first('id');
    for (const query of [{ id: String(any.id) }, { id: '999999' }, undefined]) {
      const [l, n] = await both('GET', '/api/get-details-article', query ? { query } : {});
      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
    }
  });
});

describe('GRV-05 POST /api/submitContactUs', () => {
  it('matches Laravel on success', async ({ skip }) => {
    if (!reference) skip();
    const body = { name: 'Contract Test', email: 'contract-test@example.invalid', message: 'parity' };
    const [l, n] = await both('POST', '/api/submitContactUs', { body });
    expect(n.body).toEqual(l.body);
  });

  it('DEV-01: same envelope on DB error, but no SQL text leaked', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await both('POST', '/api/submitContactUs', { body: {} });
    expect(l.body.message).toBe('Error');
    expect(l.body.reason).toMatch(/SQLSTATE/); // the original leaks SQL
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual({ message: 'Error', reason: DB_ERROR_REASON });
  });
});
