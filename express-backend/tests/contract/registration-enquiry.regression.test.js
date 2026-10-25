import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { callNode } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import * as mailer from '../../src/integrations/mail/mailer.js';
import { env } from '../../src/config/env.js';
import { checkPassword } from '../../src/services/auth/authService.js';

vi.mock('node:crypto', async (original) => {
  const crypto = await original();
  return { ...crypto, randomInt: vi.fn(crypto.randomInt) };
});

const marker = `flow-${randomBytes(6).toString('hex')}`;
const emails = [];
const password = 'Regression#Pass1';
let settings;
let product;
const bodyFor = (role = 'Learner') => {
  const id = emails.length;
  const email = `${marker}+${id}@example.invalid`;
  emails.push(email);
  return {
    email, username: 'Flow Test', password, password_confirmation: password,
    phone: String(7000000000 + Number.parseInt(randomBytes(4).toString('hex'), 16) % 1000000000),
    role_id: role, college_name: 'Flow College', admission_number: 'ADM-123',
    permanent_institute_id: `${marker}-${id}`,
  };
};
const post = (path, body) => callNode('POST', `/api/${path}`, { body });

beforeAll(async () => {
  settings = readFileSync(env.SETTINGS_PATH, 'utf8');
  writeFileSync(env.SETTINGS_PATH, JSON.stringify({ ...JSON.parse(settings), reg_enabled: '1', reg_email_confirmation: '1' }));
  product = await db('product_details').whereNotNull('neat_id').first('code', 'neat_id', 'course_name');
  expect(product).toBeTruthy();
});

afterAll(async () => {
  vi.restoreAllMocks();
  if (settings) writeFileSync(env.SETTINGS_PATH, settings);
  await db('b2b_enquiry').where('college_name', marker).delete();
  for (const email of emails) {
    const ids = await db('users').where({ email }).pluck('id');
    if (ids.length) {
      await db('api_tokens').whereIn('user_id', ids).delete();
      await db('user_activity').whereIn('user_id', ids).delete();
      await db('users').whereIn('id', ids).delete();
    }
    await db('student_details').where({ email }).delete();
    await db('learner').where({ email }).delete();
    await db('student').where({ email }).delete();
  }
});

