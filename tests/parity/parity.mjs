// Visual/content parity: the original Angular app vs the Next.js port, both on
// the same backend data (Angular through angular-on-express-proxy.mjs).
//   node tests/parity/parity.mjs /disclaimer,/team [--widths=1440,375]
// For each route × width it records:
//   - text:   the sequence of visible text nodes (whitespace collapsed) — must match;
//   - pixels: pixelmatch difference ratio of full-page screenshots (animations frozen);
//   - errors: uncaught page errors in each app.
// Output: tests/parity/out/<route>-<width>.{angular,next,diff}.png and report.json.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const ANGULAR = process.env.PARITY_ANGULAR ?? 'http://localhost:4201';
const NEXT = process.env.PARITY_NEXT ?? 'http://localhost:3000';
const args = process.argv.slice(2);
const routes = (args.find((a) => !a.startsWith('--')) ?? '/').split(',');
const widths = (args.find((a) => a.startsWith('--widths='))?.slice(9) ?? '1440,375').split(',').map(Number);
const OUT = path.resolve(import.meta.dirname, 'out');
mkdirSync(OUT, { recursive: true });

// Freeze what changes between two loads: CSS animations/transitions, carousels'
// auto-advance timers, third-party iframes (content outside both apps).
const FREEZE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
iframe,marquee{visibility:hidden!important}nextjs-portal{display:none!important}`;

// Some endpoints are non-deterministic by design (getProductsLandingPage uses
// inRandomOrder()). GET responses are pinned per route: whichever app asks
// first gets the live response, the other app receives the same body.
// Angular calls Express directly (/api/X); Next.js calls its BFF (/bff/X).
const API_GET = /^https?:\/\/localhost:(4000\/api|\d+\/bff)\//;
let pinned = new Map();
async function pinApi(page) {
  await page.route(API_GET, async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.continue();
    const key = req.url().replace(API_GET, '').replace(/([?&])token=[^&]*&?/, '$1');
    if (!pinned.has(key)) {
      pinned.set(
        key,
        route.fetch().then(async (r) => ({ status: r.status(), headers: r.headers(), body: await r.body() })),
      );
    }
    const r = await pinned.get(key);
    return route.fulfill({ status: r.status, headers: r.headers, body: r.body });
  });
}

async function capture(browser, base, route, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await pinApi(page);
  // Carousel auto-advance (Bootstrap interval 5000 ms in Angular, the same in
  // the port) would show different slides depending on load time.
  await page.addInitScript(() => {
    const real = window.setInterval;
    window.setInterval = (fn, ms, ...rest) => (ms >= 3000 ? 0 : real(fn, ms, ...rest));
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + route, { waitUntil: 'load', timeout: 90000 }).catch((e) => errors.push(`goto: ${e.message.split('\n')[0]}`));
  await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
  await page.waitForTimeout(3500);
  // Layout depends on image sizes (galleries load ~20 MB of photos).
  await page.waitForFunction(() => [...document.images].every((img) => img.complete), null, { timeout: 60000 }).catch(() => errors.push('images still loading after 60 s'));
  const text = await page.evaluate(() => {
    // Adjacent text nodes of one element are merged: React keeps `{a} {b}` as
    // separate DOM text nodes where Angular has one; rendering is identical.
    const out = [];
    let prev = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('script,style,noscript,iframe,marquee,nextjs-portal,next-route-announcer')) continue;
      if (!el.getClientRects().length) continue;
      let sib = n.previousSibling;
      while (sib && sib.nodeType === Node.COMMENT_NODE) sib = sib.previousSibling;
      if (prev && sib === prev) out[out.length - 1].raw += n.data;
      else out.push({ raw: n.data });
      prev = n;
    }
    return out.map((x) => x.raw.replace(/\s+/g, ' ').trim()).filter(Boolean);
  });
  const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
  await page.close();
  return { text, png, errors };
}

function diffPng(a, b, file) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const crop = (img) => {
    const out = new PNG({ width, height });
    PNG.bitblt(img, out, 0, 0, width, height, 0, 0);
    return out;
  };
  const diff = new PNG({ width, height });
  const changed = pixelmatch(crop(a).data, crop(b).data, diff.data, width, height, { threshold: 0.1 });
  writeFileSync(file, PNG.sync.write(diff));
  return { ratio: +(changed / (width * height)).toFixed(4), heights: [a.height, b.height] };
}

function textDiff(a, b) {
  const max = Math.max(a.length, b.length);
  const out = [];
  for (let i = 0; i < max && out.length < 10; i++) if (a[i] !== b[i]) out.push({ i, angular: a[i] ?? null, next: b[i] ?? null });
  return out;
}

const browser = await chromium.launch();
const report = [];
for (const route of routes) {
  for (const width of widths) {
    const slug = `${route.replace(/[^\w-]+/g, '_') || 'home'}-${width}`;
    pinned = new Map();
    const [ng, nx] = await Promise.all([capture(browser, ANGULAR, route, width), capture(browser, NEXT, route, width)]);
    writeFileSync(path.join(OUT, `${slug}.angular.png`), PNG.sync.write(ng.png));
    writeFileSync(path.join(OUT, `${slug}.next.png`), PNG.sync.write(nx.png));
    const pixels = diffPng(ng.png, nx.png, path.join(OUT, `${slug}.diff.png`));
    const text = textDiff(ng.text, nx.text);
    const row = { route, width, textEqual: text.length === 0, textNodes: [ng.text.length, nx.text.length], text, pixels, errors: { angular: ng.errors, next: nx.errors } };
    report.push(row);
    console.log(`${row.textEqual ? 'TEXT=' : 'TEXT≠'} px=${(pixels.ratio * 100).toFixed(2)}% h=${pixels.heights.join('/')} ${route} @${width}${nx.errors.length ? ` next-errors=${nx.errors.length}` : ''}`);
    for (const d of text.slice(0, 5)) console.log(`   #${d.i} angular=${JSON.stringify(d.angular)} next=${JSON.stringify(d.next)}`);
  }
}
await browser.close();
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
