import { beforeAll, afterAll, expect, it } from 'vitest';
import request from 'supertest';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { createRecoveredFixtures } from '../helpers/recoveredFixtures.js';
import { callNode, nodeApp } from '../helpers/contract.js';
import { env } from '../../src/config/env.js';
import { publicPath } from '../../src/integrations/storage.js';
import { db } from '../../src/database/knex.js';
import { setting } from '../../src/config/settings.js';
import { projectPath } from '../../src/config/paths.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
let fixture, savedSettings, logo;
beforeAll(async () => {
  savedSettings = readFileSync(env.SETTINGS_PATH, 'utf8');
  fixture = await createRecoveredFixtures();
});
afterAll(async () => {
  if (savedSettings !== undefined) writeFileSync(env.SETTINGS_PATH, savedSettings);
  if (logo && existsSync(logo)) unlinkSync(logo);
  await fixture?.cleanup();
});

it('stores new uploads locally and serves the unchanged public URL', async () => {
  const response = await request(nodeApp()).post('/api/uploadFile')
    .query({ token: fixture.tokens.company }).field('code', fixture.bulk)
    .field('inputField', 'course_logo').field('type', 'png')
    .attach('myfile', png, 'standalone-logo.png');
  expect(response.status).toBe(200);
  const record = await db('product_details').where('code', fixture.bulk).first('course_logo_file');
  logo = publicPath('files', 'course_logo', record.course_logo_file);
  expect(readFileSync(logo)).toEqual(png);
  const served = await request(nodeApp()).get(`/files/course_logo/${record.course_logo_file}`);
  expect(served.status).toBe(200);
  expect(served.body).toEqual(png);
});

it('persists panel settings in the configured local file and reads them back', async () => {
  const query = { token: fixture.tokens.admin };
  const response = await callNode('POST', '/api/panel/settings/general', { query, body: { app_name: fixture.marker } });
  expect(response.status).toBe(200);
  expect(JSON.parse(readFileSync(env.SETTINGS_PATH, 'utf8')).app_name).toBe(fixture.marker);
  expect(setting('app_name')).toBe(fixture.marker);
  const read = await callNode('GET', '/api/panel/settings/general', { query });
  expect(read.status).toBe(200);
  expect(read.body.settings.app_name).toBe(fixture.marker);
});

it('serves bundled default images even when runtime storage starts empty', async () => {
  for (const name of ['profile.png', 'neat-logo.png']) {
    const response = await request(nodeApp()).get(`/assets/img/${name}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(readFileSync(projectPath('assets', 'public', 'img', name)));
  }
});
