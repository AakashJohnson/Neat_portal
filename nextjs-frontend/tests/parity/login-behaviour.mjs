// Behavioural parity of /login: validation toast, API error toast, and the
// post-login navigation for every fixture role.
//   node tests/parity/login-behaviour.mjs
import { chromium } from '@playwright/test';
import { fixtureCredentials } from './auth.mjs';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';

const toasts = (page) => page.$$eval('#toast-container > *', (els) => els.map((e) => `${[...e.classList].filter((c) => /^toast-(success|error|info|warning)$/.test(c))}:${e.textContent.replace(/\s+/g, ' ').trim()}`));

async function attempt(browser, base, username, password) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/login`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  if (username != null) await page.fill('#email', username);
  if (password != null) await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
  const out = { path: new URL(page.url()).pathname, toasts: await toasts(page) };
  await page.close();
  return out;
}

const browser = await chromium.launch();
const cases = [
  ['empty', null, null],
  ['wrong password', (await fixtureCredentials('student')).username, 'not-the-password'],
  ['unknown user', 'nobody@example.invalid', 'whatever'],
];
for (const role of ['admin', 'student', 'company', 'institute', 'learner']) {
  const c = await fixtureCredentials(role);
  cases.push([`login ${role}`, c.username, c.password]);
}
let failed = 0;
for (const [name, u, p] of cases) {
  const a = await attempt(browser, ANGULAR, u, p);
  const n = await attempt(browser, NEXT, u, p);
  const same = JSON.stringify(a) === JSON.stringify(n);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${name} ${JSON.stringify(a)}${same ? '' : `\n  next ${JSON.stringify(n)}`}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
