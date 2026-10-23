import { Router } from 'express';
import * as a from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.get('/getAdminCounts', a.getAdminCounts);
adminRouter.get('/getAdminProducts', a.getAdminProducts);
adminRouter.get('/getAdminStudents', a.getStudents);
adminRouter.get('/getCompanies', a.getCompanies);
adminRouter.get('/getInstitutes', a.getInstitutes);
adminRouter.post('/getCompanyWiseProduct', a.getCompanyWiseProduct);
adminRouter.post('/changeProductStatus', a.changeProductStatus);
adminRouter.get('/getAdminLearners', a.getLearners);
adminRouter.get('/getCompanyDetails', a.getCompanyDetails);
adminRouter.post('/getCourseWiseProduct', a.getCourseWiseProduct);
adminRouter.get('/product-management', a.productManagement);
adminRouter.get('/free-seat-student', a.freeSeatStudent);
adminRouter.get('/mou-list', a.mouList);
adminRouter.post('/update-mou-date', a.updateMouDate);
adminRouter.get('/getAdminCountsForAICTEDashboard', a.getAdminCountsForAICTEDashboard);
adminRouter.get('/getCompanyAndProductsForAICTEDashboard', a.getCompanyAndProductsForAICTEDashboard);

// UNRESOLVED (R-03): allocateseat, allocated-seat, resendEmailVerificationLink
// (ProductController methods missing in Laravel).
