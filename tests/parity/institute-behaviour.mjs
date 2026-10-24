// Behavioural parity of the institute area (fixture institute, neat_portal_test).
// "Edit" deletes the institute_details row and SUBMIT inserts one, so the rows
// of the fixture's e-mail are deleted and re-inserted from the snapshot before
// each app's run.
//   node tests/parity/institute-behaviour.mjs
import { chromium } from '@playwright/test';
import { fixtureToken, loggedInContext } from './auth.mjs';
import { snapshot, testDb } from './db.mjs';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important}';

const state = (page) =>
  page.evaluate(() => {
    const f = document.querySelector('form#contact-form');
    const table = [...document.querySelectorAll('table tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
    const upload = !!document.querySelector('input[type=file]');
    if (!f) return { table, upload };
    return {
      inputs: [...f.querySelectorAll('input')].map((i) => `${i.placeholder}=${i.value}`).join(' | '),
      select: [...f.querySelectorAll('mat-select')].map((s) => `${s.textContent.trim()}${s.classList.contains('mat-select-invalid') ? '!' : ''}`).join(' | '),
      errors: [...f.querySelectorAll('mat-error')].map((e) => e.textContent.trim()).join(' | '),
      upload,
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
    const m = r.url().match(/\/(getInstituteDetails|submitInstituteDetails|editInstituteDetails|getStudents|checkFileUpload|getStates)\b/);
    if (m) calls.push(`${r.method()} ${m[1]} ${r.postData() ?? ''}`);
  });
  const settle = async (ms = 1500) => {
    await page.waitForTimeout(ms);
    await page.addStyleTag({ content: FREEZE }).catch(() => {});
  };
  const type = async (placeholder, text) => {
    await page.click(`form#contact-form input[placeholder="${placeholder}"]`);
    await page.keyboard.type(text);
  };
  const out = {};
  await page.goto(`${base}/institute`, { waitUntil: 'load' });
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
  await type('Name of Institution', 'Parity Institute');
  await type('Mobile Number (to be valid)', '98a765');
  await type('Landline Number', '0112345678901234');
  await type('No. of Students', '1x20');
  await page.click('button[type=submit]');
  await settle(800);
  out.partialSubmit = await state(page);
  await type('Mobile Number (to be valid)', '01234');
  await type('Email', 'director@example.com');
  await type('Address', '1 Parity Road');
  await type('NEAT Coordinator', 'Coordinator');
  await type('Email of NEAT Coordinator', 'coordinator@example.com');
  await page.click('form#contact-form mat-select');
  await settle(600);
  await page.locator('mat-option').nth(3).click();
  await settle(600);
  out.filled = await state(page);
  await page.click('button[type=submit]');
  await settle(3000);
  out.submitted = await state(page);
  for (const route of ['/institute/institute-details', '/institute/file-upload', '/institute/student-details']) {
    await goto(base + route);
    await settle(3000);
    out[route] = await page.evaluate(() =>
      [...document.querySelectorAll('h2, h3, p, th, td, .mat-header-cell, .mat-cell, .mat-paginator-range-label, form#contact-form input')]
        .map((e) => (e.tagName === 'INPUT' ? `${e.placeholder}=${e.value}` : e.textContent.replace(/\s+/g, ' ').trim()))
        .join(' | '),
    );
  }
  await page.fill('.mat-form-field input', 'zz-no-match');
  await page.keyboard.press('End');
  await settle(800);
  out.search = await page.evaluate(() => [...document.querySelectorAll('.mat-row, .no-records-found, .mat-paginator-range-label')].map((e) => e.textContent.trim()).join(' | '));
  out.dialogs = dialogs;
  out.calls = calls;
  await drainToasts();
  out.toasts = allToasts;
  await ctx.close();
  return out;
}

const db = testDb();
const token = await fixtureToken('institute');
const email = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).email;
const saved = await snapshot(db, 'institute_details', { institute_email: email });
const reset = async () => {
  await db('institute_details').where('institute_email', email).delete();
  if (saved.length) await db('institute_details').insert(saved);
};
const browser = await chromium.launch();
let a, n;
try {
  await reset();
  a = await run(browser, ANGULAR, await fixtureToken('institute'));
  await reset();
  n = await run(browser, NEXT, await fixtureToken('institute'));
} finally {
  await reset();
  await db.destroy();
  await browser.close();
}
if (process.env.PARITY_VERBOSE) console.log(JSON.stringify(a, null, 1));
let failed = 0;
for (const k of Object.keys(a)) {
  const same = JSON.stringify(a[k]) === JSON.stringify(n[k]);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${k}${same ? '' : `\n  angular ${JSON.stringify(a[k])}\n  next    ${JSON.stringify(n[k])}`}`);
}
process.exit(failed ? 1 : 0);
