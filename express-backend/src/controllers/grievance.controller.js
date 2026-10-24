import { asyncHandler, send } from '../http/asyncHandler.js';
import * as grievance from '../services/grievanceService.js';
import { input } from '../utils/request.js';

/** Laravel url('/') of the current request — used for links/logos in mails. */
export const appUrlOf = (req) => `${req.protocol}://${req.get('host')}`;

export const submitGrievance = asyncHandler(async (req, res) => {
  send(res, await grievance.submitGrievance(input(req, 'name', 'email', 'mobile', 'organization', 'description', 'company_name', 'company_product_name')));
});

export const submitFeedback = asyncHandler(async (req, res) => {
  send(res, await grievance.submitFeedback(req, input(req, 'name', 'email', 'experience', 'feedback'), { appUrl: appUrlOf(req) }));
});

export const getAnnouncements = asyncHandler(async (_req, res) => {
  send(res, await grievance.getAnnouncements());
});

export const getDetailsArticle = asyncHandler(async (req, res) => {
  send(res, await grievance.getDetailsArticle(input(req, 'id')));
});

export const submitContactUs = asyncHandler(async (req, res) => {
  send(res, await grievance.submitContactUs(input(req, 'name', 'email', 'message')));
});
