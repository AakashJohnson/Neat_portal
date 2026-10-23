import { Router } from 'express';
import * as verification from '../controllers/verification.controller.js';

export const verificationRouter = Router();

verificationRouter.get('/verifyUserLoggedIn', verification.verifyUserLoggedIn);
verificationRouter.post('/emailVerification', verification.emailVerification);
verificationRouter.post('/otpVerification', verification.otpVerification);
