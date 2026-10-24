// Behavioural parity of the learner area (fixture learner, neat_portal_test).
// The learner row is restored before each app's run.
//   node tests/parity/learner-behaviour.mjs
import { chromium } from '@playwright/test';
import { fixtureToken, loggedInContext } from './auth.mjs';
import { restore, snapshot, testDb } from './db.mjs';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important}';

const state = (page) =>
  page.evaluate(() => {
    const f = document.querySelector('form');
    const table = [...document.querySelectorAll('table tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
    if (!f) return { table };
    return {
      inputs: [...f.querySelectorAll('input:not([type=radio])')].map((i) => `${i.placeholder}=${i.value}`).join(' | '),
      radio: [...f.querySelectorAll('mat-radio-button')].map((r) => `${r.textContent.trim()}${r.classList.contains('mat-radio-checked') ? '*' : ''}`).join(' '),
      labels: [...f.querySelectorAll('mat-label')].map((l) => l.textContent.trim()).join(' | '),
      errors: [...f.querySelectorAll('mat-error')].map((e) => e.textContent.trim()).join(' | '),
    };
  });

async function run(browser, base, token) {
  const ctx = await loggedInContext(browser, base, token, { viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    window.__toasts = [];
    const seen = new WeakSet();
    setInterval(() => {
      document.querySelectorAll('#toast-container > *').forEach((t) => {
        const text = t.textContent.replace(/\s+/g, ' ').trim();
        if (!seen.has(t) && text) (seen.add(t), window.__toasts.push(text));
      });
    }, 100);
  });
  const page = await ctx.newPage();
  const allToasts = [];
  const drainToasts = async () => allToasts.push(...(await page.evaluate(() => window.__toasts ?? []).catch(() => [])));
  const goto = async (url) => {
    await drainToasts();
    await page.goto(url, { waitUntil: 'load' });
  };
  const dialogs = [];
  const calls = [];
  page.on('dialog', (d) => (dialogs.push(d.message()), d.accept()));
  page.on('request', (r) => {
    const m = r.url().match(/\/(getLearnerDetails|submitLearnerDetails|editLearnerDetails|getPurchasedProducts|getFreeProducts)\b/);
    if (m) calls.push(`${m[1]} ${r.postData() ?? ''}`);
  });
  const settle = async (ms = 1500) => {
    await page.waitForTimeout(ms);
    await page.addStyleTag({ content: FREEZE }).catch(() => {});
  };
  const out = {};
  await page.goto(`${base}/learner`, { waitUntil: 'load' });
  await settle(3500);
  out.initial = await state(page);
  if (await page.$('button:has-text("Edit")')) {
    await page.click('button:has-text("Edit")');
    await settle(2500);
  }
  out.edit = await state(page);
  await page.click('button:has-text("RESET")');
  await settle(500);
  out.reset = await state(page);
  await page.click('button[type=submit]');
  await settle(800);
  out.untouchedSubmit = await state(page);
  await page.click('input[placeholder=Age]');
  await page.keyboard.type('12345');
  await page.click('input[placeholder=Profession]');
  await page.keyboard.type('Tester');
  await page.click('button[type=submit]');
  await settle(800);
  out.partialSubmit = await state(page);
  await page.click('mat-radio-button:has-text("Female") label');
  await page.click('mat-datepicker-toggle button');
  await settle(500);
  await page.locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').nth(9).click();
  await settle(500);
  out.filled = await state(page);
  await page.click('button[type=submit]');
  await settle(3000);
  out.submitted = await state(page);
  for (const route of ['/learner/learner-paid-course', '/learner/learner-free-course']) {
    await goto(base + route);
    await settle(2500);
    out[route] = await page.evaluate(() => [...document.querySelectorAll('h3, td')].map((e) => e.textContent.trim()).join(' | '));
  }
  out.dialogs = dialogs;
  out.calls = calls.map((c) => c.replace(/"date_of_birth":"[^"]*"/, '"date_of_birth":"<picked>"'));
  await drainToasts();
  out.toasts = allToasts;
  await ctx.close();
  return out;
}

const db = testDb();
const token = await fixtureToken('learner');
const appNo = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).application_number;
const saved = await snapshot(db, 'learner', { application_number: appNo });
const browser = await chromium.launch();
await restore(db, 'learner', saved, ['application_number']);
const a = await run(browser, ANGULAR, await fixtureToken('learner'));
await restore(db, 'learner', saved, ['application_number']);
const n = await run(browser, NEXT, await fixtureToken('learner'));
await restore(db, 'learner', saved, ['application_number']);
await db.destroy();
await browser.close();
let failed = 0;
for (const k of Object.keys(a)) {
  const same = JSON.stringify(a[k]) === JSON.stringify(n[k]);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${k}${same ? '' : `\n  angular ${JSON.stringify(a[k])}\n  next    ${JSON.stringify(n[k])}`}`);
}
process.exit(failed ? 1 : 0);
