// Ports of the stock Vanguard API used by the admin panel: profile (me/*),
// users, roles, permissions, role permissions, sessions, settings, countries,
// stats and the activity-log / announcements plugins.
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { db, table } from '../../database/knex.js';
import { validateOrFail } from '../../validators/validator.js';
import { httpException, HttpError } from '../../http/respond.js';
import { hashPassword } from '../auth/authService.js';
import { hasPermissions, rolePermissions } from '../auth/permissions.js';
import { logActivity } from '../../repositories/activityRepository.js';
import { publicPath } from '../../integrations/storage.js';
import { loadSettings, settingEnabled } from '../../config/settings.js';
import { phpEmpty } from '../../utils/str.js';
import { nowSql } from '../../utils/time.js';
import { looseEq } from '../../utils/php.js';
import { phpInt } from '../../http/paginate.js';
import {
  activityTransformer, announcementTransformer, countryTransformer, fractalPaginate, nameOrEmail,
  permissionTransformer, roleTransformer, sessionTransformer, userTransformer,
} from './transformers.js';

const ok = (body, status = 200) => ({ status, body });
const users = () => db(table('users'));
const NOT_FOUND = () => httpException(404, 'Resource not found.');
const UNAUTHORIZED_ACTION = () => httpException(403, 'This action is unauthorized.');
const USER_STATUSES = ['Active', 'Banned', 'Unconfirmed'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const log = (ctx, description, userId = ctx.user.id) => logActivity({ userId, description, ip: ctx.ip, userAgent: ctx.userAgent });

/** RouteServiceProvider::bindUsingRepository() */
async function findOr404(tbl, id) {
  const row = await db(table(tbl)).where('id', id).first();
  if (!row) throw NOT_FOUND();
  return row;
}


const rawPerPage = (value, fallback) => (value === null || value === undefined || value === '' || value === '0' ? fallback : value);

/** `$request->per_page ?: default` (PHP truthiness). */
const perPageOr = (value, fallback) => (value === null || value === undefined || value === '' || value === '0' || value === 0 ? fallback : phpInt(value, fallback) || fallback);

// ================================================================= profile

export const me = (req, ctx) => ok(userTransformer(req, ctx.user));

/** PATCH /api/me/details — UpdateProfileDetailsRequest (birthday nullable|date) */
export async function updateMyDetails(req, ctx, input) {
  await validateOrFail(input, { birthday: 'nullable|date' });
  const data = pick(input, ['first_name', 'last_name', 'birthday', 'phone', 'address', 'country_id']);
  if (!('country_id' in data) || data.country_id === null) data.country_id = ctx.user.country_id;
  await updateUser(ctx.user.id, data);
  await log(ctx, 'Updated profile details.');
  return ok(userTransformer(req, await users().where('id', ctx.user.id).first()));
}

/** PATCH /api/me/details/auth — UpdateProfileLoginDetailsRequest */
export async function updateMyLoginDetails(req, ctx, input) {
  const id = ctx.user.id;
  await validateOrFail(input, {
    email: `required|email|unique:users,email,${id}`,
    username: `nullable|unique:users,username,${id}`,
    password: 'nullable|min:8|confirmed',
  });
  await updateUser(id, pick(input, ['email', 'username', 'password']));
  return ok(userTransformer(req, await users().where('id', id).first()));
}

// ------------------------------------------------------------------ avatar

const AVATAR_DIR = 'upload/users';
const isUploadedAvatar = (a) => a && !/http|gravatar/.test(a);

async function deleteAvatarIfUploaded(user) {
  if (isUploadedAvatar(user.avatar)) await unlink(publicPath(AVATAR_DIR, path.basename(user.avatar))).catch(() => {});
}

/** Crop points from the web form (points[x1] … points[y2]) or a nested object; null when absent. */
export function cropPoints(body) {
  const p = body?.points && typeof body.points === 'object' ? body.points : { x1: body?.['points[x1]'], y1: body?.['points[y1]'], x2: body?.['points[x2]'], y2: body?.['points[y2]'] };
  return ['x1', 'y1', 'x2', 'y2'].every((k) => p[k] !== undefined && p[k] !== null && p[k] !== '') ? p : null;
}

/**
 * UserAvatarManager::uploadAndCropAvatar(): with crop points (the web form's
 * Croppie selection) a floor(x2 - x1) square at (x1, y1) resized to 160×160,
 * otherwise a centred 160×160 crop; null on failure.
 */
async function uploadAndCropAvatar(file, points = null) {
  try {
    const image = sharp(file.path);
    const meta = await image.metadata();
    let pipeline;
    if (points) {
      const size = Math.floor(Number(points.x2) - Number(points.x1));
      pipeline = image.extract({ left: Math.trunc(Number(points.x1)), top: Math.trunc(Number(points.y1)), width: size, height: size }).resize(160, 160);
    } else {
      const w = Math.min(160, meta.width);
      const h = Math.min(160, meta.height);
      const left = Math.max(0, Math.floor((meta.width - w) / 2));
      const top = Math.max(0, Math.floor((meta.height - h) / 2));
      pipeline = image.extract({ left, top, width: w, height: h });
    }
    const ext = { jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' }[meta.format] ?? 'png';
    const name = `${randomBytes(20).toString('hex')}.${ext}`;
    await mkdir(publicPath(AVATAR_DIR), { recursive: true });
    await writeFile(publicPath(AVATAR_DIR, name), await pipeline.toFormat(meta.format ?? 'png', { quality: 100 }).toBuffer());
    return name;
  } catch {
    return null;
  } finally {
    unlink(file.path).catch(() => {});
  }
}

/** PUT /api/me/avatar (multipart "file", required|image) */
export async function updateMyAvatar(req, ctx) {
  if (!req.file) throw new HttpError(422, { message: 'The given data was invalid.', errors: { file: ['The file field is required.'] } });
  if (!/^image\/(jpeg|png|gif|bmp|svg\+xml|webp)$/.test(req.file.mimetype)) {
    await unlink(req.file.path).catch(() => {});
    throw new HttpError(422, { message: 'The given data was invalid.', errors: { file: ['The file must be an image.'] } });
  }
  const name = await uploadAndCropAvatar(req.file, cropPoints(req.body));
  await updateUser(ctx.user.id, { avatar: name });
  await log(ctx, 'Updated profile avatar.');
  return ok(userTransformer(req, await users().where('id', ctx.user.id).first()));
}

/** PUT /api/me/avatar/external {url} */
export async function updateMyAvatarExternal(req, ctx, input) {
  await validateOrFail(input, { url: 'required' });
  if (!/^https?:\/\/\S+$/i.test(String(input.url))) {
    throw new HttpError(422, { message: 'The given data was invalid.', errors: { url: ['The url format is invalid.'] } });
  }
  await deleteAvatarIfUploaded(ctx.user);
  await updateUser(ctx.user.id, { avatar: input.url });
  await log(ctx, 'Updated profile avatar.');
  return ok(userTransformer(req, await users().where('id', ctx.user.id).first()));
}

/** DELETE /api/me/avatar */
export async function deleteMyAvatar(req, ctx) {
  await deleteAvatarIfUploaded(ctx.user);
  await updateUser(ctx.user.id, { avatar: null });
  await log(ctx, 'Updated profile avatar.');
  return ok(userTransformer(req, await users().where('id', ctx.user.id).first()));
}

// -------------------------------------------------------------- sessions

const sessionLifetime = () => Number(process.env.SESSION_LIFETIME ?? 120);

/** DbSession::getUserSessions(): sessions active within SESSION_LIFETIME minutes. */
async function userSessions(userId) {
  const valid = Math.floor(Date.now() / 1000) - sessionLifetime() * 60;
  const rows = await db(table('sessions')).where('user_id', userId).where('last_activity', '>=', valid);
  return rows.map(sessionTransformer);
}

export const mySessions = async (ctx) => ok(await userSessions(ctx.user.id));

/** sessions/{session}: Gate manage-session — users.manage or own session. */
async function sessionForManage(ctx, id) {
  const s = await db(table('sessions')).where('id', id).first();
  if (!s) throw NOT_FOUND();
  if (!(await hasPermissions(ctx.user, ['users.manage'])) && Number(s.user_id) !== Number(ctx.user.id)) throw UNAUTHORIZED_ACTION();
  return s;
}

export const showSession = async (ctx, id) => ok(sessionTransformer(await sessionForManage(ctx, id)));

export async function destroySession(ctx, id) {
  const s = await sessionForManage(ctx, id);
  await db(table('sessions')).where('id', s.id).delete();
  if (s.user_id) await users().where('id', s.user_id).update({ remember_token: null, updated_at: nowSql() });
  return ok({ success: true });
}

// ================================================================== users

function pick(input, keys) {
  return Object.fromEntries(keys.filter((k) => input[k] !== undefined).map((k) => [k, input[k]]));
}

/** EloquentUser::update(): mutators (password bcrypt, birthday trim) + country 0 → null + updated_at. */
async function updateUser(id, data) {
  const row = { ...data };
  if ('country_id' in row && looseEq(row.country_id, 0) && row.country_id !== null) row.country_id = null;
  if ('password' in row) {
    if (row.password === null || row.password === undefined) delete row.password;
    else row.password = await hashPassword(row.password);
  }
  if ('birthday' in row) row.birthday = row.birthday ? String(row.birthday).trim() || null : null;
  if (Object.keys(row).length === 0) return;
  row.updated_at = nowSql();
  await users().where('id', id).update(row);
}

/** GET /api/users?per_page&search&status */
export async function listUsers(req, input) {
  const q = users();
  if (input.status) q.where('status', input.status);
  if (input.search) {
    const like = `%${input.search}%`;
    q.where((w) => w.where('username', 'like', like).orWhere('email', 'like', like).orWhere('first_name', 'like', like).orWhere('last_name', 'like', like));
  }
  q.orderBy('id', 'desc');
  return ok(await fractalPaginate(req, q, perPageOr(input.per_page, 20), (u) => userTransformer(req, u), rawPerPage(input.per_page, 20)));
}

/** POST /api/users — CreateUserRequest */
export async function createUser(req, input) {
  const rules = {
    email: 'required|email|unique:users,email',
    username: 'nullable|unique:users,username',
    password: 'required|min:6|confirmed',
    birthday: 'nullable|date',
    role_id: 'required|exists:roles,id',
    verified: 'boolean',
  };
  if (input.country_id) rules.country_id = 'exists:countries,id';
  await validateOrFail(input, rules);
  const now = nowSql();
  const data = pick(input, ['email', 'username', 'first_name', 'last_name', 'phone', 'address', 'country_id', 'birthday', 'role_id']);
  const [id] = await users().insert({
    ...data,
    birthday: data.birthday ? String(data.birthday).trim() || null : null,
    password: await hashPassword(input.password),
    status: 'Active',
    // $request->verified ? now() : null (PHP truthiness); unique_uuid keeps its DB default.
    email_verified_at: phpEmpty(input.verified) ? null : now,
    created_at: now,
    updated_at: now,
  });
  return ok(userTransformer(req, await users().where('id', id).first()), 201);
}

export const showUser = async (req, id) => ok(userTransformer(req, await findOr404('users', id)));


export async function updateUser_(req, ctx, id, input) {
  const target = await findOr404('users', id);
  const actingId = ctx.user.id;
  await validateOrFail(input, {
    email: `email|unique:users,email,${actingId}`,
    username: `nullable|unique:users,username,${actingId}`,
    password: 'min:6|confirmed',
    birthday: 'nullable|date',
    role_id: 'exists:roles,id',
    country_id: 'exists:countries,id',
    status: `in:${USER_STATUSES.join(',')}`,
  });
  await updateUser(target.id, pick(input, ['email', 'password', 'username', 'first_name', 'last_name', 'phone', 'address', 'country_id', 'birthday', 'status', 'role_id']));
  const updated = await users().where('id', target.id).first();
  await log(ctx, `Updated profile details for ${nameOrEmail(updated)}.`);


  if (target.status !== 'Banned' && input.status === 'Banned') {
    // Banned → InvalidateSessionsAndTokens + "Banned user :name."
    await log(ctx, `Banned user ${nameOrEmail(updated)}.`);
    await db(table('sessions')).where('user_id', target.id).delete();
    await db(table('api_tokens')).where('user_id', target.id).delete();
  }
  return ok(userTransformer(req, updated));
}

/** DELETE /api/users/{user} */
export async function deleteUser(ctx, id) {
  const target = await findOr404('users', id);
  if (Number(target.id) === Number(ctx.user.id)) return ok({ error: 'You cannot delete yourself.' }, 403);
  await log(ctx, `Deleted user ${nameOrEmail(target)}.`);
  await deleteAvatarIfUploaded(target);
  await users().where('id', target.id).delete();
  return ok({ success: true });
}

export async function userSessionsFor(id) {
  const target = await findOr404('users', id);
  return ok(await userSessions(target.id));
}

/** PUT /api/users/{user}/avatar, /avatar/external, DELETE — admin versions. */
export async function adminAvatar(req, ctx, id, mode, input) {
  const target = await findOr404('users', id);
  if (mode === 'upload') {
    if (!req.file) throw new HttpError(422, { message: 'The given data was invalid.', errors: { file: ['The file field is required.'] } });
    const name = await uploadAndCropAvatar(req.file, cropPoints(req.body));
    await updateUser(target.id, { avatar: name });
  } else if (mode === 'external') {
    await validateOrFail(input, { url: 'required' });
    await deleteAvatarIfUploaded(target);
    await updateUser(target.id, { avatar: input.url });
  } else {
    await deleteAvatarIfUploaded(target);
    await updateUser(target.id, { avatar: null });
  }
  return ok(userTransformer(req, await users().where('id', target.id).first()));
}

// ========================================================== roles/perms

const nameRule = 'required|regex:/^[a-zA-Z0-9\\-_\\.]+$/';

export async function listRoles() {
  const r = table('roles');
  const rows = await db(r)
    .select(`${r}.*`, db.raw(`(select count(*) from ${table('users')} where ${table('users')}.role_id = ${r}.id) as users_count`));
  return ok(rows.map(roleTransformer));
}

export async function createRole(ctx, input) {
  await validateOrFail(input, { name: `${nameRule}|unique:roles,name` });
  const now = nowSql();
  const [id] = await db(table('roles')).insert({ ...pick(input, ['name', 'display_name', 'description']), created_at: now, updated_at: now });
  const role = await db(table('roles')).where('id', id).first();
  await log(ctx, `Created new role called ${role.display_name ?? ''}.`);
  // Role::create() returns the unsaved attribute bag: removable is not set
  // (→ false in the transformer) although the row gets the DB default.
  return ok(roleTransformer({ ...role, removable: undefined, users_count: undefined }));
}

export const showRole = async (id) => ok(roleTransformer(await findOr404('roles', id)));

export async function updateRole(ctx, id, input) {
  const role = await findOr404('roles', id);
  await validateOrFail(input, { name: `${nameRule}|unique:roles,name,${role.id}` });
  await db(table('roles')).where('id', role.id).update({ ...pick(input, ['name', 'display_name', 'description']), updated_at: nowSql() });
  const updated = await db(table('roles')).where('id', role.id).first();
  await log(ctx, `Updated role with name ${updated.display_name ?? ''}.`);
  return ok(roleTransformer(updated));
}

export async function deleteRole(ctx, id) {
  const role = await findOr404('roles', id);
  if (!Number(role.removable)) throw UNAUTHORIZED_ACTION();
  const userRole = await db(table('roles')).where('name', 'User').first('id');
  await users().where('role_id', role.id).update({ role_id: userRole.id });
  await log(ctx, `Deleted role named ${role.display_name ?? ''}.`);
  await db(table('roles')).where('id', role.id).delete();
  return ok({ success: true });
}

export async function showRolePermissions(id) {
  const role = await findOr404('roles', id);
  return ok((await rolePermissions(role.id)).map(permissionTransformer));
}

/** PUT /api/roles/{role}/permissions {permissions: [ids]} — syncPermissions */
export async function updateRolePermissions(ctx, id, input) {
  const role = await findOr404('roles', id);
  const all = (await db(table('permissions')).pluck('id')).map(String);
  const errors = {};
  if (!Array.isArray(input.permissions) || input.permissions.length === 0) {
    errors.permissions = [Array.isArray(input.permissions) ? 'The permissions field is required.' : input.permissions == null ? 'The permissions field is required.' : 'The permissions must be an array.'];
  } else {
    input.permissions.forEach((p, i) => {
      if (!all.includes(String(p))) errors[`permissions.${i}`] = ['Provided permission does not exist.'];
    });
  }
  if (Object.keys(errors).length) throw new HttpError(422, { message: 'The given data was invalid.', errors });

  await db.transaction(async (trx) => {
    await trx(table('permission_role')).where('role_id', role.id).delete();
    await trx(table('permission_role')).insert([...new Set(input.permissions.map(Number))].map((pid) => ({ permission_id: pid, role_id: role.id })));
  });
  await log(ctx, 'Updated role permissions.');
  return ok((await rolePermissions(role.id)).map(permissionTransformer));
}

export const listPermissions = async () => ok((await db(table('permissions'))).map(permissionTransformer));

async function validatePermissionName(input, ignoreId) {
  const errors = {};
  if (input.name === null || input.name === undefined || input.name === '') errors.name = ['The name field is required.'];
  else {
    if (!/^[a-zA-Z0-9\-_.]+$/.test(String(input.name))) (errors.name ??= []).push('The permission name format is invalid.');
    const q = db(table('permissions')).where('name', input.name);
    if (ignoreId) q.whereNot('id', ignoreId);
    if (await q.first()) (errors.name ??= []).push('Permission with this name already exists.');
  }
  if (Object.keys(errors).length) throw new HttpError(422, { message: 'The given data was invalid.', errors });
}

export async function createPermission(ctx, input) {
  await validatePermissionName(input);
  const now = nowSql();
  const [id] = await db(table('permissions')).insert({ ...pick(input, ['name', 'display_name', 'description']), created_at: now, updated_at: now });
  const p = await db(table('permissions')).where('id', id).first();
  await log(ctx, `Created new permission called ${p.display_name || p.name}.`);
  return ok(permissionTransformer({ ...p, removable: undefined })); // see createRole
}

export const showPermission = async (id) => ok(permissionTransformer(await findOr404('permissions', id)));

export async function updatePermission(ctx, id, input) {
  const p = await findOr404('permissions', id);
  await validatePermissionName(input, p.id);
  await db(table('permissions')).where('id', p.id).update({ ...pick(input, ['name', 'display_name', 'description']), updated_at: nowSql() });
  const updated = await db(table('permissions')).where('id', p.id).first();
  await log(ctx, `Updated the permission named ${updated.display_name || updated.name}.`);
  return ok(permissionTransformer(updated));
}

export async function deletePermission(ctx, id) {
  const p = await findOr404('permissions', id);
  if (!Number(p.removable)) throw UNAUTHORIZED_ACTION();
  await db(table('permissions')).where('id', p.id).delete();
  await log(ctx, `Deleted permission named ${p.display_name || p.name}.`);
  return ok({ success: true });
}

// ============================================================ misc

/** GET /api/settings — Setting::all() (the whole settings.json) */
export function settings() {
  return ok(loadSettings());
}

export const countries = async (req) => ok((await db(table('countries'))).map((c) => countryTransformer(req, c)));

/** GET /api/stats (role:Admin) */
export async function stats(req) {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  const rows = await users().whereBetween('created_at', [fmt(from), fmt(to)]).select('created_at');
  const counts = {};
  for (const r of rows) {
    const d = new Date(`${String(r.created_at).replace(' ', 'T')}Z`);
    const key = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const usersPerMonth = {};
  for (let d = new Date(from); d < to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const key = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    usersPerMonth[key] = counts[key] ?? 0;
  }
  const count = async (q) => Number((await q.count({ n: '*' }))[0].n);
  const monthStart = fmt(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  return ok({
    users_per_month: usersPerMonth,
    users_per_status: {
      total: await count(users()),
      new: await count(users().whereBetween('created_at', [monthStart, fmt(now)])),
      banned: await count(users().where('status', 'Banned')),
      unconfirmed: await count(users().where('status', 'Unconfirmed')),
    },
    latest_registrations: (await users().orderBy('created_at', 'desc').limit(7)).map((u) => userTransformer(req, u)),
  });
}

/** GET /api/activity, /api/users/{user}/activity (GetActivitiesRequest: per_page integer|max:100) */
export async function activities(req, input, userId = null) {
  await validateOrFail(input, { per_page: 'integer|max:100' });
  if (userId !== null) await findOr404('users', userId);
  const q = db(table('user_activity'));
  if (userId !== null) q.where('user_id', userId);
  if (input.search) q.where('description', 'like', `%${input.search}%`);
  q.orderBy('created_at', 'desc');
  return ok(await fractalPaginate(req, q, perPageOr(input.per_page, 20), activityTransformer, rawPerPage(input.per_page, 20)));
}

/** GET /api/stats/activity — own activity per day for the last two weeks. */
export async function activityStats(ctx) {
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 86_400_000);
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  const rows = await db(table('user_activity'))
    .select(db.raw('DATE(created_at) as day'), db.raw('count(id) as count'))
    .where('user_id', ctx.user.id)
    .whereBetween('created_at', [fmt(from), fmt(now)])
    .groupBy('day')
    .orderBy('day', 'asc');
  const result = Object.fromEntries(rows.map((r) => [String(r.day).slice(0, 10), Number(r.count)]));
  for (let d = new Date(from); d.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10); d = new Date(d.getTime() + 86_400_000)) {
    const key = d.toISOString().slice(0, 10);
    if (!(key in result)) result[key] = 0;
  }
  return ok(Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b))));
}

