import { Router } from 'express';
import * as i from '../controllers/institute.controller.js';

export const instituteRouter = Router();

instituteRouter.post('/ecxelUpload', i.ecxelUpload);
instituteRouter.post('/submitInstituteDetails', i.submitInstituteDetails);
instituteRouter.post('/submitStudentDetailsFromInstitute', i.submitStudentDetails);
instituteRouter.post('/getStudents', i.getStudents);
instituteRouter.get('/getInstituteDetails', i.getInstituteDetails);
instituteRouter.post('/uploadExcelPaid', i.uploadExcelPaid);
instituteRouter.get('/editInstituteDetails', i.editInstituteDetails);
