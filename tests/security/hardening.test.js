// SEC-IDOR-01: endpoints that were public in Laravel but expose another
// student's purchases require a matching JWT unless LEGACY_PUBLIC_ENDPOINTS=true.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callNode, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';

let student;
let other;
beforeAll(async () => {
  process.env.LEGACY_PUBLIC_ENDPOINTS = 'false';
  student = await db('users').where('id', 13).first('email', 'application_number');
  other = await db('product_purchased_audit').whereNot('application_number', student.application_number).first('application_number');
});
afterAll(() => {
  process.env.LEGACY_PUBLIC_ENDPOINTS = 'true';
});

describe('hardened purchase endpoints', () => {
  for (const path of ['/api/getPurchasedProducts', '/api/getFreeProducts', '/api/getAppliedProducts']) {
    it(`${path}: 401 without a token`, async () => {
      const res = await callNode('POST', path, { body: { application_number: other.application_number } });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Error');
    });

    it(`${path}: 403 for another student's application number`, async () => {
      const token = await fixtureToken(callNode, student.email);
      const res = await callNode('POST', path, { query: { token }, body: { application_number: other.application_number } });
      expect(res.status).toBe(403);
    });

    it(`${path}: 200 for the student's own application number`, async () => {
      const token = await fixtureToken(callNode, student.email);
      const res = await callNode('POST', path, { query: { token }, body: { application_number: student.application_number } });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Success');
    });

    it(`${path}: admin may read any application`, async () => {
      const token = await fixtureToken(callNode, 'neatadmin@aicte-india.org');
      const res = await callNode('POST', path, { query: { token }, body: { application_number: other.application_number } });
      expect(res.status).toBe(200);
    });
  }
});

describe('DEV-05 no password hashes in responses', () => {
  it('getLearnerDetails never returns users.password', async () => {
    const token = await fixtureToken(callNode, student.email);
    const res = await callNode('GET', '/api/getLearnerDetails', { query: { token } });
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$\d\d\$/);
  });
});