// ---------------------------------------------------------- announcements

export async function listAnnouncements(req, input) {
  await validateOrFail(input, { per_page: 'numeric|max:50' });
  const q = db(table('announcements')).orderBy('created_at', 'desc');
  return ok(await fractalPaginate(req, q, input.per_page ? phpInt(input.per_page, 10) : 10, announcementTransformer, input.per_page ?? 10));
}

export const showAnnouncement = async (id) => ok(announcementTransformer(await findOr404('announcements', id)));

export async function createAnnouncement(ctx, input) {
  await validateOrFail(input, { title: 'required|max:150', body: 'required|max:1500', email_notifications: 'boolean' });
  const now = nowSql();
  const [id] = await db(table('announcements')).insert({ title: input.title, body: input.body, user_id: ctx.user.id, created_at: now, updated_at: now });
  return ok(announcementTransformer(await db(table('announcements')).where('id', id).first()), 201);
}

export async function updateAnnouncement(id, input) {
  const a = await findOr404('announcements', id);
  await validateOrFail(input, { title: 'required|max:150', body: 'required|max:1500', email_notifications: 'boolean' });
  await db(table('announcements')).where('id', a.id).update({ title: input.title, body: input.body, updated_at: nowSql() });
  return ok(announcementTransformer(await db(table('announcements')).where('id', a.id).first()));
}

