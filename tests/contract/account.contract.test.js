// AUTH-06..12 registration, password reset, mobile auth — Laravel parity.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { callLaravel, callNode, laravelAvailable } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import { capturedMail, clearCapturedMail } from '../../src/integrations/mail/mailer.js';
import { SECRET_USER_COLUMNS } from '../../src/repositories/userRepository.js';

let reference;
const PASSWORD = 'Contract#Pass1';
const created = [];

beforeAll(async () => {
  reference = await laravelAvailable();
});

afterAll(async () => {
  // Remove every account/profile row the registration tests created.
  for (const email of created) {
    const u = await db('users').where('email', email).first('id', 'application_number');
    if (u) {
      await db('api_tokens').where('user_id', u.id).delete();
      await db('user_activity').where('user_id', u.id).delete();
      await db('users').where('id', u.id).delete();
    }
    await db('student_details').where('email', email).delete();
    await db('learner').where('email', email).delete();
    await db('password_resets').where('email', email).delete();
  }
});

const both = (method, path, opts) => Promise.all([callLaravel(method, path, opts), callNode(method, path, opts)]);
const same = ([l, n]) => {
  expect(n.status).toBe(l.status);
  expect(n.body).toEqual(l.body);
};

describe('AUTH-06 POST /api/register', () => {
  it('validation errors (422) match Laravel', async ({ skip }) => {
    if (!reference) skip();
    const existing = await db('users').where('id', 13).first('email', 'phone');
    for (const body of [
      {},
      { email: 'bad', username: 'u', password: 'short', password_confirmation: 'x', phone: 'abc' },
      { email: existing.email, username: 'u', password: PASSWORD, password_confirmation: PASSWORD, phone: existing.phone },
      { email: 'weak@contract.invalid', username: 'u', password: 'alllowercase1', password_confirmation: 'alllowercase1', phone: '9123400000' },
    ]) {
      same(await both('POST', '/api/register', { body }));
    }
  });

  it('wrong role → {"message":"Error","reason":"Wrong Role"}', async ({ skip }) => {
    if (!reference) skip();
    const body = { email: 'role@contract.invalid', username: 'u', password: PASSWORD, password_confirmation: PASSWORD, phone: '9123400001', role_id: 'Admin' };
    same(await both('POST', '/api/register', { body }));
  });

  for (const role of ['Student', 'Learner']) {
    it(`${role}: 201, equivalent users row + profile row, UserRegistered mail with the stored token`, async ({ skip }) => {
      if (!reference) skip();
      const stamp = Date.now() % 1e6;
      const lEmail = `l-${role}-${stamp}@contract.invalid`;
      const nEmail = `n-${role}-${stamp}@contract.invalid`;
      created.push(lEmail, nEmail);
      const body = (email, phone) => ({ email, username: `Contract ${role}`, password: PASSWORD, password_confirmation: PASSWORD, phone, role_id: role, college_name: 'C', admission_number: 'A1', profession: 'Tester' });

      const l = await callLaravel('POST', '/api/register', { body: body(lEmail, `91${String(stamp).padStart(8, '0')}`) });
      clearCapturedMail();
      await new Promise((r) => setTimeout(r, 1100)); // distinct application_number timestamps
      const n = await callNode('POST', '/api/register', { body: body(nEmail, `92${String(stamp).padStart(8, '0')}`) });
      same([l, n]);
      expect(n.status).toBe(201);

      const lu = await db('users').where('email', lEmail).first();
      const nu = await db('users').where('email', nEmail).first();
      const shape = (u) => ({
        role_id: u.role_id, status: u.status, verified: u.email_verified_at === null, uuidLen: u.unique_uuid.length,
        tokenLen: u.email_verification_token.length, appNoDigits: /^\d{10}$/.test(String(u.application_number)), hash: u.password.slice(0, 7),
      });
      expect(shape(nu)).toEqual(shape(lu));

      // The Node-created account can log in on BOTH backends with its password (single bcrypt).
      await db('users').where('email', nEmail).update({ status: 'Active' });
      for (const call of [callLaravel, callNode]) {
        const login = await call('POST', '/api/login', { body: { username: nEmail, password: PASSWORD } });
        expect(login.status).toBe(200);
      }

      const mail = capturedMail().at(-1);
      expect(mail).toMatchObject({ mailable: 'UserRegistered', to: nEmail, subject: '[Neat] New User Registration' });
      expect(mail.html).toContain(`verify-email?token=${nu.email_verification_token}&amp;email=${nEmail}`);
    });
  }
});

