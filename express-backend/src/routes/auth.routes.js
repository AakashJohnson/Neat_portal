import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth, requireGuest } from '../middleware/auth.js';
import { validateRequest } from '../validators/laravelValidator.js';
import { asyncHandler, send } from '../http/asyncHandler.js';
import * as account from '../services/auth/accountService.js';
import { requestAll } from '../utils/request.js';
import { clientIp, requestUrl } from '../utils/request.js';

export const authRouter = Router();

const ctx = (req) => ({ ip: clientIp(req), userAgent: req.get('user-agent') ?? '', issuer: requestUrl(req) });
const handle = (fn) => asyncHandler(async (req, res) => send(res, await fn(req)));

// Api\Auth\AuthController: guest-only login (LoginRequest rules), auth-only logout.
authRouter.post('/login', requireGuest, validateRequest({ username: 'required', password: 'required' }), auth.login);
authRouter.post('/logout', requireAuth, auth.logout);

// RegistrationController (middleware: registration)
authRouter.post('/register', handle((req) => account.register(requestAll(req))));
authRouter.post('/register/verify-email/:token', handle(() => account.verifyEmailToken()));

// Password reset — stock broker (guest + password-reset) and the custom pair used by Angular.
authRouter.post('/password/remind', requireGuest, handle((req) => account.passwordRemind(requestAll(req), ctx(req))));
authRouter.post('/sendPasswordResetLink', handle((req) => account.sendPasswordResetLink(requestAll(req))));
authRouter.post('/resetPassword', handle((req) => account.changePassword(requestAll(req))));

// MobileUserAuthController
authRouter.post('/mobile/login', handle((req) => account.mobileLogin(requestAll(req), ctx(req))));
authRouter.post('/mobile/register', handle((req) => account.mobileRegister(requestAll(req))));
authRouter.post('/mobile/forgot-password', handle((req) => account.mobileForgotPassword(requestAll(req), ctx(req))));
