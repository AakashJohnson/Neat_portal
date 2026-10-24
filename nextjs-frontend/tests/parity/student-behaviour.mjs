// Behavioural parity of the student area (fixture student, neat_portal_test).
// Profile submit writes the student's own details back (same values + edits).
//   node tests/parity/student-behaviour.mjs
import { chromium } from '@playwright/test';
import { fixtureCredentials, fixtureToken, loggedInContext } from './auth.mjs';
import { restore, snapshot, testDb } from './db.mjs';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important}';
const freeCode = (await (await fetch('http://localhost:4000/api/getB2CProductsLandingPage')).json()).products[0].code;

const formState = (page) =>
  page.evaluate(() => {
    const f = document.querySelector('form');
    if (!f) return { view: [...document.querySelectorAll('table tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()).join(' | ') };
    return {
      inputs: [...f.querySelectorAll('input')].map((i) => `${i.placeholder}=${i.value}${i.disabled ? '[d]' : ''}${i.getAttribute('aria-invalid') === 'true' ? '[!]' : ''}`).join(' | '),
      selects: [...f.querySelectorAll('mat-select')].map((s) => `${s.getAttribute('placeholder') ?? ''}:${s.querySelector('.mat-select-value').textContent.trim()}${s.classList.contains('mat-select-disabled') ? '[d]' : ''}${s.classList.contains('mat-select-invalid') ? '[!]' : ''}`).join(' | '),
      errors: [...f.querySelectorAll('mat-error')].map((e) => e.textContent.trim()).join(' | '),
    };
  });

const calendar = (page) =>
  page.evaluate(() => {
    const pane = document.querySelector('.mat-datepicker-popup');
    if (!pane || !pane.querySelector('mat-calendar')) return null; // Angular keeps the detached pane
    const r = pane.getBoundingClientRect();
    const cells = [...pane.querySelectorAll('td.mat-calendar-body-cell')].map(
      (td) => `${td.textContent.trim()}${td.classList.contains('mat-calendar-body-disabled') ? 'x' : ''}${td.classList.contains('mat-calendar-body-active') ? 'a' : ''}${td.querySelector('.mat-calendar-body-selected') ? 's' : ''}`,
    );
    return {
      box: [r.left, r.top, r.width, r.height].map(Math.round).join(','),
      header: pane.querySelector('.mat-calendar-period-button').textContent.trim(),
      prevDisabled: pane.querySelector('.mat-calendar-previous-button').disabled,
      nextDisabled: pane.querySelector('.mat-calendar-next-button').disabled,
      labels: [...pane.querySelectorAll('.mat-calendar-body-label')].map((l) => l.textContent.trim()).join(','),
      cells: cells.join(' '),
      focused: document.activeElement?.textContent?.trim() ?? null,
    };
  });

async function run(browser, base) {
  const ctx = await loggedInContext(browser, base, await fixtureToken('student'), { viewport: { width: 1440, height: 900 } });
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
  const calls = [];
  page.on('request', (r) => {
    const m = r.url().match(/\/(getStudentDetails|getStates|getCollegeNames|submitStudentDetails|editStudentDetails|getPurchasedProducts|getFreeProducts|sendFreeSeatVerificationMail|checkCompanySecretCode|getProductDetails)\b/);
    if (m) calls.push(`${m[1]} ${r.postData() ?? ''}`);
  });
  const out = {};
  const settle = async (ms = 1500) => {
    await page.waitForTimeout(ms);
    await page.addStyleTag({ content: FREEZE }).catch(() => {});
  };

  await page.goto(`${base}/student/profile`, { waitUntil: 'load' });
  await settle(3500);
  out.view = await formState(page);
  await page.click('button:has-text("Edit")');
  await settle(2500);
  out.edit = await formState(page);

  await page.click('mat-datepicker-toggle button');
  await settle(600);
  out.calOpen = await calendar(page);
  await page.click('.mat-calendar-previous-button');
  await settle(200);
  out.calPrev = await calendar(page);
  await page.click('.mat-calendar-period-button');
  await settle(200);
  out.calMulti = await calendar(page);
  await page.locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').nth(3).click();
  await settle(200);
  out.calYear = await calendar(page);
  await page.locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').nth(5).click();
  await settle(200);
  out.calMonth = await calendar(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await settle(200);
  out.calKeys = await calendar(page);
  await page.keyboard.press('Enter');
  await settle(600);
  out.picked = { cal: await calendar(page), form: await formState(page) };

  if (process.env.DEBUG_STUDENT) {
    console.log(base, JSON.stringify(out).slice(0, 4000));
    console.log(await page.evaluate(() => [...document.querySelectorAll('mat-select')].map((s) => s.outerHTML.slice(0, 200)).join('\n')));
  }
  await page.locator('mat-select[placeholder="College state"] .mat-select-trigger').click();
  await settle(500);
  await page.locator('.mat-select-panel mat-option').nth(2).click();
  await settle(2500);
  out.collegeState = await formState(page);
  await page.locator('mat-select[placeholder="College Name"] .mat-select-trigger').click();
  await settle(500);
  await page.locator('.mat-select-panel mat-option', { hasText: 'Other' }).click();
  await settle(600);
  out.other = await formState(page);
  await page.click('button[type=submit]');
  await settle(1000);
  out.invalidSubmit = await formState(page);
  const other = page.locator('input[placeholder="Enter College Name"]');
  out.otherVisible = await other.isVisible();
  if (out.otherVisible) await other.fill('  Parity College  ');
  await page.click('button[type=submit]');
  await settle(3500);
  out.submitted = await formState(page);

  for (const route of ['/student/paid-Products-details-checkout', '/student/free-Products-details-checkout', '/student/platform', `/student/free-course-details/${freeCode}`]) {
    await goto(base + route);
    await settle(2500);
    out[route.replace(freeCode, ':code')] = await page.evaluate(() => [...document.querySelectorAll('h2, h3, td, .btnFreeCvd, .viewscount')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 25).join(' | ').replace(/Total Views - \d+/, 'Total Views - N'));
  }
  await page.click('.btnFreeCvd');
  await settle(3000);
  out.avail = new URL(page.url()).pathname;
  await page.fill('#company_secret_code', 'WRONG');
  await page.click('button[type=submit]');
  await settle(2500);
  out.calls = calls;
  await drainToasts();
  out.toasts = allToasts;
  await ctx.close();
  return out;
}

// Both runs submit the profile: each starts from the same student_details row.
const db = testDb();
const studentEmail = (await fixtureCredentials('student')).username;
const saved = await snapshot(db, 'student_details', { email: studentEmail });
const browser = await chromium.launch();
await restore(db, 'student_details', saved);
const a = await run(browser, ANGULAR);
await restore(db, 'student_details', saved);
const n = await run(browser, NEXT);
await restore(db, 'student_details', saved);
await db.destroy();
await browser.close();
let failed = 0;
for (const k of Object.keys(a)) {
  const same = JSON.stringify(a[k]) === JSON.stringify(n[k]);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${k}${same ? '' : `\n  angular ${JSON.stringify(a[k])}\n  next    ${JSON.stringify(n[k])}`}`);
}
process.exit(failed ? 1 : 0);
