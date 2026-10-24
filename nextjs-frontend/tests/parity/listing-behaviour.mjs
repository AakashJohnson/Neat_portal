// Behavioural parity of /course and /b2b-course: category list slideToggle,
// bucket filtering, search (raw query string as sent), card navigation.
// GET responses are pinned per route (inRandomOrder() listings).
//   node tests/parity/listing-behaviour.mjs
import { chromium } from '@playwright/test';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const API_GET = /^https?:\/\/localhost:(4000\/api|\d+\/bff)\//;

async function run(browser, base, route, pinned) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const queries = [];
  await page.route(API_GET, async (r) => {
    const req = r.request();
    const url = req.url().replace(API_GET, '');
    if (/BucketWise/.test(url)) queries.push(url.replace(/^[^?]*\?/, '').replace(/&?token=[^&]*/, ''));
    const key = url.replace(/([?&])token=[^&]*&?/, '$1');
    try {
      if (!pinned.has(key)) pinned.set(key, r.fetch().then(async (res) => ({ status: res.status(), headers: res.headers(), body: await res.body() })));
      const res = await pinned.get(key);
      await r.fulfill(res);
    } catch {
      pinned.delete(key); // page closed while the request was in flight
    }
  });
  await page.goto(base + route, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('.lstCatIn', { timeout: 30000 });
  const snap = () =>
    page.evaluate(() => ({
      cards: document.querySelectorAll('.lstCat').length,
      first: document.querySelector('.lstCat h2')?.textContent.trim() ?? null,
      list: (() => {
        const el = document.querySelector('.browsLstCnt');
        return `${getComputedStyle(el).display}:${Math.round(el.getBoundingClientRect().height)}:${el.style.overflow}`;
      })(),
      href: document.querySelector('.lstCatIn > a')?.getAttribute('href') ?? null,
    }));
  const out = { initial: await snap() };
  await page.locator('.browsLstCnt li a').nth(2).click();
  await page.waitForTimeout(800);
  out.bucket = await snap();
  await page.fill('.search-input', 'C++ & x');
  await page.click('.search-btn');
  await page.waitForTimeout(800);
  out.search = await snap();
  await page.locator('.browsLstCnt li a').first().click();
  await page.waitForTimeout(800);
  await page.click('.browsHdng');
  await page.waitForTimeout(300);
  out.sliding = (await snap()).list.split(':')[0];
  await page.waitForTimeout(600);
  out.collapsed = (await snap()).list;
  await page.click('.browsHdng');
  await page.waitForTimeout(900);
  out.expanded = (await snap()).list;
  // The card can be outside the scroll panel's visible area; dispatch the click.
  await page.$eval('.lstCatIn > a', (a) => a.click());
  await page.waitForURL(/details/, { timeout: 15000 }).catch(() => {});
  out.navigated = new URL(page.url()).pathname.replace(/\/[^/]+$/, '/:code');
  out.queries = queries;
  await page.close();
  return out;
}

const browser = await chromium.launch();
let failed = 0;
for (const route of ['/course', '/b2b-course']) {
  const pinned = new Map();
  const a = await run(browser, ANGULAR, route, pinned);
  const n = await run(browser, NEXT, route, pinned);
  for (const k of Object.keys(a)) {
    const same = JSON.stringify(a[k]) === JSON.stringify(n[k]);
    if (!same) failed++;
    console.log(`${same ? 'SAME' : 'DIFF'} ${route} ${k}${same ? '' : `\n  angular ${JSON.stringify(a[k])}\n  next    ${JSON.stringify(n[k])}`}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