describe('AUTH-07/08 sendPasswordResetLink + resetPassword', () => {
  const email = 'reset-target@contract.invalid';
  beforeAll(async () => {
    created.push(email);
    await db('users').insert({ email, username: 'Reset Target', password: 'x', role_id: 3, status: 'Active', unique_uuid: 'u', phone: '9000099999' });
  });

  it('unknown e-mail → 404 (both)', async ({ skip }) => {
    if (!reference) skip();
    same(await both('POST', '/api/sendPasswordResetLink', { body: { email: 'nobody@contract.invalid' } }));
  });

  it('known e-mail → 200, token stored, ResetPassword mail', async ({ skip }) => {
    if (!reference) skip();
    await db('password_resets').where('email', email).delete();
    const l = await callLaravel('POST', '/api/sendPasswordResetLink', { body: { email } });
    await db('password_resets').where('email', email).delete();
    clearCapturedMail();
    const n = await callNode('POST', '/api/sendPasswordResetLink', { body: { email } });
    same([l, n]);
    const row = await db('password_resets').where('email', email).first();
    expect(row.token).toHaveLength(60);
    expect(capturedMail().at(-1)).toMatchObject({ mailable: 'ResetPassword', subject: '[Neat] Password Reset Request' });
    expect(capturedMail().at(-1).html).toContain(`response-password-reset?token=${row.token}`);
  });

  it('resetPassword: validation, wrong token, then success (password works afterwards)', async ({ skip }) => {
    if (!reference) skip();
    same(await both('POST', '/api/resetPassword', { body: { email } }));
    same(await both('POST', '/api/resetPassword', { body: { email, token: 'wrong', password: 'NewPass#123', password_confirmation: 'NewPass#123' } }));

    const { token } = await db('password_resets').where('email', email).first();
    const n = await callNode('POST', '/api/resetPassword', { body: { email, token, password: 'NewPass#123', password_confirmation: 'NewPass#123' } });
    expect(n.status).toBe(200);
    expect(n.body).toEqual({ data: 'Password Successfully Changed', 0: 201 });
    expect(await db('password_resets').where('email', email).first()).toBeUndefined();
    const login = await callLaravel('POST', '/api/login', { body: { username: email, password: 'NewPass#123' } });
    expect(login.status).toBe(200); // a Node-written hash verifies in Laravel
  });

  it('DEV-12: a reset token older than 60 minutes is not accepted', async () => {
    await db('password_resets').where('email', email).delete();
    await db('password_resets').insert({ email, token: 'T'.repeat(60), created_at: '2020-01-01 00:00:00' });
    const n = await callNode('POST', '/api/resetPassword', { body: { email, token: 'T'.repeat(60), password: 'NewPass#123', password_confirmation: 'NewPass#123' } });
    expect(n.status).toBe(422);
    expect(n.body).toEqual({ error: 'Token or Email is incorrect' });
  });
});

describe('AUTH-09 POST /api/password/remind', () => {
  it('validation (unknown e-mail) and success', async ({ skip }) => {
    if (!reference) skip();
    same(await both('POST', '/api/password/remind', { body: { email: 'nobody@contract.invalid' } }));
    const email = 'reset-target@contract.invalid';
    same(await both('POST', '/api/password/remind', { body: { email } }));
    const row = await db('password_resets').where('email', email).first();
    expect(row.token).toMatch(/^\$2y\$10\$/); // stored hashed, like the broker
  });
});

describe('AUTH-10..12 mobile auth', () => {
  it('mobile/login: validation, unknown user, wrong password', async ({ skip }) => {
    if (!reference) skip();
    for (const body of [{}, { email: 'nobody@contract.invalid', password: 'x' }, { email: 'neatadmin@aicte-india.org', password: 'wrong' }]) {
      same(await both('POST', '/api/mobile/login', { body }));
    }
  });

  it('mobile/login success: token + user (DEV-05: no secrets)', async ({ skip }) => {
    if (!reference) skip();
    const body = { email: 'neatadmin@aicte-india.org', password: process.env.FIXTURE_PASSWORD };
    const [l, n] = await both('POST', '/api/mobile/login', { body });
    expect(n.status).toBe(l.status);
    expect(Object.keys(jwt.decode(n.body.token))).toEqual(Object.keys(jwt.decode(l.body.token)));
    for (const col of SECRET_USER_COLUMNS) expect(n.body.user).not.toHaveProperty(col);
    const strip = (u) => Object.fromEntries(Object.entries(u).filter(([k]) => !SECRET_USER_COLUMNS.includes(k) && !['unique_uuid', 'last_login', 'updated_at'].includes(k)));
    expect(strip(n.body.user)).toEqual(strip(l.body.user));
  });

  it('mobile/register: validation matches; a valid request fails like the original (R-07)', async ({ skip }) => {
    if (!reference) skip();
    same(await both('POST', '/api/mobile/register', { body: {} }));
    const body = { name: 'M', email: 'mobile-reg@contract.invalid', password: 'secret12' };
    created.push(body.email);
    const [l, n] = await both('POST', '/api/mobile/register', { body });
    expect(l.status).toBe(500);
    expect(n.status).toBe(500);
    expect(await db('users').where('email', body.email).first()).toBeUndefined();
  });

  it('mobile/forgot-password: unknown → 400, known → success', async ({ skip }) => {
    if (!reference) skip();
    same(await both('POST', '/api/mobile/forgot-password', { body: { email: 'nobody@contract.invalid' } }));
    same(await both('POST', '/api/mobile/forgot-password', { body: { email: 'reset-target@contract.invalid' } }));
  });
});
