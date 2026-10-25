import { afterAll, beforeAll, expect, it } from 'vitest';
import { db } from '../../src/database/knex.js';
import { callNode } from '../helpers/contract.js';
import { createRecoveredFixtures } from '../helpers/recoveredFixtures.js';

let fixture;
beforeAll(async () => {
  fixture = await createRecoveredFixtures();
  await db('neat_eoi').insert({ neat_id: fixture.marker, company: fixture.marker, email: `${fixture.marker}@example.invalid`, phone: '0000000000' });
});
afterAll(async () => {
  if (!fixture) return;
  await db('neat_eoi').where('neat_id', fixture.marker).delete();
  await fixture.cleanup();
});

it('returns real company fields, a distinct 404 for no match, and preserves lookup permissions', async () => {
  const endpoint = '/api/panel/company-profile/fetch-neat-id';
  const matched = await callNode('POST', endpoint, { query: { token: fixture.tokens.admin }, body: { neat_id: fixture.marker } });
  expect(matched.status).toBe(200);
  expect(matched.body.data).toMatchObject({ company: fixture.marker, email: `${fixture.marker}@example.invalid`, phone: '0000000000' });
  const missing = await callNode('POST', endpoint, { query: { token: fixture.tokens.admin }, body: { neat_id: `${fixture.marker}-absent` } });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ message: 'No results found.' });
  const forbidden = await callNode('POST', endpoint, { query: { token: fixture.tokens.student }, body: { neat_id: fixture.marker } });
  expect(forbidden.status).toBe(403);
});
