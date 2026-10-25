// AUTH-03 verifyUserLoggedIn, AUTH-04 emailVerification, AUTH-05 otpVerification
// — parity with Laravel Api\UserVerificationController.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';

const ADMIN = 'neatadmin@aicte-india.org';
let reference;

beforeAll(async () => {
  reference = await laravelAvailable();
});

describe('AUTH-03 GET /api/verifyUserLoggedIn', () => {
  it('matches Laravel for every token edge case', async ({ skip }) => {
    if (!reference) skip();
    const good = await fixtureToken(callLaravel, ADMIN);
    const p = jwt.decode(good);
    const now = Math.floor(Date.now() / 1000);
    const sign = (payload, secret = process.env.JWT_SECRET) => jwt.sign(payload, secret, { algorithm: 'HS256' });
    const without = (k) => {
      const q = { ...p };
      delete q[k];
      return sign(q);
    };
    const cases = {
      none: undefined,
      empty: '',
      garbage: 'abc',
      twoSegments: 'a.b',
      threeJunk: 'a.b.c',
      otherSecret: sign({ ...p }, 'not-the-secret'),
      expired: sign({ ...p, iat: now - 7200, nbf: now - 7200, exp: now - 3600 }),
      nbfFuture: sign({ ...p, nbf: now + 3600 }),
      unknownJti: sign({ ...p, jti: 'X'.repeat(40) }),
      noJti: without('jti'),
      wrongPrv: sign({ ...p, prv: '0'.repeat(40) }),
      noUuid: without('uuid'),
      noEmail: without('email'),
      valid: good,
    };
    for (const [name, token] of Object.entries(cases)) {
      const opts = token === undefined ? {} : { query: { token } };
      const [l, n] = await Promise.all([
        callLaravel('GET', '/api/verifyUserLoggedIn', opts),
        callNode('GET', '/api/verifyUserLoggedIn', opts),
      ]);
      expect({ name, status: n.status, body: n.body }).toEqual({ name, status: l.status, body: l.body });
    }
  });

  it('accepts a Laravel-issued token (cross-compatibility)', async ({ skip }) => {
    if (!reference) skip();
    const token = await fixtureToken(callLaravel, ADMIN);
    const n = await callNode('GET', '/api/verifyUserLoggedIn', { query: { token } });
    expect(n.body).toEqual({ message: 'Success' });
  });
});

describe('AUTH-04 POST /api/emailVerification', () => {
  // Two unconfirmed test-DB users: one is driven through Laravel, one through Node.
  let pair;
  const snapshot = [];

  beforeAll(async () => {
    pair = await db('users').where('status', 'Unconfirmed').whereNotNull('email_verification_token').orderBy('id').limit(2);
    for (const u of pair) snapshot.push(await db('users').where('id', u.id).first('id', 'status', 'email_verified_at', 'email_verification_token'));
  });

  afterAll(async () => {
    // Restore the two test-DB rows so the test is repeatable.
    for (const s of snapshot) await db('users').where('id', s.id).update(s);
  });

  it('returns an explicit error for unknown e-mail, wrong token and missing input', async () => {
    for (const body of [{ email: 'nobody@example.invalid', token: 'x' }, { email: pair[0]?.email, token: 'wrong' }, {}]) {
      const n = await callNode('POST', '/api/emailVerification', { body });
      expect(n.status).toBe(422);
      expect(n.body).toEqual({ message: 'Error', reason: 'Email already verified or incorrect token.' });
    }
  });

  it('matches Laravel on success, including the resulting row state', async ({ skip }) => {
    if (!reference || pair.length < 2) skip();
    const [a, b] = pair;
    const l = await callLaravel('POST', '/api/emailVerification', { body: { email: a.email, token: a.email_verification_token } });
    const n = await callNode('POST', '/api/emailVerification', { body: { email: b.email, token: b.email_verification_token } });
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
    const ra = await db('users').where('id', a.id).first('status', 'email_verification_token', 'email_verified_at');
    const rb = await db('users').where('id', b.id).first('status', 'email_verification_token', 'email_verified_at');
    expect({ ...rb, email_verified_at: !!rb.email_verified_at }).toEqual({ ...ra, email_verified_at: !!ra.email_verified_at });
  });
});

describe('AUTH-05 POST /api/otpVerification', () => {
  it('matches Laravel for invalid phone, invalid OTP and missing input', async ({ skip }) => {
    if (!reference) skip();
    const anyPhone = await db('users').whereNotNull('phone').whereNotNull('sms_otp').first('phone');
    const bodies = [{ phone: '0000000000', otp: '1' }, { phone: anyPhone?.phone, otp: 'not-the-otp' }, {}];
    for (const body of bodies) {
      const [l, n] = await Promise.all([callLaravel('POST', '/api/otpVerification', { body }), callNode('POST', '/api/otpVerification', { body })]);
      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
    }
  });
});
