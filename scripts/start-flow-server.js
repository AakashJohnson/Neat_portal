import assert from 'node:assert/strict';

assert.equal(process.env.DB_DATABASE, 'neat_portal_test', 'Browser flow server requires the isolated test database.');
process.env.MAIL_TRANSPORT = 'json';
const { createApp } = await import('../src/app.js');
const { db } = await import('../src/database/knex.js');
await db.raw('SELECT 1');
const port = Number(process.env.PORT || 4101);
createApp({ rateLimit: 100_000 }).listen(port, '127.0.0.1', () => {
  console.log(`Isolated browser flow API listening on ${port}; mail captured; test rate limit enabled.`);
});
