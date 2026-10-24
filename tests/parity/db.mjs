// Test isolation for parity runs that write: snapshot rows of
// neat_portal_test and restore them before each app's run, so Angular and
// Next.js start from the same data. Refuses any other database.
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve(import.meta.dirname, '../../../express-backend/package.json'));
const env = require('dotenv').config({ path: path.resolve(import.meta.dirname, '../../../express-backend/.env'), quiet: true }).parsed;
if (env.DB_DATABASE !== 'neat_portal_test') throw new Error(`parity DB helpers only run on neat_portal_test, not ${env.DB_DATABASE}`);

export function testDb() {
  return require('knex')({
    client: 'mysql2',
    connection: { host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USERNAME, password: env.DB_PASSWORD, database: env.DB_DATABASE, dateStrings: true },
  });
}

/** Rows of `table` matching `where`. */
export async function snapshot(db, table, where) {
  return db(table).where(where).select('*');
}

/** Put the snapshot back: update every row (matched by `keys`) to its snapshot values. */
export async function restore(db, table, rows, keys = ['id']) {
  for (const row of rows) {
    const where = Object.fromEntries(keys.map((k) => [k, row[k]]));
    await db(table).where(where).update(row);
  }
}
