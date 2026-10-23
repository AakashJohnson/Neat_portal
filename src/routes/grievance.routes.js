import { Router } from 'express';
import * as grievance from '../controllers/grievance.controller.js';

export const grievanceRouter = Router();

grievanceRouter.post('/submitGrievance', grievance.submitGrievance);
grievanceRouter.post('/submitFeedback', grievance.submitFeedback);
grievanceRouter.get('/getAnnouncements', grievance.getAnnouncements);
grievanceRouter.get('/get-details-article', grievance.getDetailsArticle);
grievanceRouter.post('/submitContactUs', grievance.submitContactUs);
