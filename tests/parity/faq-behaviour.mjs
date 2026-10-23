// Behavioural parity of the FAQ accordion (Bootstrap 4 collapse via jQuery in
// Angular vs useBsCollapse in Next.js): classes, aria-expanded and heights of
// triggers/panels mid-transition and after each click sequence.
//   node tests/parity/faq-behaviour.mjs
import { chromium } from '@playwright/test';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const ROUTES = ['/faqs-student', '/faqs-companies', '/faqs-institutes'];
// card index to click; 'wait' lets the 350 ms transition finish; 'mid' samples during it.
const STEPS = [0, 'mid', 'wait', 1, 'wait', 0, 'wait', 0, 0, 'wait'];

const snapshot = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.accordion .card')].slice(0, 3).map((card) => {
      const a = card.querySelector('a.btn-link');
      const panel = card.querySelector('[id^=collapseOne_]');
      return `${[...a.classList].includes('collapsed') ? 'c' : '-'}${a.getAttribute('aria-expanded') ?? '?'}/${[...panel.classList].sort().join('.')}/${panel.style.height ? 'h' : ''}`;
    }).join(' '),
  );

async function run(browser, base, route) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + route, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('.accordion .card a.btn-link');
  const out = [await snapshot(page)];
  for (const step of STEPS) {
    if (step === 'wait') await page.waitForTimeout(700);
    else if (step === 'mid') await page.waitForTimeout(100);
    else await page.locator('.accordion .card a.btn-link').nth(step).click();
    if (step === 'wait' || step === 'mid') out.push(await snapshot(page));
  }
  out.push(page.url().replace(base, ''));
  await page.close();
  return out;
}

const browser = await chromium.launch();
let failed = 0;
for (const route of ROUTES) {
  const [a, n] = await Promise.all([run(browser, ANGULAR, route), run(browser, NEXT, route)]);
  const same = JSON.stringify(a) === JSON.stringify(n);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${route}`);
  if (!same) a.forEach((s, i) => console.log(`  ${s === n[i] ? ' ' : '≠'} angular ${s}\n    next    ${n[i]}`));
}
await browser.close();
process.exit(failed ? 1 : 0);
