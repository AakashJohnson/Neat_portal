// Parity of the admin panel: the Laravel Blade panel (reference, :8001 on
// neat_portal_test) vs the Next.js port under /panel. Both apps are logged in
// through their own login forms as the admin fixture, then every page is
// compared by title, visible text (times masked) and pixels; the create forms
// are submitted empty to compare client-side validation. Nothing is saved on
// the Laravel side (its settings.json lives in the original repository).
//   node tests/parity/panel-behaviour.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { fixtureCredentials, fixtureToken } from './auth.mjs';

const LARAVEL = process.env.PARITY_LARAVEL ?? 'http://127.0.0.1:8001';
const NEXT = `${process.env.PARITY_NEXT ?? 'http://localhost:3000'}/panel`;
const OUT = path.resolve(import.meta.dirname, 'out', 'panel');
mkdirSync(OUT, { recursive: true });
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

const admin = await fixtureCredentials('admin');
const token = await fixtureToken('admin');
const api = async (p) => (await fetch(`http://localhost:4000/api${p}${p.includes('?') ? '&' : '?'}token=${token}`, { headers: { Accept: 'application/json' } })).json();
const announcement = (await api('/panel/announcements')).data?.[0]?.id;
const role = (await api('/roles'))[0]?.id ?? 1;
const permission = (await api('/permissions'))[0]?.id ?? 1;

const PAGES = [
  '/', '/users', '/users/create', '/users/1', '/users/1/edit', '/users/1/sessions',
  '/profile', '/profile/sessions', '/profile/activity', '/activity', '/activity/user/1/log',
  '/roles', '/roles/create', `/roles/${role}/edit`, '/permissions', '/permissions/create', `/permissions/${permission}/edit`,
  '/settings', '/settings/auth', '/settings/notifications',
  '/announcements', '/announcements/list', '/announcements/create',
  ...(announcement ? [`/announcements/${announcement}`, `/announcements/${announcement}/edit`] : []),
];
const GUEST = ['/login', '/register', '/password/reset', '/password/reset/abc'];
const FORMS = [
  ['/roles/create', '#role-form'],
  ['/permissions/create', '#permission-form'],
  ['/announcements/create', '#announcement-form'],
  ['/users/create', '#user-form'],
];

// Values that differ between two loads by design.
const MASKS = [
  [/\b\d{2}\.\d{2}\.\d{4}\.? ?(\d{2}:\d{2}(:\d{2})?)?/g, '<date>'],
  [/\b\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?/g, '<date>'],
  [/\b\d+ (second|minute|hour|day|week|month|year)s? ago\b/g, '<ago>'],
  [/\b\d+(s|m|h|d|w|mo|y) ago\b/g, '<ago>'],
  [/\b(\d{1,3}\.){3}\d{1,3}\b/g, '<ip>'],
];
const mask = (t) => MASKS.reduce((s, [re, by]) => s.replace(re, by), t);

