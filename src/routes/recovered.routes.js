import { Router } from 'express';
import { asyncHandler, send } from '../http/asyncHandler.js';
import { requestAll } from '../utils/request.js';
import * as company from '../services/companyService.js';
import * as purchase from '../services/purchaseService.js';
import * as allocation from '../services/allocationService.js';

export const recoveredRouter = Router();
const handle = fn => asyncHandler(async (req, res) => send(res, await fn(req, requestAll(req))));

recoveredRouter.post('/getCounts', handle(company.getCounts));
recoveredRouter.post('/getProductFlags', handle(company.getProductFlags));
recoveredRouter.get('/getStudentTransactionIds', handle(company.getStudentTransactionIds));
recoveredRouter.get('/product-list', handle(company.productList));
recoveredRouter.get('/getStudentEligibility', handle(allocation.getStudentEligibility));
recoveredRouter.post('/submitTransactionId', handle(purchase.submitTransactionId));
recoveredRouter.post('/sendFreeAllocationMail', handle(allocation.sendFreeAllocationMail));
recoveredRouter.post('/applyForFreeCourse', handle(purchase.applyForFreeCourse));
recoveredRouter.post('/assignFreeCourse', handle(allocation.assignFreeCourse));
recoveredRouter.post('/assignPaidCourse', handle(purchase.assignPaidCourse));
recoveredRouter.post('/addToCart', handle(purchase.addToCart));
recoveredRouter.post('/displayCart', handle(purchase.displayCart));
recoveredRouter.post('/displayPaidProducts', handle(purchase.displayPaidProducts));
recoveredRouter.post('/allocateseat', handle(allocation.allocateSeats));
recoveredRouter.get('/allocated-seat', handle(allocation.allocatedSeats));
recoveredRouter.post('/paymentRedirect', handle(purchase.paymentRedirect));
