import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

assert.equal(process.env.DB_DATABASE, 'neat_portal_test', 'Use only the isolated test database.');
assert.ok(process.env.FLOW_NEXT_ORIGIN, 'Set FLOW_NEXT_ORIGIN to the dedicated test frontend.');
const base = process.env.FLOW_NEXT_ORIGIN;
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'express-backend');
createRequire(path.join(backend, 'package.json'))('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
process.env.MAIL_TRANSPORT = 'json';
const { createRecoveredFixtures } = await import(pathToFileURL(path.join(backend, 'tests/helpers/recoveredFixtures.js')));
const { db } = await import(pathToFileURL(path.join(backend, 'src/database/knex.js')));
let f, browser;
const failures = [];
try {
  f = await createRecoveredFixtures();
  await db('product_details').whereIn('code', f.codes).update({ product_bucket: f.marker });
  await db('product_details').where('code', f.foreign).update({ product_type: 'B2B' });
  await db('company').insert({ neat_id: f.users.company.application_number, name: f.marker });
  await db('company_details').insert({ neat_id: f.users.company.application_number, name: f.marker, mou_date: '2026-01-01', mou_file_uploaded: 'Yes' });
  await db('learner').insert({ name: f.marker, phone: '0000000000', profession: 'Search fixture', email: f.users.learner.email, application_number: f.users.learner.application_number });
  await db('institute').insert({ 'Permanent Institute Id': f.users.institute.application_number, 'Institute Name': f.marker, Location: 'Search fixture' });
  await db('student').where('application_number', f.users.student.application_number).update({ permanent_institute_id: f.users.institute.application_number, isEligibleFreeCourse: 1, is_rule_engine_processed: 1 });
  await db('neat_eoi').insert({ neat_id: f.marker, company: f.marker, email: `${f.marker}@example.invalid`, phone: '0000000000' });
  await db('user_activity').insert({ description: `${f.marker} search activity`, user_id: f.users.admin.id, ip_address: '127.0.0.1', user_agent: 'Navigation search fixture' });
  await db('product_purchased_audit').insert({ application_number: f.users.student.application_number, code: f.bulk, course_type: 'Paid', sessionid: f.marker, quantity: 1, transaction_id: `${f.marker}-transaction`, status: 'Payment Pending' });

  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.stack));
  const login = async role => {
    await context.request.delete(`${base}/api/session`);
    const response = await context.request.post(`${base}/api/session`, { data: { username: f.users[role].email, password: f.password } });
    assert.equal(response.status(), 200, `Login ${role}`);
    assert.equal((await response.json()).stored, true);
  };
  const tableSearch = async (route, term = f.marker) => {
    await page.goto(base + route);
    const input = page.locator('input[type="search"]').first();
    await input.fill(term.toUpperCase());
    await expect(page.locator('tbody tr').filter({ hasText: new RegExp(term, 'i') }).first()).toBeVisible();
    await input.fill(`${f.marker}-not-present`);
    await expect(page.getByText('No results found.', { exact: true })).toBeVisible();
    await input.fill('');
    await expect(page.locator('tbody tr.mat-row').first()).toBeVisible();
    console.log(`PASS live table, partial/case-insensitive matching and clear: ${route}`);
  };

  await login('admin');
  await page.goto(`${base}/admin/dashboard`);
  const tokenBefore = (await context.cookies()).find(c => c.name === 'neat_token')?.value;
  await expect(page.locator('header').getByRole('link', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.locator('header').getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
  await page.locator('header').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(base + '/');
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  assert.equal((await context.cookies()).find(c => c.name === 'neat_token')?.value, tokenBefore);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/admin(?:\/dashboard)?\/?$/);
  assert.equal((await context.request.get(`${base}/api/session`).then(r => r.json())).claims.role_id, 1);
  for (const viewport of [{ width: 1440, height: 560 }, { width: 820, height: 650 }, { width: 390, height: 640 }]) {
    await page.setViewportSize(viewport);
    const toggle = page.getByRole('button', { name: 'Toggle admin menu' });
    if (viewport.width === 820) {
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#admin-sidebar-menu');
    await expect(menu).toBeInViewport();
    await expect.poll(() => menu.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto');
    await expect.poll(() => menu.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await menu.hover();
    await page.mouse.wheel(0, 1800);
    await expect.poll(() => menu.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await expect(menu.getByRole('link', { name: 'Reports' })).toBeInViewport();
    await expect(page.locator('header').getByRole('link', { name: 'Home', exact: true })).toBeInViewport();
    if (viewport.width === 390) {
      await menu.evaluate(el => { el.scrollTop = 0; });
      const box = await menu.boundingBox();
      const touch = await context.newCDPSession(page);
      const x = box.x + box.width / 2;
      const y = box.y + box.height - 100;
      assert.ok(await menu.evaluate((el, point) => el.contains(document.elementFromPoint(point.x, point.y)), { x, y }), 'Touch starts inside the menu, above the development toolbar');
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 10; step++) {
        await page.waitForTimeout(30);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 20 }] });
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => menu.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      await touch.detach();
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log('PASS admin Home round trip: cookie retained, dashboard return, desktop/tablet/mobile scrolling');

  for (const [route, term, expected] of [['/', f.bulk, 4], ['/course', f.bulk, 3], ['/b2b-course', f.foreign, 1]]) {
    await page.goto(base + route);
    await page.locator('.browsLstCnt a').filter({ hasText: f.marker }).click();
    const input = page.getByPlaceholder('Search Courses/ Institutes');
    await expect(page.locator('.lstCat')).toHaveCount(expected);
    await input.fill(term.toUpperCase().slice(0, -1));
    await expect(page.locator('.lstCat')).toHaveCount(1);
    await input.fill(`${f.marker}-absent`);
    await expect(page.getByText('No results found.', { exact: true })).toBeVisible();
    await input.fill('');
    await expect(page.locator('.lstCat')).toHaveCount(expected);
    console.log(`PASS real SQL catalog search retains category: ${route}`);
  }

  for (const route of ['/admin/registered-student', '/admin/registered-learner', '/admin/registered-institute', '/admin/registered-company', '/admin/free-seat-allocation', '/admin/products-management', '/admin/free-seat-student', '/admin/mou-management']) await tableSearch(route);
  await page.goto(`${base}/admin/registered-student`);
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeEnabled();
  const secondPage = page.waitForResponse(response => response.url().includes('/bff/getAdminStudents?') && new URL(response.url()).searchParams.get('page') === '2');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await secondPage;
  const firstSearchPage = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/getAdminStudents') && url.searchParams.get('search') === f.marker && url.searchParams.get('page') === '1';
  });
  await page.getByPlaceholder('Name, Email or Mobile').fill(f.marker);
  await firstSearchPage;
  await expect(page.locator('tbody')).toContainText(f.users.student.email);
  console.log('PASS server pagination resets to page one on search');
  await page.goto(`${base}/admin/mou-management`);
  const autocomplete = page.getByPlaceholder('Search company', { exact: true });
  await autocomplete.fill(f.marker.toUpperCase());
  await expect(page.getByRole('option').filter({ hasText: f.marker })).toBeVisible();
  await autocomplete.fill(`${f.marker}-absent`);
  await expect(page.getByRole('status').filter({ hasText: 'No results found.' })).toBeVisible();
  await autocomplete.fill('');
  await expect(page.getByRole('option').first()).toBeVisible();
  console.log('PASS MOU autocomplete: live options, empty message and clear');

  const companiesLoaded = page.waitForResponse(response => response.url().includes('/bff/getCompanies'));
  await page.goto(`${base}/admin/courses`);
  await companiesLoaded;
  await page.locator('.mat-select-trigger').click();
  await page.getByRole('option').filter({ hasText: f.marker }).click();
  const productSearch = page.getByPlaceholder('Search Courses/ Company');
  await productSearch.fill(f.bulk.toUpperCase());
  await expect(page.locator('.card-body h3').filter({ hasText: f.bulk })).toBeVisible();
  await productSearch.fill(`${f.marker}-absent`);
  await expect(page.getByText('No results found.', { exact: true })).toBeVisible();
  await productSearch.fill('');
  await expect(page.locator('.card-body h3').filter({ hasText: f.bulk })).toBeVisible();
  console.log('PASS admin products search preserves company filter');

  await page.goto(`${base}/panel/users?status=Active&page=2`);
  const usersInput = page.getByPlaceholder('Search for users...');
  await usersInput.fill(f.marker.toUpperCase());
  await expect(page.locator('tbody tr').filter({ hasText: f.users.admin.email })).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('status'), 'Active');
  assert.equal(new URL(page.url()).searchParams.has('page'), false);
  await usersInput.fill(`${f.marker}-absent`);
  await expect(page.getByText('No records found.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear user search' }).click();
  assert.equal(new URL(page.url()).searchParams.get('status'), 'Active');
  await expect(page.locator('#users-table-wrapper tbody tr').first()).toBeVisible();
  for (const route of ['/panel/activity', `/panel/activity/user/${f.users.admin.id}/log`, '/panel/profile/activity']) {
    await page.goto(base + route);
    const input = page.getByPlaceholder('Search for Action');
    await input.fill(f.marker.toUpperCase());
    await expect(page.locator('tbody tr').filter({ hasText: `${f.marker} search activity` })).toBeVisible();
    await input.fill(`${f.marker}-absent`);
    await expect(page.getByText('No results found.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear activity search' }).click();
    assert.equal(new URL(page.url()).pathname, route, 'Clear must retain user scope');
    await expect(page.locator('tbody tr').first()).toBeVisible();
  }
  console.log('PASS panel users/status and all three scoped activity searches');

  await page.goto(`${base}/panel`);
  const sidebar = page.getByRole('navigation', { name: 'Management navigation' });
  await sidebar.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(base + '/');
  assert.equal((await context.cookies()).find(c => c.name === 'neat_token')?.value, tokenBefore);
  await page.goto(`${base}/panel`);
  await expect(sidebar).toBeVisible();
  await sidebar.locator('a[href="#settings-dropdown"]').click();
  await sidebar.locator('a[href="#roles-dropdown"]').click();
  for (const viewport of [{ width: 1440, height: 480 }, { width: 820, height: 480 }, { width: 390, height: 640 }]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 820) await page.locator('#sidebar-toggle').click();
    const menu = sidebar.locator('.sidebar-sticky');
    await expect(menu).toBeInViewport();
    await expect.poll(() => menu.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    const home = sidebar.getByRole('link', { name: 'Home', exact: true });
    const before = await home.boundingBox();
    await menu.hover();
    await page.mouse.wheel(0, 1500);
    await expect(sidebar.getByRole('link', { name: /Announcements$/ })).toBeInViewport();
    await expect(home).toBeInViewport();
    assert.ok(Math.abs((await home.boundingBox()).y - before.y) < 2, 'Profile actions must stay fixed');
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log('PASS management Home session and desktop/tablet/mobile sidebar scrolling');

  let mutations = 0;
  page.on('request', request => {
    if (/\/company-profile\/create(?:-product)?\?/.test(request.url())) mutations++;
  });
  await page.goto(`${base}/panel/create-company-profile`);
  await page.locator('#neat_id').fill(f.marker);
  await expect(page.locator('#email')).toHaveValue(`${f.marker}@example.invalid`);
  await expect(page.locator('#submit')).toBeEnabled();
  await page.locator('#neat_id').fill(`${f.marker}-absent`);
  await expect(page.getByText('No results found.', { exact: true })).toBeVisible();
  await expect(page.locator('#submit')).toBeDisabled();
  await page.locator('#neat_id').fill('');
  await expect(page.locator('#email')).toHaveValue('');
  console.log('PASS actual NEAT-ID lookup: auto-fill, not-found, clear, safe submit state');

  // External Phase-2 schemas are not part of the local test DB. Controlled
  // responses exercise this UI and race handling without writing external data.
  await page.route('**/bff/panel/company-profile/products?*', async route => {
    const id = route.request().postDataJSON().neat_id;
    await route.fulfill({ json: { msg: 'succes', data: id === f.marker ? [{ code: f.bulk }] : [] } });
  });
  await page.route('**/bff/panel/company-profile/product-details?*', route => route.fulfill({ json: { msg: 'succes', data: { product: f.bulk, company: f.marker, email: f.users.company.email } } }));
  await page.goto(`${base}/panel/product`);
  await page.locator('#neat_id').fill(f.marker);
  await expect(page.locator('#code option')).toHaveCount(2);
  await page.locator('#code').selectOption(f.bulk);
  await expect(page.locator('#product')).toHaveValue(f.bulk);
  await page.locator('#neat_id').fill(`${f.marker}-absent`);
  await expect(page.locator('#submit')).toBeDisabled();
  await expect(page.getByText('No results found.', { exact: true })).toBeVisible();
  await page.locator('#neat_id').fill('');
  await expect(page.locator('#product')).toHaveValue('');
  assert.equal(mutations, 0, 'Typing must never create a company or product');
  console.log('PASS Phase-2 product lookup UI with controlled external responses');

  let releaseOld, oldStarted;
  const started = new Promise(resolve => { oldStarted = resolve; });
  const gate = new Promise(resolve => { releaseOld = resolve; });
  let requests = 0, latestRequestTime = 0;
  await page.route('**/bff/getAdminStudents?*', async route => {
    const term = new URL(route.request().url()).searchParams.get('search');
    if (term === 'failure') return route.fulfill({ status: 503, json: { message: 'Search service unavailable.' } });
    if (term === 'newer') latestRequestTime = performance.now();
    if (term === 'older') { oldStarted(); await gate; }
    requests++;
    await route.fulfill({ json: { message: 'Success', students: { data: [{ username: term || 'default', email: `${term || 'default'}@example.invalid` }], current_page: 1, total: 1, per_page: 100 } } });
  });
  await page.goto(`${base}/admin/registered-student`);
  const raceSearch = page.getByPlaceholder('Name, Email or Mobile');
  await raceSearch.fill('older');
  await started;
  await expect(page.getByRole('status')).toContainText('Searching...');
  const count = requests;
  await raceSearch.fill('n'); await raceSearch.fill('ne'); await raceSearch.fill('newer');
  const lastInputTime = performance.now();
  await expect(page.locator('tbody')).toContainText('newer@example.invalid');
  assert.equal(requests - count, 1, 'Typing burst must produce only one debounced request');
  assert.ok(latestRequestTime - lastInputTime >= 200 && latestRequestTime - lastInputTime < 1000, 'Request follows the 250 ms debounce, allowing browser scheduling overhead');
  releaseOld();
  await expect.poll(() => requests).toBe(count + 2);
  await expect(page.locator('tbody')).not.toContainText('older@example.invalid');
  await expect(page.locator('tbody')).toContainText('newer@example.invalid');
  await raceSearch.fill('failure');
  await expect(page.getByRole('alert').filter({ hasText: 'Search service unavailable.' })).toBeVisible();
  await raceSearch.fill('');
  await expect(page.locator('tbody')).toContainText('default@example.invalid');
  await page.unroute('**/bff/getAdminStudents?*');
  console.log('PASS measured debounce, loading, late-response rejection, visible errors and recovery');

  await page.setViewportSize({ width: 390, height: 640 });
  await tableSearch('/admin/registered-student');
  await login('company');
  await tableSearch('/company/verification');
  await page.setViewportSize({ width: 820, height: 650 });
  await login('institute');
  await tableSearch('/institute/student-details');
  await login('admin');
  await page.goto(`${base}/admin/dashboard`);
  await page.locator('header').getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login\/?$/);
  assert.equal((await context.cookies()).some(c => c.name === 'neat_token'), false);
  await page.goto(`${base}/admin/dashboard`);
  await expect(page).toHaveURL(/\/login\/?$/);
  assert.deepEqual(failures, []);
  console.log('PASS logout and protected-route behavior unchanged; zero browser runtime errors');
  await context.close();
} finally {
  await browser?.close();
  if (f) {
    await db('company').where('neat_id', f.users.company?.application_number).delete();
    await db('company_details').where('neat_id', f.users.company?.application_number).delete();
    await db('institute').where('Permanent Institute Id', f.users.institute?.application_number).delete();
    await db('neat_eoi').where('neat_id', f.marker).delete();
    await f.cleanup();
  }
  await db.destroy();
}
