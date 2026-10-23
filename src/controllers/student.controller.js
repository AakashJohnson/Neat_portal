import { asyncHandler, send } from '../http/asyncHandler.js';
import * as student from '../services/studentService.js';
import { input, requestAll } from '../utils/request.js';

const handle = (fn) => asyncHandler(async (req, res) => send(res, await fn(req)));

export const getFaqs = handle((req) => student.getFaqs(input(req, 'role')));
export const getFaqsHindi = handle((req) => student.getFaqsHindi(input(req, 'role')));

export const submitStudentDetails = handle((req) => student.submitStudentDetails(req, requestAll(req)));
export const getStudentDetails = handle((req) => student.getStudentDetails(req));
export const editStudentDetails = handle((req) => student.editStudentDetails(req));

export const getPurchasedProducts = handle((req) => student.getPurchasedProducts(req, input(req, 'application_number')));
export const getFreeProducts = handle((req) => student.getFreeProducts(req, input(req, 'application_number')));
export const getAppliedProducts = handle((req) => student.getAppliedProducts(req, input(req, 'application_number')));

export const sendFreeSeatVerificationMail = handle((req) => student.sendFreeSeatVerificationMail(req, input(req, 'code')));
export const checkStudentExists = handle((req) => student.checkStudentExists(input(req, 'student_email')));
export const checkStudentSecretCode = handle((req) => student.checkStudentSecretCode(req, input(req, 'application_number', 'product_id', 'neat_secret_code')));
export const checkCompanySecretCode = handle((req) => student.checkCompanySecretCode(req, input(req, 'company_secret_code', 'course_id')));

export const submitLearnerDetails = handle((req) => student.submitLearnerDetails(req, requestAll(req)));
export const getLearnerDetails = handle((req) => student.getLearnerDetails(req));
export const editLearnerDetails = handle((req) => student.editLearnerDetails(req));

export const getCollegeNames = handle((req) => student.getCollegeNames(req, input(req, 'college_state')));
export const getStates = handle(() => student.getStates());
export const checkFileUpload = handle((req) => student.checkFileUpload(req));
