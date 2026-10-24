// Behavioural parity of the payment return / free-seat link routes, logged
// out and as the fixture student: API request bodies, toasts, final URL,
// localStorage hand-off values.
//   node tests/parity/payment-pages-behaviour.mjs
import { chromium } from '@playwright/test';
import { fixtureToken, loggedInContext } from './auth.mjs';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const ENDPOINTS = /\/(paymentSuccess|paymentFailure|checkStudentExists|checkStudentSecretCode|checkCompanySecretCode)\b/;

const CASES = [
  ['/neatstudentresponse.php', null],
  ['/neatstudentresponse.php?studentid=1&sessionid=s&courseid=C&Failure=1', null],
  ['/neatstudentresponse.php?studentid=1&sessionid=s&neat_course_id=N&courseid=C&Success=1&payment=p', 'student'],
  ['/free-seat-allocation', null],
  ['/free-seat-allocation?neat_secret_code=abc&student_id=APP1&product_id=P1&student_email=a@b.co', null],
  ['/free-seat-allocation?neat_secret_code=abc&student_id=APP1&product_id=P1&student_email=a@b.co', 'student'],
  ['/free-seat-verification', null, true],
  ['/free-seat-verification', 'student', true],
  ['/payment-failure', null],
];

async function run(browser, base, route, role, submit) {
  const ctx = role ? await loggedInContext(browser, base, await fixtureToken(role), { viewport: { width: 1440, height: 900 } }) : await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Every toast shown during the run (snapshots race the 3 s lifetime).
  await ctx.addInitScript(() => {
    window.__toasts = [];
    const seen = new WeakSet();
    setInterval(() => {
      document.querySelectorAll('#toast-container > *').forEach((t) => {
        const text = t.textContent.replace(/s+/g, ' ').trim();
        if (!seen.has(t) && text) {
          seen.add(t);
          window.__toasts.push(text);
        }
      });
    }, 100);
  });
  const page = await ctx.newPage();
  const calls = [];
  page.on('request', (r) => {
    const m = r.url().match(ENDPOINTS);
    if (m) calls.push(`${m[1]} ${r.postData()}`);
  });
  await page.goto(base + route, { waitUntil: 'load' });
  await page.waitForTimeout(4500); // late API answers still produce their toast
  if (submit) {
    await page.click('button[type=submit]');
    await page.waitForTimeout(800);
    await page.fill('#company_secret_code', 'WRONGCODE');
    await page.click('button[type=submit]');
    await page.waitForTimeout(2000);
  }
  const out = {
    path: new URL(page.url()).pathname,
    calls,
    toasts: await page.$$eval('#toast-container > *', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim())),
    storage: await page.evaluate(() => ['neat_secret_code', 'application_number', 'freeSeatCode', 'student_email', 'free-seat-verification'].map((k) => `${k}=${localStorage.getItem(k)}`).join(',')),
  };
  await ctx.close();
  return out;
}

const browser = await chromium.launch();
let failed = 0;
for (const [route, role, submit] of CASES) {
  const a = await run(browser, ANGULAR, route, role, submit);
  const n = await run(browser, NEXT, route, role, submit);
  const same = JSON.stringify(a) === JSON.stringify(n);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${role ?? 'guest'} ${route}\n  ${JSON.stringify(a)}${same ? '' : `\n  next ${JSON.stringify(n)}`}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
