// Behavioural parity of the token/OTP landing routes and the reset routes:
// request body, toasts, final URL, rendered app content.
//   node tests/parity/verify-behaviour.mjs
import { chromium } from '@playwright/test';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const ROUTES = ['/verify-email', '/verify-email?email=nobody@example.invalid&token=bad', '/verify-otp', '/verify-otp?otp=123456&phone=9999999999', '/request-password-reset', '/response-password-reset?token=x', '/signup'];

async function run(browser, base, route) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bodies = [];
  page.on('request', (r) => /(emailVerification|otpVerification)/.test(r.url()) && bodies.push(r.postData()));
  await page.goto(base + route, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const out = {
    path: new URL(page.url()).pathname,
    bodies,
    toasts: await page.$$eval('#toast-container > *', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()).join(' | ')),
    navbar: !!(await page.$('.hdrTpDiv')),
    headings: await page.$$eval('h2, h6', (e) => e.map((x) => x.textContent.trim()).slice(0, 3).join(' | ')),
  };
  await page.close();
  return out;
}

const browser = await chromium.launch();
let failed = 0;
for (const route of ROUTES) {
  const a = await run(browser, ANGULAR, route);
  const n = await run(browser, NEXT, route);
  const same = JSON.stringify(a) === JSON.stringify(n);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${route} ${JSON.stringify(a)}${same ? '' : `\n  next ${JSON.stringify(n)}`}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
