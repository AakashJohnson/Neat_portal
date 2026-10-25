import { Router } from 'express';
import { asyncHandler, send } from '../http/asyncHandler.js';
import * as company from '../services/companyService.js';
import { input, requestAll } from '../utils/request.js';

export const companyRouter = Router();

companyRouter.post('/getProducts', asyncHandler(async (req, res) => send(res, await company.getProducts(req, input(req, 'application_number')))));
companyRouter.post('/submitProductDetails', asyncHandler(async (req, res) => send(res, await company.submitProductDetails(req, requestAll(req)))));

// Recovered company counts, flags and transaction views are in recovered.routes.js.
