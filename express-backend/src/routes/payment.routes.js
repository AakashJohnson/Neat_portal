import { Router } from 'express';
import { asyncHandler, send } from '../http/asyncHandler.js';
import * as payment from '../services/paymentService.js';
import * as excel from '../services/excelService.js';
import { input } from '../utils/request.js';

export const paymentRouter = Router();

paymentRouter.post('/paymentSuccess', asyncHandler(async (req, res) => send(res, await payment.paymentSuccess(input(req, 'studentid', 'courseid', 'token')))));
paymentRouter.post('/paymentFailure', asyncHandler(async (req, res) => send(res, await payment.paymentFailure(req, input(req, 'studentid', 'courseid')))));
paymentRouter.get('/getInstitutesWithStudentsForExcel', asyncHandler(async (req, res) => send(res, await excel.getInstitutesWithStudents(req))));
paymentRouter.get('/getUsersExcel', asyncHandler(async (req, res) => send(res, await excel.getUsersExcel(req, input(req, 'role_id')))));

// UNRESOLVED (R-03): paymentRedirect — commented out in PaymentController.