describe('registration, verification and login repairs', () => {
  for (const role of ['Student', 'Learner', 'Institute']) {
    it(`persists all ${role} account fields and requires verification before login`, async () => {
      const input = bodyFor(role);
      mailer.clearCapturedMail();
      const res = await post('register', input);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ requires_email_confirmation: true, email_delivery: 'captured' });
      const user = await db('users').where('email', input.email).first();
      expect(user).toMatchObject({ username: input.username, phone: input.phone, status: 'Unconfirmed', email_verified_at: null });
      expect(user.application_number).toMatch(/^\d{10}$/);
      expect(await checkPassword(password, user.password)).toBe(true);
      if (role === 'Student') {
        expect(await db('student_details').where('email', input.email).first()).toMatchObject({
          application_number: user.application_number, name_of_learner: input.username,
          college_name: input.college_name, admission_registration_number: input.admission_number, contact_number: input.phone,
        });
      } else if (role === 'Learner') {
        expect(await db('learner').where('email', input.email).first()).toMatchObject({
          application_number: user.application_number, name: input.username, phone: input.phone, profession: 'Learner',
        });
      } else {
        expect(user.permanent_institute_id).toBe(input.permanent_institute_id);
      }
      const mail = mailer.capturedMail().at(-1);
      expect(mail.html).toContain(`token=${user.email_verification_token}&amp;email=${encodeURIComponent(input.email)}`);
      expect((await post('login', { username: input.email, password })).status).toBe(401);
      expect(await db('api_tokens').where('user_id', user.id)).toHaveLength(0);
      const verified = await post('emailVerification', { email: input.email, token: user.email_verification_token });
      expect(verified.body).toEqual({ message: 'Success' });
      const login = await post('login', { username: input.email, password });
      expect(login.status).toBe(200);
      expect(jwt.decode(login.body.token)).toMatchObject({ application_number: user.application_number, role_id: user.role_id });
      expect(await db('api_tokens').where('user_id', user.id)).toHaveLength(1);
      expect((await post('emailVerification', { email: input.email, token: user.email_verification_token })).status).toBe(422);
      expect((await post('emailVerification', { email: input.email })).status).toBe(422);
      expect((await post('login', { username: input.email, password: 'wrong' })).status).toBe(401);
    });
  }

  it('allows multiple registrations in the same second without partial records', async () => {
    const inputs = Array.from({ length: 4 }, () => bodyFor('Student'));
    const results = await Promise.all(inputs.map(input => post('register', input)));
    expect(results.map(r => r.status)).toEqual([201, 201, 201, 201]);
    const users = await db('users').whereIn('email', inputs.map(i => i.email));
    expect(new Set(users.map(u => u.application_number)).size).toBe(4);
  });

  it('retries a generated application-number collision without leaving partial rows', async () => {
    const first = bodyFor();
    expect((await post('register', first)).status).toBe(201);
    const existing = await db('users').where('email', first.email).first('application_number');
    vi.mocked(randomInt).mockReturnValueOnce(Number(existing.application_number));
    const next = bodyFor();
    expect((await post('register', next)).status).toBe(201);
    const user = await db('users').where('email', next.email).first();
    expect(user.application_number).not.toBe(existing.application_number);
    expect(await db('learner').where('email', next.email)).toHaveLength(1);
  });

  it('allows login immediately when confirmation is explicitly disabled', async () => {
    const current = readFileSync(env.SETTINGS_PATH, 'utf8');
    writeFileSync(env.SETTINGS_PATH, JSON.stringify({ ...JSON.parse(current), reg_email_confirmation: '0' }));
    try {
      const input = bodyFor();
      const res = await post('register', input);
      expect(res.body).toEqual({ requires_email_confirmation: false, email_delivery: 'not_required' });
      const user = await db('users').where('email', input.email).first();
      expect(user.status).toBe('Active');
      expect(user.email_verified_at).toBeTruthy();
      expect(user.email_verification_token).toBeNull();
      expect((await post('login', { username: input.email, password })).status).toBe(200);
    } finally { writeFileSync(env.SETTINGS_PATH, current); }
  });

  it('rolls back the user insert if the profile insert conflicts', async () => {
    const input = bodyFor('Student');
    await db('student_details').insert({
      application_number: `${marker}-orphan`, college_name: input.college_name, name_of_learner: input.username,
      email: input.email, contact_number: input.phone,
    });
    const res = await post('register', input);
    expect(res.status).toBe(409);
    expect(await db('users').where('email', input.email).first()).toBeUndefined();
    expect(await db('student_details').where('email', input.email)).toHaveLength(1);
  });

  it('validates role-specific and SQL-sized fields before any insert', async () => {
    const input = bodyFor('Student');
    const res = await post('register', { ...input, college_name: null, admission_number: null, phone: '12345678901' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(['college_name', 'admission_number', 'phone']));
    expect(await db('users').where('email', input.email).first()).toBeUndefined();
    expect(await db('student_details').where('email', input.email).first()).toBeUndefined();
  });

  it('serializes duplicate institute registrations', async () => {
    const a = bodyFor('Institute');
    const b = { ...bodyFor('Institute'), permanent_institute_id: a.permanent_institute_id };
    const results = await Promise.all([post('register', a), post('register', b)]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    expect(await db('users').where('permanent_institute_id', a.permanent_institute_id)).toHaveLength(1);
  });

  it('keeps a complete account and reports an SMTP failure instead of losing registration', async () => {
    const input = bodyFor();
    const send = vi.spyOn(mailer, 'sendMail').mockRejectedValueOnce(Object.assign(new Error('test mail failure'), { code: 'ECONNECTION' }));
    try {
      const res = await post('register', input);
      expect(res.body).toEqual({ requires_email_confirmation: true, email_delivery: 'failed' });
      expect(await db('users').where('email', input.email)).toHaveLength(1);
      expect(await db('learner').where('email', input.email)).toHaveLength(1);
    } finally { send.mockRestore(); }
    expect((await post('resendEmailVerificationLink', { email: input.email })).status).toBe(503);
    const user = await db('users').where('email', input.email).first();
    expect((await post(`register/verify-email/${user.email_verification_token}`, {})).body).toEqual({ success: true });
    expect((await post('register/verify-email/wrong', {})).status).toBe(400);
  });

  it('does not reactivate a banned account through an email link', async () => {
    const input = bodyFor();
    await post('register', input);
    const user = await db('users').where('email', input.email).first();
    await db('users').where('id', user.id).update({ status: 'Banned' });
    expect((await post('emailVerification', { email: input.email, token: user.email_verification_token })).status).toBe(422);
    expect((await post('login', { username: input.email, password })).status).toBe(401);
    expect(await db('api_tokens').where('user_id', user.id)).toHaveLength(0);
  });
});

describe('B2B enquiry persistence', () => {
  const enquiry = () => ({
    product_code: product.code, neat_id: 'untrusted-client-value', college_name: marker,
    college_representative_name: 'Representative', designation: 'Dean', college_email: 'college@example.invalid',
    no_of_seats: '12', mobile_number: '9876543210', message: 'Please share the details.',
  });

  it('stores every field and derives the company from the selected product', async () => {
    const input = enquiry();
    const res = await post('submitB2BEnquiry', input);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Success');
    const row = await db('b2b_enquiry').where({ college_name: marker, enquiry_no: res.body.enquiry_no }).first();
    expect(row).toMatchObject({ ...input, neat_id: product.neat_id, product_name: product.course_name, no_of_seats: 12 });
  });

  it.each(['', '0', '-1', '1.5', 'abc', '2147483648'])('rejects invalid seat count %s without a write', async (no_of_seats) => {
    const before = await db('b2b_enquiry').where('college_name', marker).count({ n: '*' });
    const res = await post('submitB2BEnquiry', { ...enquiry(), no_of_seats });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty('no_of_seats');
    expect(await db('b2b_enquiry').where('college_name', marker).count({ n: '*' })).toEqual(before);
  });

  it('rejects missing contact details and unknown products explicitly', async () => {
    expect((await post('submitB2BEnquiry', {})).status).toBe(422);
    expect((await post('submitB2BEnquiry', { ...enquiry(), product_code: marker })).status).toBe(404);
  });

  it('reports mail failure separately from a successfully saved enquiry', async () => {
    const send = vi.spyOn(mailer, 'sendMail').mockRejectedValueOnce(new Error('test mail failure'));
    try {
      const res = await post('submitB2BEnquiry', enquiry());
      expect(res.body).toMatchObject({ message: 'Success', email_delivery: 'failed' });
      expect(await db('b2b_enquiry').where({ college_name: marker, enquiry_no: res.body.enquiry_no }).first()).toBeTruthy();
    } finally { send.mockRestore(); }
  });
});
