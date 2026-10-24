// Behavioural parity of /course-details/:code (Bootstrap modal + accordion,
// Enroll/Buy flows, DataService hand-off to /payment-redirect).
//   node tests/parity/details-behaviour.mjs
import { chromium } from '@playwright/test';
import { fixtureToken, loggedInContext } from './auth.mjs';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const API = 'http://localhost:4000';
const code = (await (await fetch(`${API}/api/getB2CProductsLandingPage`)).json()).products[0].code;

const snap = (page) =>
  page.evaluate(() => {
    const m = document.getElementById('bookYourPaidSeat');
    return {
      path: location.pathname,
      body: document.body.className,
      backdrops: [...document.querySelectorAll('.modal-backdrop')].map((b) => b.className).join('|'),
      modal: m ? `${m.className}|${m.style.display}|${m.getAttribute('aria-hidden')}` : null,
      buttons: [...document.querySelectorAll('.btnFreeCvd')].map((b) => b.textContent.trim()).join(','),
      head: document.querySelector('.detlCarDivHdng')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      // view_counter increments on every load (getProductDetails side effect): digits masked.
      views: document.querySelector('.viewscount')?.textContent.replace(/\s+/g, ' ').trim().replace(/\d+/, 'N') ?? null,
      accordion: [...document.querySelectorAll('#accordion .panel-title a')].map((a) => `${a.classList.contains('collapsed') ? 'c' : '-'}${a.getAttribute('aria-expanded')}`).join(' ') +
        ' / ' + [...document.querySelectorAll('#accordion .panel-collapse')].map((p) => [...p.classList].filter((c) => c !== 'panel-collapse').join('.')).join(' '),
      red: !!document.querySelector('.modal-body span[style*="red"]'),
      storage: ['paidCode', 'loggedIn'].map((k) => `${k}=${localStorage.getItem(k)}`).join(','),
    };
  });

async function run(browser, base, role) {
  const token = role ? await fixtureToken(role) : null;
  const ctx = token ? await loggedInContext(browser, base, token, { viewport: { width: 1440, height: 900 } }) : await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const dialogs = [];
  const bodies = [];
  const applies = [];
  page.on('request', (r) => /\/applyForPaidCourse\b/.test(r.url()) && applies.push(r.postData()));
  page.on('dialog', (d) => (dialogs.push(d.message()), d.accept()));
  page.on('request', (r) => {
    const m = r.url().match(/\/(getProductDetails|getComments)\b/);
    if (m) bodies.push(`${m[1]} ${r.postData()}`);
  });
  await page.goto(`${base}/course-details/${code}`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.querySelectorAll('video').forEach((v) => (v.muted = true, v.pause())));
  const out = { initial: await snap(page) };

  const accordion = page.locator('#accordion .panel-title a');
  await accordion.nth(1).click();
  await page.waitForTimeout(700);
  out.acc1 = (await snap(page)).accordion;
  await accordion.nth(0).click();
  await page.waitForTimeout(700);
  out.acc2 = (await snap(page)).accordion;
  await accordion.nth(1).click();
  await page.waitForTimeout(700);
  out.acc3 = (await snap(page)).accordion;

  if (!role) {
    await page.locator('.btnFreeCvd').click();
    await page.waitForTimeout(1500);
    out.enroll = { ...(await snap(page)), dialogs };
  } else {
    await page.locator('.btnFreeCvd').click();
    await page.waitForTimeout(60);
    out.opening = await snap(page);
    await page.waitForTimeout(700);
    out.open = await snap(page);
    await page.click('#bookYourPaidSeat button[type=submit]');
    await page.waitForTimeout(300);
    out.submitUnchecked = await snap(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    out.closing = await snap(page);
    await page.waitForTimeout(700);
    out.closed = await snap(page);
    await page.locator('.btnFreeCvd').click();
    await page.waitForTimeout(700);
    await page.check('#bookYourPaidSeat input[type=checkbox]');
    out.checked = await snap(page);
    await page.click('#bookYourPaidSeat button[type=submit]');
    // payment-redirect follows redirect_url with a full page load.
    await page.waitForURL((u) => !/course-details|payment-redirect/.test(u.pathname), { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('load');
    out.submitted = new URL(page.url()).pathname;
    out.redirectCall = applies.slice();
  }
  out.requests = bodies;
  await ctx.close();
  return out;
}

const browser = await chromium.launch();
let failed = 0;
for (const role of [null, 'student']) {
  const a = await run(browser, ANGULAR, role);
  const n = await run(browser, NEXT, role);
  for (const k of Object.keys(a)) {
    const same = JSON.stringify(a[k]) === JSON.stringify(n[k]);
    if (!same) failed++;
    console.log(`${same ? 'SAME' : 'DIFF'} ${role ?? 'guest'} ${k}${same ? '' : `\n  angular ${JSON.stringify(a[k])}\n  next    ${JSON.stringify(n[k])}`}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
