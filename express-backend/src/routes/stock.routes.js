// Stock Vanguard API (profile, users, roles, permissions, sessions, settings,
// countries, stats) and the activity-log / announcements plugin APIs.
import { Router } from 'express';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { asyncHandler, send } from '../http/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../services/auth/permissions.js';
import * as stock from '../services/stock/stockService.js';
import { requestAll, clientIp } from '../utils/request.js';
import { normalizeBody } from '../middleware/normalizeInput.js';

const upload = multer({ dest: path.join(os.tmpdir(), 'neat-uploads'), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

export const stockRouter = Router();

const ctx = (req) => ({ user: req.auth.user, ip: clientIp(req), userAgent: req.get('user-agent') ?? '' });
const h = (fn) => asyncHandler(async (req, res) => send(res, await fn(req)));


const missingEdit = (_req, res) => res.status(500).json({ message: 'Server Error' });

const twoFactor = h(() => stock.assertTwoFactorEnabled());

// --- profile (auth)
stockRouter.get('/me', requireAuth, h((req) => stock.me(req, ctx(req))));
stockRouter.patch('/me/details', requireAuth, h((req) => stock.updateMyDetails(req, ctx(req), requestAll(req))));
stockRouter.patch('/me/details/auth', requireAuth, h((req) => stock.updateMyLoginDetails(req, ctx(req), requestAll(req))));
stockRouter.put('/me/avatar', requireAuth, upload.single('file'), normalizeBody, h((req) => stock.updateMyAvatar(req, ctx(req))));
stockRouter.delete('/me/avatar', requireAuth, h((req) => stock.deleteMyAvatar(req, ctx(req))));
stockRouter.put('/me/avatar/external', requireAuth, h((req) => stock.updateMyAvatarExternal(req, ctx(req), requestAll(req))));
stockRouter.get('/me/sessions', requireAuth, h((req) => stock.mySessions(ctx(req))));
stockRouter.put('/me/2fa', twoFactor);
stockRouter.post('/me/2fa/verify', twoFactor);
stockRouter.delete('/me/2fa', twoFactor);

// --- users (auth + users.manage)
const manageUsers = [requireAuth, requirePermission('users.manage')];
stockRouter.get('/users', ...manageUsers, h((req) => stock.listUsers(req, requestAll(req))));
stockRouter.post('/users', ...manageUsers, h((req) => stock.createUser(req, requestAll(req))));
stockRouter.get('/users/:user/edit', ...manageUsers, missingEdit);
stockRouter.get('/users/:user/activity', requireAuth, requirePermission('users.activity'), h((req) => stock.activities(req, requestAll(req), req.params.user)));
stockRouter.get('/users/:user/sessions', ...manageUsers, h((req) => stock.userSessionsFor(req.params.user)));
stockRouter.put('/users/:user/avatar', ...manageUsers, upload.single('file'), normalizeBody, h((req) => stock.adminAvatar(req, ctx(req), req.params.user, 'upload')));
stockRouter.put('/users/:user/avatar/external', ...manageUsers, h((req) => stock.adminAvatar(req, ctx(req), req.params.user, 'external', requestAll(req))));
stockRouter.delete('/users/:user/avatar', ...manageUsers, h((req) => stock.adminAvatar(req, ctx(req), req.params.user, 'delete')));
stockRouter.put('/users/:user/2fa', twoFactor);
stockRouter.post('/users/:user/2fa/verify', twoFactor);
stockRouter.delete('/users/:user/2fa', twoFactor);
stockRouter.get('/users/:user', ...manageUsers, h((req) => stock.showUser(req, req.params.user)));
stockRouter.put('/users/:user', ...manageUsers, h((req) => stock.updateUser_(req, ctx(req), req.params.user, requestAll(req))));
stockRouter.patch('/users/:user', ...manageUsers, h((req) => stock.updateUser_(req, ctx(req), req.params.user, requestAll(req))));
stockRouter.delete('/users/:user', ...manageUsers, h((req) => stock.deleteUser(ctx(req), req.params.user)));

// --- sessions
stockRouter.get('/sessions/:session', requireAuth, h((req) => stock.showSession(ctx(req), req.params.session)));
stockRouter.delete('/sessions/:session', requireAuth, h((req) => stock.destroySession(ctx(req), req.params.session)));

// --- activity plugin
stockRouter.get('/activity', requireAuth, requirePermission('users.activity'), h((req) => stock.activities(req, requestAll(req))));
stockRouter.get('/stats/activity', requireAuth, h((req) => stock.activityStats(ctx(req))));

// --- roles / permissions
const manageRoles = [requireAuth, requirePermission('roles.manage')];
stockRouter.get('/roles', ...manageRoles, h(() => stock.listRoles()));
stockRouter.post('/roles', ...manageRoles, h((req) => stock.createRole(ctx(req), requestAll(req))));
stockRouter.get('/roles/:role/edit', ...manageRoles, missingEdit);
stockRouter.get('/roles/:role/permissions', requireAuth, requirePermission('permissions.manage'), h((req) => stock.showRolePermissions(req.params.role)));
stockRouter.put('/roles/:role/permissions', requireAuth, requirePermission('permissions.manage'), h((req) => stock.updateRolePermissions(ctx(req), req.params.role, requestAll(req))));
stockRouter.get('/roles/:role', ...manageRoles, h((req) => stock.showRole(req.params.role)));
stockRouter.put('/roles/:role', ...manageRoles, h((req) => stock.updateRole(ctx(req), req.params.role, requestAll(req))));
stockRouter.patch('/roles/:role', ...manageRoles, h((req) => stock.updateRole(ctx(req), req.params.role, requestAll(req))));
stockRouter.delete('/roles/:role', ...manageRoles, h((req) => stock.deleteRole(ctx(req), req.params.role)));

const managePerms = [requireAuth, requirePermission('permissions.manage')];
stockRouter.get('/permissions', ...managePerms, h(() => stock.listPermissions()));
stockRouter.post('/permissions', ...managePerms, h((req) => stock.createPermission(ctx(req), requestAll(req))));
stockRouter.get('/permissions/:permission/edit', ...managePerms, missingEdit);
stockRouter.get('/permissions/:permission', ...managePerms, h((req) => stock.showPermission(req.params.permission)));
stockRouter.put('/permissions/:permission', ...managePerms, h((req) => stock.updatePermission(ctx(req), req.params.permission, requestAll(req))));
stockRouter.patch('/permissions/:permission', ...managePerms, h((req) => stock.updatePermission(ctx(req), req.params.permission, requestAll(req))));
stockRouter.delete('/permissions/:permission', ...managePerms, h((req) => stock.deletePermission(ctx(req), req.params.permission)));

// --- misc
stockRouter.get('/settings', requireAuth, requirePermission('settings.general'), h(() => stock.settings()));
stockRouter.get('/countries', requireAuth, h((req) => stock.countries(req)));
stockRouter.get('/stats', requireAuth, requireRole('Admin'), h((req) => stock.stats(req)));

// --- announcements plugin (auth; write actions need announcements.manage)
const manageAnn = [requireAuth, requirePermission('announcements.manage')];
stockRouter.post('/announcements/read', requireAuth, h((req) => stock.readAnnouncements(ctx(req))));
stockRouter.get('/announcements', requireAuth, h((req) => stock.listAnnouncements(req, requestAll(req))));
stockRouter.post('/announcements', ...manageAnn, h((req) => stock.createAnnouncement(ctx(req), requestAll(req))));
stockRouter.get('/announcements/:id', requireAuth, h((req) => stock.showAnnouncement(req.params.id)));
stockRouter.put('/announcements/:id', ...manageAnn, h((req) => stock.updateAnnouncement(req.params.id, requestAll(req))));
stockRouter.patch('/announcements/:id', ...manageAnn, h((req) => stock.updateAnnouncement(req.params.id, requestAll(req))));
stockRouter.delete('/announcements/:id', ...manageAnn, h((req) => stock.deleteAnnouncement(req.params.id)));

// --- social login (providers not configured: BLOCKED)
stockRouter.post('/login/social', h((req) => stock.socialLogin(requestAll(req))));
