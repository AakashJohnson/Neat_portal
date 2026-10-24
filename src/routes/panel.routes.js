// Admin-panel endpoints that replace Laravel web (Blade) actions — ADR-07.
import { Router } from 'express';
import { asyncHandler, send } from '../http/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../services/auth/permissions.js';
import * as panel from '../services/panel/panelService.js';
import * as announcements from '../services/panel/announcementsPanel.js';
import * as activity from '../services/panel/activityPanel.js';
import * as webAuth from '../services/panel/webAuth.js';
import * as permissionsPanel from '../services/panel/permissionsPanel.js';
import { clientIp, requestAll, requestUrl } from '../utils/request.js';

export const panelRouter = Router();

const ctx = (req) => ({ user: req.auth.user, payload: req.auth.payload, ip: clientIp(req), userAgent: req.get('user-agent') ?? '' });
const tokenCtx = (req) => ({ ip: clientIp(req), userAgent: req.get('user-agent') ?? '', issuer: requestUrl(req) });
const h = (fn) => asyncHandler(async (req, res) => send(res, await fn(req)));
const admin = [requireAuth, requirePermission('users.manage')];

panelRouter.get('/panel/context', requireAuth, h((req) => panel.context(req, ctx(req))));

// WebAuth controllers (guest pages of the panel) and e-mail verification.
panelRouter.post('/panel/login', h((req) => webAuth.login(requestAll(req), tokenCtx(req))));
panelRouter.post('/panel/register', h((req) => webAuth.register(requestAll(req), tokenCtx(req))));
panelRouter.post('/panel/password/reset', h((req) => webAuth.resetPassword(requestAll(req), tokenCtx(req))));
panelRouter.post('/panel/email/resend', requireAuth, h((req) => webAuth.resendVerification(ctx(req))));
panelRouter.post('/panel/email/verify', requireAuth, h((req) => webAuth.verifyEmail(ctx(req), requestAll(req))));

// neatapp/activity-log web pages.
panelRouter.get('/panel/activity', requireAuth, requirePermission('users.activity'), h((req) => activity.all(req)));
panelRouter.get('/panel/activity/user/:user', requireAuth, requirePermission('users.activity'), h((req) => activity.forUser(req, req.params.user)));
panelRouter.get('/panel/profile/activity', requireAuth, h((req) => activity.own(req, ctx(req))));

// WebAuthorizationRolePermissionsController@update (every role, empty sets allowed).
panelRouter.post('/panel/permissions/save', requireAuth, requirePermission('permissions.manage'), h((req) => permissionsPanel.save(ctx(req), requestAll(req))));

// neatapp/announcements web routes: list/show for any user, the rest announcements.manage.
const manageAnnouncements = [requireAuth, requirePermission('announcements.manage')];
panelRouter.get('/panel/announcements/list', requireAuth, h((req) => announcements.paginate(req, 7)));
panelRouter.get('/panel/announcements', ...manageAnnouncements, h((req) => announcements.paginate(req, 10)));
panelRouter.post('/panel/announcements', ...manageAnnouncements, h((req) => announcements.create(req, ctx(req), requestAll(req))));
panelRouter.get('/panel/announcements/:id', requireAuth, h((req) => announcements.show(req, req.params.id)));
panelRouter.put('/panel/announcements/:id', ...manageAnnouncements, h((req) => announcements.update(req, ctx(req), req.params.id, requestAll(req))));
panelRouter.delete('/panel/announcements/:id', ...manageAnnouncements, h((req) => announcements.destroy(ctx(req), req.params.id)));

panelRouter.post('/panel/settings/:group', requireAuth, h((req) => panel.updateSettings(ctx(req), req.params.group, requestAll(req))));

panelRouter.post('/panel/impersonate/leave', requireAuth, h((req) => panel.leaveImpersonation(ctx(req), tokenCtx(req))));
panelRouter.post('/panel/impersonate/:user', requireAuth, h((req) => panel.impersonate(ctx(req), req.params.user, tokenCtx(req))));

// Web\CompanyCreateProfile — public in Laravel; admin-only here (DEV-15/16).
panelRouter.post('/panel/company-profile/fetch-neat-id', ...admin, h((req) => panel.fetchNeatId(requestAll(req))));
panelRouter.post('/panel/company-profile/products', ...admin, h((req) => panel.getEoiProducts(requestAll(req))));
panelRouter.post('/panel/company-profile/product-details', ...admin, h((req) => panel.getEoiProductDetails(requestAll(req))));
panelRouter.post('/panel/company-profile/create-product', ...admin, h((req) => panel.createProduct(requestAll(req))));
panelRouter.post('/panel/company-profile', ...admin, h((req) => panel.createCompanyProfile(requestAll(req))));
