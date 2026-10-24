// Behavioural parity of the gallery lightbox (modal.js in Angular vs
// LightboxGallery in Next.js): the same click sequence must leave the same
// modal state (visible? which slide?) after every step.
//   node tests/parity/gallery-behaviour.mjs
import { chromium } from '@playwright/test';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const ROUTES = ['/gallery-photo', '/woman-empowerment-gallery', '/student-learners-gallery', '/institution-gallery', '/user-manual-gallery'];
// [action, argument]: thumb i = click the i-th thumbnail; prev/next/close.
const STEPS = [['thumb', 0], ['next'], ['next'], ['prev'], ['close'], ['thumb', 4], ['prev'], ['prev'], ['prev'], ['prev'], ['prev'], ['next'], ['close']];

async function run(browser, base, route) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + route, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('.gallery-img img');
  const states = [];
  for (const [action, arg] of STEPS) {
    const thumbs = await page.$$('.gallery-img img');
    const target = action === 'thumb' ? thumbs[arg] : await page.$(`#myModal .${action}`);
    if (!target || !(await target.isVisible())) {
      states.push(`${action}:hidden`);
      continue;
    }
    await target.click();
    states.push(
      await page.evaluate(() => {
        const modal = document.getElementById('myModal');
        const slides = [...document.querySelectorAll('.mySlides')];
        const visible = slides.findIndex((s) => getComputedStyle(s).display !== 'none');
        return `${getComputedStyle(modal).display === 'none' ? 'closed' : 'open'}:${visible + 1}`;
      }),
    );
  }
  await page.close();
  return states;
}

const browser = await chromium.launch();
let failed = 0;
for (const route of ROUTES) {
  const [a, n] = await Promise.all([run(browser, ANGULAR, route), run(browser, NEXT, route)]);
  const same = JSON.stringify(a) === JSON.stringify(n);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${route}\n  angular ${a.join(' ')}\n  next    ${n.join(' ')}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
