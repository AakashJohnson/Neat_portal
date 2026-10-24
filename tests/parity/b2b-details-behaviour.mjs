// Behavioural parity of /b2b-course-details/:code: enquiry modal, enquiry
// submit (request body incl. hidden neat_id/product_code), accordion.
// Writes one enquiry per app into neat_portal_test.
//   node tests/parity/b2b-details-behaviour.mjs
import { chromium } from '@playwright/test';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const products = (await (await fetch('http://localhost:4000/api/getB2BProductsLandingPage')).json()).products;
// Prefer a product with a discount table (panel Five), else the first.
const code = products[0].code;

const snap = (page) =>
  page.evaluate(() => {
    const m = document.getElementById('sendEnquiryYourPaidSeat');
    return {
      body: document.body.className,
      backdrops: document.querySelectorAll('.modal-backdrop').length,
      modal: `${m.className}|${m.style.display}|${m.getAttribute('aria-hidden')}`,
      panels: document.querySelectorAll('#accordion .panel').length,
      accordion: [...document.querySelectorAll('#accordion .panel-title a')].map((a) => `${a.classList.contains('collapsed') ? 'c' : '-'}${a.getAttribute('aria-expanded')}`).join(' '),
      hidden: [...m.querySelectorAll('input[type=hidden]')].map((i) => i.value).join(','),
      toasts: [...document.querySelectorAll('#toast-container .toast-message')].map((t) => t.textContent.trim()).join('|'),
    };
  });

async function run(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bodies = [];
  page.on('request', (r) => /\/submitB2BEnquiry\b/.test(r.url()) && bodies.push(r.postData()));
  await page.goto(`${base}/b2b-course-details/${code}`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.querySelectorAll('video').forEach((v) => ((v.muted = true), v.pause())));
  const out = { initial: await snap(page) };
  await page.locator('#accordion .panel-title a').last().click();
  await page.waitForTimeout(700);
  out.accordion = (await snap(page)).accordion;
  await page.locator('.btnFreeCvd').click();
  await page.waitForTimeout(700);
  out.open = await snap(page);
  await page.fill('#sendEnquiryYourPaidSeat input[placeholder="College/University Name"]', 'Parity College');
  await page.fill('#sendEnquiryYourPaidSeat input[placeholder="No Of Seats Required"]', '12');
  await page.fill('#sendEnquiryYourPaidSeat textarea', 'Parity enquiry');
  await page.click('#sendEnquiryYourPaidSeat button[type=submit]');
  await page.waitForTimeout(2000);
  out.submitted = await snap(page);
  await page.click('#sendEnquiryYourPaidSeat .close');
  await page.waitForTimeout(700);
  out.closed = await snap(page);
  out.requests = bodies;
  await page.close();
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
