// Admin-panel endpoints that replace Laravel web (Blade) actions — ADR-07.
import { Router } from 'express';
import { asyncHandler, send } from '../http/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../services/auth/permissions.js';
import * as panel from '../services/panel/panelService.js';
import { clientIp, requestAll, requestUrl } from '../utils/request.js';

export const panelRouter = Router();

const ctx = (req) => ({ user: req.auth.user, payload: req.auth.payload, ip: clientIp(req), userAgent: req.get('user-agent') ?? '' });
const tokenCtx = (req) => ({ ip: clientIp(req), userAgent: req.get('user-agent') ?? '', issuer: requestUrl(req) });
const h = (fn) => asyncHandler(async (req, res) => send(res, await fn(req)));
const admin = [requireAuth, requirePermission('users.manage')];

panelRouter.post('/panel/settings/:group', requireAuth, h((req) => panel.updateSettings(ctx(req), req.params.group, requestAll(req))));

panelRouter.post('/panel/impersonate/leave', requireAuth, h((req) => panel.leaveImpersonation(ctx(req), tokenCtx(req))));
panelRouter.post('/panel/impersonate/:user', requireAuth, h((req) => panel.impersonate(ctx(req), req.params.user, tokenCtx(req))));

// Web\CompanyCreateProfile — public in Laravel; admin-only here (DEV-15/16).
panelRouter.post('/panel/company-profile/fetch-neat-id', ...admin, h((req) => panel.fetchNeatId(requestAll(req))));
panelRouter.post('/panel/company-profile/products', ...admin, h((req) => panel.getEoiProducts(requestAll(req))));
panelRouter.post('/panel/company-profile/product-details', ...admin, h((req) => panel.getEoiProductDetails(requestAll(req))));
panelRouter.post('/panel/company-profile/create-product', ...admin, h((req) => panel.createProduct(requestAll(req))));
panelRouter.post('/panel/company-profile', ...admin, h((req) => panel.createCompanyProfile(requestAll(req))));
