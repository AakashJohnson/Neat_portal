import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

assert.equal(process.env.DB_DATABASE, 'neat_portal_test', 'Browser flow server requires the isolated test database.');
process.env.MAIL_TRANSPORT = 'json';
const testStorage = await mkdtemp(path.join(os.tmpdir(), 'neat-flow-'));
process.env.PUBLIC_STORAGE_PATH = path.join(testStorage, 'public');
process.env.SETTINGS_PATH = path.join(testStorage, 'settings.json');
const { createApp } = await import('../src/app.js');
const { db } = await import('../src/database/knex.js');
await db.raw('SELECT 1');
const port = Number(process.env.PORT || 4101);
const server = createApp({ rateLimit: 100_000 }).listen(port, '127.0.0.1', () => {
  console.log(`Isolated browser flow API listening on ${port}; mail captured; test rate limit enabled.`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => {
  await db.destroy();
  await rm(testStorage, { recursive: true, force: true });
}));
