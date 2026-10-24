import { asyncHandler, send } from '../http/asyncHandler.js';
import * as verification from '../services/verificationService.js';
import { requestAll } from '../utils/request.js';
import { extractToken } from '../services/auth/jwtService.js';

/** GET /api/verifyUserLoggedIn — UserVerificationController@verifyUserLoggedIn */
export const verifyUserLoggedIn = asyncHandler(async (req, res) => {
  // `$request->token` must be present (non-null) for the controller to do anything.
  const input = requestAll(req);
  const result = await verification.verifyUserLoggedIn(input.token == null ? null : extractToken(req));
  if (result.empty) return res.status(200).type('text/html; charset=UTF-8').send('');
  send(res, result);
});

/** POST /api/emailVerification — UserVerificationController@emailVerification */
export const emailVerification = asyncHandler(async (req, res) => {
  const { email, token } = requestAll(req);
  send(res, await verification.emailVerification({ email, token }));
});

/** POST /api/otpVerification — UserVerificationController@otpVerification */
export const otpVerification = asyncHandler(async (req, res) => {
  const { phone, otp } = requestAll(req);
  send(res, await verification.otpVerification({ phone, otp }));
});