async function login(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/login`, { waitUntil: 'load' });
  await page.fill('#username', admin.username);
  await page.fill('#password', admin.password);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 30000 }), page.click('#btn-login')]);
  await page.close();
  return ctx;
}

async function snapshot(ctx, url, guest = false) {
  const page = await (guest ? ctx.browser().newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage()) : ctx.newPage());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.dismiss());
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => ({ status: () => `goto: ${e.message.split('\n')[0]}` }));
  await page.addStyleTag({ content: FREEZE }).catch(() => {});
  await page.waitForTimeout(1500);
  const shot = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('script,style,noscript,nextjs-portal,next-route-announcer')) continue;
      if (!el.getClientRects().length) continue;
      const t = n.data.replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    }
    return { title: document.title, path: location.pathname, text: out.join(' ').replace(/\s+/g, ' ') };
  });
  const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
  await page.close();
  return { status: typeof res?.status === 'function' ? res.status() : null, ...shot, text: mask(shot.text), errors, png };
}

async function emptySubmit(ctx, url, form) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click(`${form} button[type=submit]`);
  await page.waitForTimeout(800);
  const r = await page.evaluate((f) => ({
    path: location.pathname,
    errors: [...document.querySelectorAll(`${f} .error-help-block, .alert-danger li`)].map((e) => e.textContent.trim()).filter(Boolean),
    hasError: [...document.querySelectorAll(`${f} .has-error`)].map((e) => e.querySelector('input,textarea,select')?.name ?? ''),
  }), form);
  await page.close();
  return r;
}

function pixels(a, b, file) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const crop = (img) => {
    const o = new PNG({ width, height });
    PNG.bitblt(img, o, 0, 0, width, height, 0, 0);
    return o;
  };
  const diff = new PNG({ width, height });
  const changed = pixelmatch(crop(a).data, crop(b).data, diff.data, width, height, { threshold: 0.1 });
  writeFileSync(file, PNG.sync.write(diff));
  return { ratio: +(changed / (width * height)).toFixed(4), heights: [a.height, b.height] };
}

function firstDiff(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i >= Math.max(a.length, b.length) ? null : { at: i, laravel: a.slice(Math.max(0, i - 40), i + 80), next: b.slice(Math.max(0, i - 40), i + 80) };
}

const browser = await chromium.launch();
const report = [];
let failed = 0;

// One login per app (each login writes activity and session rows that the
// activity/session pages show), before any page is captured.
const lctx = await login(browser, LARAVEL);
const nctx = await login(browser, NEXT);
for (const [label, url, guest] of [...GUEST.map((p) => [p, p, true]), ...PAGES.map((p) => [p, p, false])]) {
  const l = await snapshot(lctx, `${LARAVEL}${url === '/' ? '' : url}`, guest);
  const n = await snapshot(nctx, `${NEXT}${url === '/' ? '' : url}`, guest);
  const slug = (label.replace(/[^\w-]+/g, '_') || 'home').replace(/^_/, '') || 'home';
  writeFileSync(path.join(OUT, `${slug}.laravel.png`), PNG.sync.write(l.png));
  writeFileSync(path.join(OUT, `${slug}.next.png`), PNG.sync.write(n.png));
  const px = pixels(l.png, n.png, path.join(OUT, `${slug}.diff.png`));
  const textSame = l.text === n.text;
  const titleSame = l.title === n.title;
  if (!textSame || !titleSame) failed++;
  const row = { page: label, titleSame, titles: [l.title, n.title], textSame, diff: textSame ? null : firstDiff(l.text, n.text), pixels: px, errors: { laravel: l.errors, next: n.errors } };
  report.push(row);
  console.log(`${textSame && titleSame ? 'SAME' : 'DIFF'} ${label} px=${(px.ratio * 100).toFixed(2)}% h=${px.heights.join('/')}${titleSame ? '' : ` title=${JSON.stringify(row.titles)}`}${n.errors.length ? ` next-errors=${n.errors.length}` : ''}`);
  if (row.diff) console.log(`   laravel: …${row.diff.laravel}…\n   next:    …${row.diff.next}…`);
}

for (const [url, form] of FORMS) {
  const l = await emptySubmit(lctx, `${LARAVEL}${url}`, form);
  const n = await emptySubmit(nctx, `${NEXT}${url}`, form);
  const same = JSON.stringify(l.errors) === JSON.stringify(n.errors) && JSON.stringify(l.hasError) === JSON.stringify(n.hasError);
  if (!same) failed++;
  report.push({ form: url, same, laravel: l, next: n });
  console.log(`${same ? 'SAME' : 'DIFF'} empty submit ${url} ${JSON.stringify(l.errors)}${same ? '' : `\n  next ${JSON.stringify(n.errors)} ${JSON.stringify(n.hasError)} vs ${JSON.stringify(l.hasError)}`}`);
}
await browser.close();
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(`${failed} difference(s)`);
process.exit(failed ? 1 : 0);
