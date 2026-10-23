import { asyncHandler, send } from '../http/asyncHandler.js';
import * as authService from '../services/auth/authService.js';
import { clientIp, requestUrl } from '../utils/request.js';

const requestContext = (req) => ({
  ip: clientIp(req),
  userAgent: req.get('user-agent') ?? '',
  // JWT "iss" = $request->url() of the login request.
  issuer: requestUrl(req),
});

/** POST /api/login — Api\Auth\AuthController@login */
export const login = asyncHandler(async (req, res) => {
  const { username, password } = { ...req.query, ...req.body };
  send(res, await authService.login({ username, password }, requestContext(req)));
});

/** POST /api/logout — Api\Auth\AuthController@logout */
export const logout = asyncHandler(async (req, res) => {
  send(res, await authService.logout(req.auth, requestContext(req)));
});
