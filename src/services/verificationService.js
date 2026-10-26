// Port of Api\UserVerificationController.
import { db, table } from '../database/knex.js';
import { verifyToken, JwtError } from './auth/jwtService.js';
import { nowSql } from '../utils/time.js';

const users = () => db(table('users'));


export async function verifyUserLoggedIn(token) {
  if (token == null) return { status: 200, empty: true };
  try {
    const payload = await verifyToken(token);
    // $payload['user_id'], ['uuid'], ['email'], ['role_id'] — PHP raised
    // "Undefined index" for a missing key, which the catch block reported.
    for (const key of ['user_id', 'uuid', 'email', 'role_id']) {
      if (!(key in payload)) return { status: 200, body: { message: 'Not logged In', reason: `Undefined index: ${key}` } };
    }
    return { status: 200, body: { message: 'Success' } };
  } catch (err) {
    if (err instanceof JwtError) return { status: 200, body: { message: 'Not logged In', reason: err.message } };
    throw err;
  }
}

/** POST /api/emailVerification */
export async function emailVerification({ email, token }) {
  const invalid = { status: 422, body: { message: 'Error', reason: 'Email already verified or incorrect token.' } };
  if (typeof email !== 'string' || !email || typeof token !== 'string' || !token) return invalid;
  const user = await users().where({ email, email_verification_token: token }).whereNot('status', 'Banned').first('id');
  if (!user) return invalid;
  const changed = await users().where({ id: user.id, email_verification_token: token }).whereNot('status', 'Banned').update({
    email_verification_token: null, email_verified_at: nowSql(), status: 'Active',
  });
  if (!changed) {
    return invalid;
  }
  return { status: 200, body: { message: 'Success' } };
}

/** POST /api/otpVerification */
export async function otpVerification(input) {

  const phone = input.phone ?? null;
  const otp = input.otp ?? null;
  const match = await users().where({ phone, sms_otp: otp, sms_otp_verified: 'No' }).first();
  if (match) {
    await users().where('phone', phone).update({ sms_otp_verified: 'Yes' });
    return { status: 200, body: { message: 'Success' } };
  }
  if (!(await users().where({ phone }).first())) {
    return { status: 200, body: { message: 'Error', reason: 'Invalid Phone number' } };
  }
  if (!(await users().where({ phone, sms_otp: otp }).first())) {
    return { status: 200, body: { message: 'Error', reason: 'Invalid OTP provided' } };
  }
  // Phone + OTP match but sms_otp_verified is no longer "No".
  if (!(await users().where({ phone, sms_otp: otp, sms_otp_verified: 'No' }).first())) {
    return { status: 200, body: { message: 'Error', reason: 'OTP already verified' } };
  }
  return { status: 200, body: { message: 'Error', reason: 'Invalid credentials' } };
}
