import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callNode } from '../helpers/contract.js';
import { createRecoveredFixtures } from '../helpers/recoveredFixtures.js';

let fixture;
beforeAll(async () => { fixture = await createRecoveredFixtures(); });
afterAll(async () => { await fixture?.cleanup(); });

describe('purchase endpoint authorization', () => {
  for (const path of ['/api/getPurchasedProducts', '/api/getFreeProducts', '/api/getAppliedProducts']) {
    it(`${path}: requires a token and enforces account ownership`, async () => {
      const body = { application_number: fixture.users.student.application_number };
      expect((await callNode('POST', path, { body })).status).toBe(401);
      expect((await callNode('POST', path, { body, query: { token: fixture.tokens.learner } })).status).toBe(403);
      expect((await callNode('POST', path, { body, query: { token: fixture.tokens.student } })).status).toBe(200);
      expect((await callNode('POST', path, { body, query: { token: fixture.tokens.admin } })).status).toBe(200);
    });
  }
  it('never exposes a password hash in profile responses', async () => {
    const response = await callNode('GET', '/api/getLearnerDetails', { query: { token: fixture.tokens.learner } });
    expect(JSON.stringify(response.body)).not.toMatch(/\$2[aby]\$\d\d\$/);
  });
});
