import { asyncHandler, send } from '../http/asyncHandler.js';
import * as admin from '../services/adminService.js';
import { input } from '../utils/request.js';

const handle = (fn) => asyncHandler(async (req, res) => send(res, await fn(req)));

export const getAdminCounts = handle((req) => admin.getAdminCounts(req));
export const getAdminProducts = handle((req) => admin.getAdminProducts(req));
export const getStudents = handle((req) => admin.getStudents(req, input(req, 'search', 'per_page')));
export const getLearners = handle((req) => admin.getLearners(req, input(req, 'search', 'per_page')));
export const getCompanies = handle((req) => admin.getCompanies(req));
export const getInstitutes = handle((req) => admin.getInstitutes(req));
export const getCompanyWiseProduct = handle((req) => admin.getCompanyWiseProduct(req, input(req, 'company_name')));
export const changeProductStatus = handle((req) => admin.changeProductStatus(req, input(req, 'code', 'status')));
export const getCompanyDetails = handle((req) => admin.getCompanyDetails(req, input(req, 'neat_id')));
export const getCourseWiseProduct = handle((req) => admin.getCourseWiseProduct(req, input(req, 'course_company_name')));
export const freeSeatStudent = handle((req) => admin.freeSeatStudent(req));
export const mouList = handle((req) => admin.mouList(req));
export const updateMouDate = handle((req) => admin.updateMouDate(req, input(req, 'neat_id', 'mou_date')));
export const getAdminCountsForAICTEDashboard = handle(() => admin.getAdminCountsForAICTEDashboard());
export const getCompanyAndProductsForAICTEDashboard = handle(() => admin.getCompanyAndProductsForAICTEDashboard());
export const productManagement = handle((req) => admin.productManagement(req));
