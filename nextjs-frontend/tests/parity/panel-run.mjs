// Runs panel-behaviour.mjs with the R-46 data defect neutralised on
// neat_portal_test only: the original announcements have created_at NULL, which
// makes every logged-in Blade page fail with HTTP 500 (navbar diffForHumans()).
// A fixed timestamp is set for the run and NULL is restored afterwards.
//   node tests/parity/panel-run.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { testDb } from './db.mjs';

const db = testDb();
const ids = (await db('announcements').whereNull('created_at').select('id')).map((r) => r.id);
// R-49: users with created_at NULL make users/partials/row fail (format() on null).
const userIds = (await db('users').whereNull('created_at').select('id')).map((r) => r.id);
let status = 1;
try {
  if (ids.length) await db('announcements').whereIn('id', ids).update({ created_at: '2020-01-01 00:00:00', updated_at: '2020-01-01 00:00:00' });
  if (userIds.length) await db('users').whereIn('id', userIds).update({ created_at: '2020-01-01 00:00:00' });
  console.log(`R-46/R-49: created_at set temporarily on announcements ${ids.join(',') || '(none)'} and ${userIds.length} users`);
  status = spawnSync(process.execPath, [path.join(import.meta.dirname, 'panel-behaviour.mjs')], { stdio: 'inherit' }).status ?? 1;
} finally {
  if (ids.length) await db('announcements').whereIn('id', ids).update({ created_at: null, updated_at: null });
  if (userIds.length) await db('users').whereIn('id', userIds).update({ created_at: null });
  console.log('R-46/R-49: created_at restored to NULL');
  await db.destroy();
}
process.exit(status);
