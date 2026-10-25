// Test-phase guard (neat_portal_test only): checks that the fixture accounts
// still accept FIXTURE_PASSWORD. If something outside the tests has
// overwritten their hashes, the five fixture rows are reset and the event is
// reported, so the evidence shows the interference instead of hiding it.
//   node tests/fixtures-guard.mjs
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import knex from 'knex';

if (process.env.DB_DATABASE !== 'neat_portal_test') throw new Error('refusing: test database only');
const db = knex({ client: 'mysql2', connection: { host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE } });
const ids = process.env.FIXTURE_USERS.split(',').map((x) => Number(x.split(':')[1]));
const rows = await db('users').whereIn('id', ids).select('id', 'password');
const broken = [];
for (const r of rows) if (!(await bcrypt.compare(process.env.FIXTURE_PASSWORD, r.password.replace(/^\$2y\$/, '$2b$')))) broken.push(r.id);
if (broken.length) {
  const hash = (await bcrypt.hash(process.env.FIXTURE_PASSWORD, 10)).replace(/^\$2[ab]\$/, '$2y$');
  await db('users').whereIn('id', broken).update({ password: hash });
  console.log(`INTERFERENCE ${new Date().toISOString()} fixture hashes overwritten outside the tests; reset ids ${broken.join(',')}`);
} else console.log('fixtures ok');
await db.destroy();
