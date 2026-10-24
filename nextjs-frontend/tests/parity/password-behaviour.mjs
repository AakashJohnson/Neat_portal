// Behavioural parity of /forgot-password and /reset-password.
// (Reset links are "sent" through the backend's json mail transport — no real e-mail.)
//   node tests/parity/password-behaviour.mjs
import { chromium } from '@playwright/test';
import { fixtureCredentials } from './auth.mjs';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const toasts = (page) => page.$$eval('#toast-container > *', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '));

async function forgot(browser, base, email) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const dialogs = [];
  const bodies = [];
  page.on('dialog', (d) => (dialogs.push(d.message()), d.accept()));
  page.on('request', (r) => /sendPasswordResetLink/.test(r.url()) && bodies.push(r.postData()));
  await page.goto(`${base}/forgot-password`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  if (email) await page.fill('#email', email);
  await page.click('button[type=submit]');
  await page.waitForTimeout(1500);
  const out = { toasts: await toasts(page), dialogs, bodies };
  await page.waitForTimeout(2500);
  out.path = new URL(page.url()).pathname;
  await page.close();
  return out;
}

async function reset(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const dialogs = [];
  const bodies = [];
  page.on('dialog', (d) => (dialogs.push(d.message()), d.accept()));
  page.on('request', (r) => /resetPassword/.test(r.url()) && bodies.push(r.postData()));
  await page.goto(`${base}/reset-password?token=bogus-token`, { waitUntil: 'load' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(1200);
  const disabled = () => page.$eval('button[type=submit]', (b) => b.disabled);
  const out = { initial: await disabled() };
  await page.fill('input[placeholder="Enter Email"]', 'someone@example.com');
  await page.fill('input[placeholder="Enter password"]', 'weakpass');
  await page.fill('input[placeholder="Confirm Password"]', 'weakpass');
  out.weak = await disabled();
  await page.fill('input[placeholder="Enter password"]', 'Str0ng!Pass');
  await page.fill('input[placeholder="Confirm Password"]', 'Str0ng!Pass');
  out.strong = await disabled();
  await page.hover('mat-icon');
  await page.waitForTimeout(400);
  out.tooltip = await page.evaluate(() => {
    const t = document.querySelector('.mat-tooltip');
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return `${t.textContent.trim().slice(0, 30)} @${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)} ${getComputedStyle(t).transformOrigin}`;
  });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  out.tooltipGone = await page.$('.mat-tooltip').then((e) => !e);
  await page.click('button[type=submit]');
  await page.waitForTimeout(2000);
  Object.assign(out, { dialogs, bodies, toasts: await toasts(page), path: new URL(page.url()).pathname });
  await page.close();
  return out;
}

const browser = await chromium.launch();
const fixture = (await fixtureCredentials('learner')).username;
const runs = [
  ['forgot empty', (b) => forgot(b, ANGULAR, null), (b) => forgot(b, NEXT, null)],
  ['forgot unknown', (b) => forgot(b, ANGULAR, 'nobody@example.invalid'), (b) => forgot(b, NEXT, 'nobody@example.invalid')],
  ['forgot fixture', (b) => forgot(b, ANGULAR, fixture), (b) => forgot(b, NEXT, fixture)],
  ['reset', (b) => reset(b, ANGULAR), (b) => reset(b, NEXT)],
];
let failed = 0;
for (const [name, fa, fn] of runs) {
  const a = await fa(browser);
  const n = await fn(browser);
  const same = JSON.stringify(a) === JSON.stringify(n);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${name} ${JSON.stringify(a).replace(fixture, '<fixture>')}${same ? '' : `\n  next ${JSON.stringify(n).replace(fixture, '<fixture>')}`}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
