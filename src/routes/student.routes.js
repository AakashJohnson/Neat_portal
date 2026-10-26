import { Router } from 'express';
import * as s from '../controllers/student.controller.js';

export const studentRouter = Router();

studentRouter.post('/submitStudentDetails', s.submitStudentDetails);
studentRouter.post('/getPurchasedProducts', s.getPurchasedProducts);
studentRouter.post('/getFreeProducts', s.getFreeProducts);
studentRouter.get('/getStudentDetails', s.getStudentDetails);
studentRouter.post('/getAppliedProducts', s.getAppliedProducts);
studentRouter.post('/sendFreeSeatVerificationMail', s.sendFreeSeatVerificationMail);
studentRouter.post('/checkStudentExists', s.checkStudentExists);
studentRouter.post('/checkCompanySecretCode', s.checkCompanySecretCode);
studentRouter.post('/checkStudentSecretCode', s.checkStudentSecretCode);
studentRouter.post('/getCollegeNames', s.getCollegeNames);
studentRouter.get('/editStudentDetails', s.editStudentDetails);
studentRouter.get('/getStates', s.getStates);
studentRouter.get('/checkFileUpload', s.checkFileUpload);
studentRouter.post('/submitLearnerDetails', s.submitLearnerDetails);
studentRouter.get('/getLearnerDetails', s.getLearnerDetails);
studentRouter.get('/editLearnerDetails', s.editLearnerDetails);
studentRouter.post('/getFaqs', s.getFaqs);
studentRouter.post('/getFaqsHindi', s.getFaqsHindi);
