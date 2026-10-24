import { asyncHandler, send } from '../http/asyncHandler.js';
import * as institute from '../services/instituteService.js';
import { requestAll } from '../utils/request.js';

const handle = (fn) => asyncHandler(async (req, res) => send(res, await fn(req)));

export const ecxelUpload = handle((req) => institute.ecxelUpload(req));
export const uploadExcelPaid = handle((req) => institute.uploadExcelPaid(req));
export const submitInstituteDetails = handle((req) => institute.submitInstituteDetails(req, requestAll(req)));
export const submitStudentDetails = handle((req) => institute.submitStudentDetails(req, requestAll(req)));
export const getStudents = handle((req) => institute.getStudents(req));
export const getInstituteDetails = handle((req) => institute.getInstituteDetails(req));
export const editInstituteDetails = handle((req) => institute.editInstituteDetails(req));
