// Oracle test for lib/ngSanitize.js: Angular's real sanitizer (the Angular
// /article/:id page binds [innerHTML]="article.description") vs the port, on
// the same hostile/edge-case HTML. Fixture rows are inserted into
// neat_portal_test.articles (ids 9001+, status 0 = not listed anywhere) and
// removed afterwards.
//   node tests/parity/sanitizer-oracle.mjs
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve(import.meta.dirname, '../../../express-backend/package.json'));
const knex = require('knex');
const dotenv = require('dotenv');
const env = dotenv.config({ path: path.resolve(import.meta.dirname, '../../../express-backend/.env') }).parsed;
if (env.DB_DATABASE !== 'neat_portal_test') throw new Error(`refusing to write fixtures to ${env.DB_DATABASE}`);
const db = knex({ client: 'mysql2', connection: { host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USERNAME, password: env.DB_PASSWORD, database: env.DB_DATABASE } });

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';

const FIXTURES = [
  '<p style="color:red" class="x">styled <b>bold</b></p>',
  '<script>alert(1)</script>after script<style>p{}</style>after style',
  '<a href="javascript:alert(1)">js link</a> <a href="https://ok.example/x?a=1&b=2" target="_blank">ok</a> <a href="/rel">rel</a>',
  '<img src="data:image/png;base64,iVBORw0KGgo=" alt="d"><img src="x" onerror="alert(1)" srcset="a.png 1x, javascript:x 2x">',
  '<svg><circle r="5"/></svg><iframe src="https://evil.example"></iframe><form action="/x"><input value="v"><button>b</button></form>',
  '<!-- comment --><div><unknown-el>inner</unknown-el><template><b>tpl</b></template></div>',
  'Entities: &amp; &lt;tag&gt; "quotes" \'single\' © ₹ 😀 हिंदी',
  '<table><tr><td>cell<td>cell2</table><ul><li>one<li>two</ul><p>unclosed <i>italic',
  '<div title="a&quot;b" data-x="1" aria-label="ok" onclick="x()">attrs</div><font face="Arial" color="#f00">font</font>',
  '<noscript><b>ns</b></noscript><select><option>o</option></select><textarea>t</textarea><video src="v.mp4" poster="javascript:x" controls></video>',
];

const ids = FIXTURES.map((_, i) => 9001 + i);
await db('articles').whereIn('id', ids).delete();
await db('articles').insert(FIXTURES.map((description, i) => ({ id: ids[i], title: `sanitizer fixture ${i}`, description, status: 0 })));

const browser = await chromium.launch();
async function render(base, id) {
  const page = await browser.newPage();
  await page.goto(`${base}/article/${id}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('.learning_member_text p', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  const html = await page.$eval('.learning_member_text p', (p) => p.innerHTML).catch(() => '(no <p>)');
  await page.close();
  return html;
}

let failed = 0;
try {
  for (const [i, id] of ids.entries()) {
    const [a, n] = [await render(ANGULAR, id), await render(NEXT, id)];
    const same = a === n;
    if (!same) failed++;
    console.log(`${same ? 'SAME' : 'DIFF'} #${i}${same ? '' : `\n  angular ${a}\n  next    ${n}`}`);
  }
} finally {
  await browser.close();
  await db('articles').whereIn('id', ids).delete();
  await db.destroy();
}
process.exit(failed ? 1 : 0);