export async function deleteAnnouncement(id) {
  const a = await findOr404('announcements', id);
  await db(table('announcements')).where('id', a.id).delete();
  return ok({ success: true });
}

export async function readAnnouncements(ctx) {
  await users().where('id', ctx.user.id).update({ announcements_last_read_at: nowSql(), updated_at: nowSql() });
  return ok({ success: true });
}

// ------------------------------------------------- 2FA & social (gated)

/** two-factor middleware: 404 unless setting 2fa.enabled. Authy itself is BLOCKED (no API key). */
export function assertTwoFactorEnabled() {
  if (!settingEnabled('2fa.enabled')) throw httpException(404, '');
  throw new HttpError(501, { error: 'Two-factor authentication (Authy) is not configured for this deployment.' });
}

/** POST /api/login/social {network, social_token} — Socialite providers are not configured (BLOCKED). */
export async function socialLogin(input) {
  const providers = ['facebook', 'twitter', 'google'];
  const errors = {};
  if (input.network == null || input.network === '') errors.network = ['The network field is required.'];
  else if (!providers.includes(input.network)) errors.network = ['The selected network is invalid.'];
  if (input.social_token == null || input.social_token === '') errors.social_token = ['The social token field is required.'];
  if (Object.keys(errors).length) throw new HttpError(422, { message: 'The given data was invalid.', errors });

  return ok({ error: 'Could not connect to specified social network.' }, 500);
}
