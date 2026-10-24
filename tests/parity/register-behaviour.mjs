// Behavioural parity of /register: role select (projected <option>, dynamic
// fields and validators), keypress filters, validation toasts, API 422 toasts
// (one per field), and a successful registration (writes to neat_portal_test).
//   node tests/parity/register-behaviour.mjs
import { chromium } from '@playwright/test';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const stamp = Date.now().toString().slice(-7);

const snap = (page) =>
  page.evaluate(() => ({
    fields: [...document.querySelectorAll('form input')].map((i) => `${i.placeholder}=${i.value}`).join(' | '),
    select: (() => {
      const s = document.querySelector('mat-select');
      return `${[...s.classList].filter((c) => /^mat-select-(empty|invalid|required)$/.test(c)).sort().join('.')}:${s.querySelector('.mat-select-value').textContent.trim()}`;
    })(),
    panel: (() => {
      const p = document.querySelector('.mat-select-panel');
      if (!p) return null;
      const r = p.getBoundingClientRect();
      return `${[...p.children].map((c) => `${c.tagName}${c.classList.contains('mat-active') ? '*' : ''}:${c.textContent.trim()}`).join(',')} @${Math.round(r.top)},${Math.round(r.height)}`;
    })(),
    toasts: [...document.querySelectorAll('#toast-container > *')].map((t) => t.textContent.replace(/\s+/g, ' ').trim()).join(' | '),
  }));

async function run(browser, base, n) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bodies = [];
  page.on('request', (r) => /\/register\b/.test(r.url()) && r.method() === 'POST' && bodies.push(r.postData()));
  await page.goto(`${base}/register`, { waitUntil: 'load' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(1500);
  const out = { initial: await snap(page) };
  await page.click('button[type=submit]');
  await page.waitForTimeout(500);
  out.emptySubmit = await snap(page);
  await page.click('mat-select .mat-select-trigger');
  await page.waitForTimeout(400);
  out.panel = await snap(page);
  await page.locator('.mat-select-panel mat-option', { hasText: 'Student' }).click();
  await page.waitForTimeout(400);
  out.student = await snap(page);
  await page.click('mat-select .mat-select-trigger');
  await page.waitForTimeout(400);
  await page.locator('.mat-select-panel mat-option', { hasText: 'Institute' }).click();
  await page.waitForTimeout(400);
  out.institute = await snap(page);
  await page.click('mat-select .mat-select-trigger');
  await page.waitForTimeout(400);
  await page.locator('.mat-select-panel mat-option', { hasText: 'Learner' }).click();
  await page.waitForTimeout(400);
  out.learner = await snap(page);
  await page.click('#name');
  await page.keyboard.type('Parity Learner');
  await page.click('#phone');
  await page.keyboard.type('98x765');
  await page.click('#email');
  await page.keyboard.type(`parity ${n}${stamp}@example.com`);
  await page.fill('#password', 'Passw0rd!x');
  await page.fill('#password_confirmation', 'Mismatch1!');
  await page.waitForTimeout(1500); // past the 3 s toast lifetime (activation tick differs by ~60 ms)
  out.typed = await snap(page);
  await page.click('button[type=submit]');
  await page.waitForTimeout(800);
  out.shortPhone = await snap(page);
  await page.click('#phone');
  await page.keyboard.type((n === 'a' ? '1' : '2') + stamp.slice(-4)); // unique phone per app run
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
  out.mismatch = await snap(page);
  await page.fill('#password_confirmation', 'Passw0rd!x');
  await page.click('button[type=submit]');
  await page.waitForTimeout(3000);
  out.success = (await snap(page)).toasts.split(' | ').pop();
  out.requests = bodies.map((b) => b.replace(/parity\w*@example\.com/, 'parity@…'));
  await page.close();
  return out;
}

const browser = await chromium.launch();
const a = await run(browser, ANGULAR, 'a');
const b = await run(browser, NEXT, 'n');
await browser.close();
let failed = 0;
// Per-app unique values (email marker a/n, phone digit 1/2) are normalised.
const norm = (v) => JSON.stringify(v).replace(/parity[an]\d+@/g, 'parity#@').replace(/98765[12]\d{4}/g, '98765#####');
for (const k of Object.keys(a)) {
  const same = norm(a[k]) === norm(b[k]);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${k}${same ? '' : `\n  angular ${JSON.stringify(a[k])}\n  next    ${JSON.stringify(b[k])}`}`);
}
process.exit(failed ? 1 : 0);
