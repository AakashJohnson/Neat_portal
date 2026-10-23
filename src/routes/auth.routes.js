import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth, requireGuest } from '../middleware/auth.js';
import { validateRequest } from '../validators/laravelValidator.js';

export const authRouter = Router();

// Api\Auth\AuthController: guest-only login (LoginRequest rules), auth-only logout.
authRouter.post('/login', requireGuest, validateRequest({ username: 'required', password: 'required' }), auth.login);
authRouter.post('/logout', requireAuth, auth.logout);
