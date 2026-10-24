// Behavioural parity of the /downloads lightbox (modal.js + Angular change
// detection vs the React model in app/downloads/page.js): after every step,
// the modal state, number of slides and every visible slide's image.
//   node tests/parity/downloads-behaviour.mjs
import { chromium } from '@playwright/test';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
// thumbnail order on the page: 0-3 Woman, 4-7 Students, 8-11 Institution (12-13 are PDF links)
const STEPS = [['thumb', 0], ['next'], ['next'], ['close'], ['thumb', 0], ['thumb', 5], ['prev'], ['prev'], ['close'], ['thumb', 9], ['next'], ['thumb', 3], ['next'], ['next'], ['next'], ['next']];

const snapshot = (page) =>
  page.evaluate(() => {
    const modal = document.getElementById('myModal');
    const slides = [...modal.querySelectorAll('.mySlides')];
    const visible = slides.filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.querySelector('img').getAttribute('src').split('/').pop());
    return `${getComputedStyle(modal).display === 'none' ? 'closed' : 'open'} n=${slides.length} [${visible.join(',')}]`;
  });

async function run(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/downloads`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('.success-section .gallery-img img');
  const states = [await snapshot(page)];
  for (const [action, arg] of STEPS) {
    const target = action === 'thumb' ? page.locator('.success-section .gallery-img img').nth(arg) : page.locator(`#myModal .${action}`);
    if (!(await target.isVisible())) {
      states.push(`${action}:hidden`);
      continue;
    }
    // The open modal covers the page, so thumbnail clicks are blocked as for a user.
    const clicked = await target.click({ timeout: 1500 }).then(() => true, () => false);
    if (!clicked) {
      states.push(`${action}:blocked`);
      continue;
    }
    await page.waitForTimeout(150);
    states.push(await snapshot(page));
  }
  await page.close();
  return states;
}

const browser = await chromium.launch();
const [a, n] = await Promise.all([run(browser, ANGULAR), run(browser, NEXT)]);
await browser.close();
const same = JSON.stringify(a) === JSON.stringify(n);
console.log(same ? 'SAME /downloads' : 'DIFF /downloads');
a.forEach((s, i) => console.log(`  ${s === n[i] ? ' ' : '≠'} ${String(i).padStart(2)} angular ${s}${s === n[i] ? '' : `\n              next    ${n[i]}`}`));
process.exit(same ? 0 : 1);
