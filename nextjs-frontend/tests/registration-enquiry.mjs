// Run only against dedicated Next/Express processes configured for neat_portal_test.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { checkProfile } from './profile-acceptance.mjs';

assert.equal(process.env.DB_DATABASE, 'neat_portal_test', 'Set DB_DATABASE=neat_portal_test; never run these writes against the live database.');
assert.ok(process.env.FLOW_NEXT_ORIGIN, 'Set FLOW_NEXT_ORIGIN to the dedicated test frontend.');
assert.ok(process.env.FLOW_API_ORIGIN, 'Set FLOW_API_ORIGIN to its dedicated test API.');
const base = process.env.FLOW_NEXT_ORIGIN;
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'express-backend');
const requireBackend = createRequire(path.join(backend, 'package.json'));
requireBackend('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const { db } = await import(pathToFileURL(path.join(backend, 'src', 'database', 'knex.js')));
const marker = `ui-flow-${randomBytes(6).toString('hex')}`;
const emails = [];
const password = 'Regression#Pass1';
const profileFailures = [];
const browser = await chromium.launch();
const chooseRole = async (page, role) => {
  await page.locator('mat-select .mat-select-trigger').click();
  await page.locator('.mat-select-panel mat-option', { hasText: role }).click();
};
const field = (page, name, value) => page.locator(`input[name="${name}"]`).fill(value);

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  for (const role of ['Student', 'Institute', 'Learner']) {
    const email = `${marker}+${role.toLowerCase()}@example.invalid`;
    emails.push(email);
    const phone = String(8000000000 + Number.parseInt(randomBytes(4).toString('hex'), 16) % 1000000000);
    await page.goto(`${base}/register`);
    // These transitions previously left validators attached to hidden fields.
    for (const selection of ['Student', 'Institute', 'Learner', role]) await chooseRole(page, selection);
    await field(page, 'name', 'UI Flow Test');
    await field(page, 'phone', phone);
    await field(page, 'email', email);
    await field(page, 'password', password);
    await field(page, 'password_confirmation', password);
    if (role === 'Student') {
      await field(page, 'college_name', marker);
      await field(page, 'admission_number', 'ADM-UI');
    }
    if (role === 'Institute') await field(page, 'permanent_institute_id', `${marker}-institute`);
    const pending = page.waitForResponse(r => r.url().endsWith('/bff/register') && r.request().method() === 'POST');
    await page.locator('button[type=submit]').click();
    const response = await pending;
    assert.equal(response.status(), 201, 'Registration must succeed after role transitions.');
    const user = await db('users').where({ email }).first();
    assert.ok(user.application_number);
    assert.equal(user.phone, phone);
    const body = await response.json();
    if (body.requires_email_confirmation) {
      await expect(page.getByRole('status')).toContainText('account is saved');
      await page.goto(`${base}/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(user.email_verification_token)}`);
      await expect(page).toHaveURL(`${base}/login`);
      assert.equal((await db('users').where('id', user.id).first('status')).status, 'Active');
    }
    // Exercise UTF-8 and multiple base64url replacements in the BFF decoder.
    const username = role === 'Learner' ? `UI ${'\uffff'.repeat(12)}` : user.username;
    if (role === 'Learner') await db('users').where('id', user.id).update({ username });
    await page.goto(`${base}/login`);
    await field(page, 'email', email);
    await field(page, 'password', password);
    await page.locator('button[type=submit]').click();
    const destination = { Student: '/student/paid-Products-details-checkout', Institute: '/institute', Learner: '/learner/learner-free-course' }[role];
    await expect(page).toHaveURL(new RegExp(`${destination}/?$`));
    const session = await (await context.request.get(`${base}/api/session`)).json();
    assert.equal(session.claims.email, email);
    assert.equal(session.claims.username, username);
    assert.equal(session.legacyDecodable, true);
    const cookies = await context.cookies();
    assert.ok(cookies.find(c => c.name === 'neat_token' && c.httpOnly));
    try {
      await checkProfile({ page, base, db, role, user, marker });
    } catch (error) {
      console.error(`FAIL ${role} profile: ${error.message}`);
      profileFailures.push(error);
    }
    await context.request.delete(`${base}/api/session`);
    console.log(`PASS ${role}: role transitions -> registration -> SQL -> verification -> login -> httpOnly session`);
  }

  await page.goto(`${base}/register`);
  await chooseRole(page, 'Learner');
  for (const [name, value] of Object.entries({ name: 'Failure Test', phone: '9876543210', email: 'failure@example.invalid', password, password_confirmation: password })) await field(page, name, value);
  await page.route('**/bff/register', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Registration service unavailable' }) }));
  await page.locator('button[type=submit]').click();
  await expect(page.getByRole('status')).toContainText('Registration service unavailable');
  await page.unroute('**/bff/register');
  console.log('PASS registration: server failures display an actionable message');

  const product = await db('product_details').where({ product_active: 'Approved', isDetailsSubmitted: 'Yes' }).whereNotNull('neat_id').first('code', 'neat_id', 'course_name');
  assert.ok(product, 'An approved product fixture is required.');
  await page.goto(`${base}/b2b-course-details/${encodeURIComponent(product.code)}`);
  await page.locator('.btnFreeCvd').click();
  const modal = page.locator('#sendEnquiryYourPaidSeat');
  await expect(modal.locator('button[type=submit]')).toBeEnabled();
  let submissions = 0;
  page.on('request', r => { if (r.url().includes('/submitB2BEnquiry')) submissions++; });
  await modal.locator('button[type=submit]').click();
  await expect(modal.getByRole('status')).toContainText('Please fill all enquiry details');
  assert.equal(submissions, 0);
  const values = {
    college_name: marker, college_representative_name: 'UI Representative', designation: 'Dean',
    college_email: 'college@example.invalid', no_of_seats: '25', mobile_number: '9876543210',
  };
  for (const [name, value] of Object.entries(values)) await field(modal, name, value);
  await modal.locator('textarea').fill('UI regression enquiry');
  const pending = page.waitForResponse(r => r.url().includes('/submitB2BEnquiry'));
  await modal.locator('button[type=submit]').click();
  const response = await pending;
  assert.equal(response.status(), 200);
  await expect(modal.getByRole('status')).toContainText('saved');
  const row = await db('b2b_enquiry').where('college_name', marker).first();
  assert.deepEqual(
    Object.fromEntries(Object.keys(values).map(k => [k, String(row[k])])),
    values,
  );
  assert.equal(row.neat_id, product.neat_id);
  assert.equal(row.product_code, product.code);
  assert.equal(row.message, 'UI regression enquiry');
  console.log('PASS B2B: invalid input blocked; all submitted fields persisted through browser -> BFF -> Express -> SQL');
  await context.close();
  assert.equal(profileFailures.length, 0, 'All role profile acceptance checks must pass.');
} finally {
  await browser.close();
  await db('b2b_enquiry').where('college_name', marker).delete();
  for (const email of emails) {
    const ids = await db('users').where({ email }).pluck('id');
    const applications = await db('users').where({ email }).pluck('application_number');
    const permanentIds = await db('users').where({ email }).whereNotNull('permanent_institute_id').pluck('permanent_institute_id');
    if (permanentIds.length) await db('student').whereIn('permanent_institute_id', permanentIds).delete();
    if (applications.length) await db('institute_details').whereIn('application_number', applications).delete();
    if (ids.length) {
      await db('api_tokens').whereIn('user_id', ids).delete();
      await db('user_activity').whereIn('user_id', ids).delete();
      await db('users').whereIn('id', ids).delete();
    }
    await db('student_details').where({ email }).delete();
    await db('learner').where({ email }).delete();
  }
  await db.destroy();
}
