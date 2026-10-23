// Behavioural parity of forms: the same user steps in Angular (via the
// Angular-on-Express proxy) and Next.js must send the same API request body
// and produce the same toast. Writes land in neat_portal_test (Express .env).
//   node tests/parity/form-behaviour.mjs [scenario-name,...]
import { chromium } from '@playwright/test';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const stamp = Date.now();

// steps: ['fill', selector, value] | ['click', selector] | ['check', selector]
export const SCENARIOS = {
  'contact-us empty submit': {
    route: '/contact-us',
    endpoint: 'submitContactUs',
    steps: [['click', 'button[type=submit]']],
  },
  'contact-us valid': {
    route: '/contact-us',
    endpoint: 'submitContactUs',
    steps: [
      ['fill', 'input[placeholder=Name]', `Parity Tester`],
      ['fill', 'input[placeholder=Email]', `parity+${stamp}@example.test`],
      ['fill', 'textarea', 'Parity check message'],
      ['click', 'button[type=submit]'],
    ],
  },
  'feedback missing experience': {
    route: '/feedback',
    endpoint: 'submitFeedback',
    steps: [
      ['fill', 'input[placeholder="Your Name"]', 'Parity Tester'],
      ['fill', 'input[placeholder="Your Email"]', `parity+${stamp}@example.test`],
      ['fill', 'textarea', 'Parity feedback'],
      ['click', 'button[type=submit]'],
    ],
  },
  'feedback valid': {
    route: '/feedback',
    endpoint: 'submitFeedback',
    steps: [
      ['fill', 'input[placeholder="Your Name"]', 'Parity Tester'],
      ['fill', 'input[placeholder="Your Email"]', 'not-an-email'],
      ['check', 'mat-radio-button[value=Fair] label'],
      ['fill', 'textarea', 'Parity feedback'],
      ['click', 'button[type=submit]'],
    ],
  },
};

async function run(browser, base, scenario) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const requests = [];
  page.on('request', (r) => {
    if (r.url().includes(`/${scenario.endpoint}`)) {
      const url = new URL(r.url());
      requests.push({ method: r.method(), query: [...url.searchParams.keys()].sort().join(','), body: r.postDataJSON?.() ?? r.postData() });
    }
  });
  await page.goto(base + scenario.route, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(1500);
  for (const [action, selector, value] of scenario.steps) {
    if (action === 'fill') await page.fill(selector, value);
    else await page.click(selector);
  }
  await page.waitForTimeout(2000);
  const toasts = await page.$$eval('#toast-container > *', (els) =>
    els.map((e) => `${[...e.classList].filter((c) => /^toast-|^ngx-toastr$/.test(c)).sort().join('.')}: ${e.textContent.replace(/\s+/g, ' ').trim()}`),
  );
  const radio = await page.$$eval('mat-radio-button', (els) => els.map((e) => `${e.getAttribute('value')}${e.classList.contains('mat-radio-checked') ? '*' : ''}`).join(' '));
  await page.close();
  // The token query parameter: Angular sends ?token=<localStorage token> (or
  // "null"); the BFF adds it server-side, so it is not compared here.
  return { requests: requests.map(({ method, body }) => ({ method, body })), toasts, radio };
}

const only = process.argv[2]?.split(',');
const browser = await chromium.launch();
let failed = 0;
for (const [name, scenario] of Object.entries(SCENARIOS)) {
  if (only && !only.includes(name)) continue;
  // Sequential: both apps write to the same test database.
  const a = await run(browser, ANGULAR, scenario);
  const n = await run(browser, NEXT, scenario);
  const same = JSON.stringify(a) === JSON.stringify(n);
  if (!same) failed++;
  console.log(`${same ? 'SAME' : 'DIFF'} ${name}\n  angular ${JSON.stringify(a)}\n  next    ${JSON.stringify(n)}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
