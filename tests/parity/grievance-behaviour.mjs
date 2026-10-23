// Behavioural parity of /grievance (mat-select overlay + positioning,
// keypress filters, mat-error visibility, dynamic validators, submit).
// Submits one grievance into neat_portal_test per app.
//   node tests/parity/grievance-behaviour.mjs [--role=admin]   (logged in: companies load)
import { chromium } from '@playwright/test';
import { fixtureToken, loggedInContext } from './auth.mjs';

const role = process.argv.find((a) => a.startsWith('--role='))?.slice(7);
const token = role ? await fixtureToken(role) : null;

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important}';

const state = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)].join(',');
    };
    const pane = document.querySelector('.cdk-overlay-pane');
    const panel = document.querySelector('.mat-select-panel');
    return {
      errors: [...document.querySelectorAll('mat-error')].map((e) => e.textContent.trim()).join(' | '),
      inputs: [...document.querySelectorAll('form input, form textarea')].map((i) => i.value).join(' | '),
      selects: [...document.querySelectorAll('mat-select')]
        .map((s) => `${[...s.classList].filter((c) => /^mat-select-(empty|invalid)$/.test(c)).sort().join('.')}:${s.querySelector('.mat-select-value').textContent.trim()}`)
        .join(' | '),
      panel: panel
        ? {
            pane: r(pane),
            panel: r(panel),
            scrollTop: panel.scrollTop,
            options: [...panel.querySelectorAll('mat-option')].length,
            active: [...panel.querySelectorAll('mat-option.mat-active')].map((o) => o.textContent.trim()).join(),
            selected: [...panel.querySelectorAll('mat-option.mat-selected')].map((o) => o.textContent.trim()).join(),
            backdrop: !!document.querySelector('.cdk-overlay-backdrop'),
          }
        : null,
      toasts: [...document.querySelectorAll('#toast-container .toast-message')].map((t) => t.textContent.trim()).join(' | '),
    };
  });

async function run(browser, base) {
  const context = token ? await loggedInContext(browser, base, token, { viewport: { width: 1440, height: 900 } }) : await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const bodies = [];
  page.on('request', (r) => {
    if (/\/(submitGrievance|getCompanyWiseProduct)\b/.test(r.url())) bodies.push(`${r.url().match(/\/(\w+)\?|\/(\w+)$/).slice(1).find(Boolean)} ${r.postData()}`);
  });
  await page.goto(`${base}/grievance`, { waitUntil: 'load', timeout: 90000 });
  await page.addStyleTag({ content: FREEZE });
  await page.waitForTimeout(2000);
  const out = { initial: await state(page) };

  await page.click('#full-name');
  await page.keyboard.type('Ab1 c2', { delay: 10 });
  await page.click('#email');
  await page.keyboard.type('par ity@example.test', { delay: 10 });
  await page.click('#mobile-number');
  await page.keyboard.type('98a7654321099', { delay: 10 });
  out.typed = await state(page);

  await page.click('button[type=submit]');
  await page.waitForTimeout(600);
  out.invalidSubmit = await state(page);

  await page.locator('mat-select').nth(0).locator('.mat-select-trigger').click();
  await page.waitForTimeout(400);
  out.typeOpen = await state(page);
  await page.locator('.mat-select-panel mat-option', { hasText: 'Product related' }).click();
  await page.waitForTimeout(800);
  out.productRelated = await state(page);

  await page.locator('mat-select').nth(1).locator('.mat-select-trigger').click();
  await page.waitForTimeout(400);
  out.companyOpen = await state(page);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  out.companyChosen = await state(page);

  await page.locator('mat-select').nth(1).locator('.mat-select-trigger').click();
  await page.waitForTimeout(400);
  out.companyReopen = await state(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await page.locator('mat-select').nth(2).locator('.mat-select-trigger').click();
  await page.waitForTimeout(400);
  out.productOpen = await state(page);
  await page.locator('.mat-select-panel mat-option').nth(1).click().catch(() => page.keyboard.press('Escape'));
  await page.waitForTimeout(400);

  await page.fill('#organization', 'Parity Org');
  await page.fill('textarea', 'Parity grievance description');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
  out.validSubmit = await state(page);
  // emailValidator only accepts a 2-3 letter TLD; fix the email and submit for real.
  await page.fill('#email', `parity${role ? '-' + role : ''}@example.com`);
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
  out.realSubmit = await state(page);
  out.requests = bodies;
  await context.close();
  return out;
}

const browser = await chromium.launch();
const a = await run(browser, ANGULAR);
const n = await run(browser, NEXT);
await browser.close();
let failed = 0;
for (const k of Object.keys(a)) {
  const same = JSON.stringify(a[k]) === JSON.stringify(n[k]);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${k}${same ? '' : `\n  angular ${JSON.stringify(a[k])}\n  next    ${JSON.stringify(n[k])}`}`);
}
process.exit(failed ? 1 : 0);
