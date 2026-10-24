// Web-only (Blade panel) actions of the Laravel app, exposed as authenticated
// JSON endpoints for the Next.js admin panel (see ARCHITECTURE_DECISIONS ADR-07):
//   * settings updates (Web\SettingsController::update/enable*/disable*)
//   * impersonation (lab404/laravel-impersonate, session-based in Laravel)
//   * company profile tools (Web\CompanyCreateProfile)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { db, table } from '../../database/knex.js';
import { env } from '../../config/env.js';
import { HttpError, httpException } from '../../http/respond.js';
import { hasPermissions, rolePermissions } from '../auth/permissions.js';
import { setting } from '../../config/settings.js';
import { issueToken } from '../auth/jwtService.js';
import { hashPassword } from '../auth/authService.js';
import { logActivity } from '../../repositories/activityRepository.js';
import { nameOrEmail, userTransformer } from '../stock/transformers.js';
import { nowSql } from '../../utils/time.js';

const ok = (body, status = 200) => ({ status, body });

// ------------------------------------------------------------- settings

/** PHP json_encode() defaults: "/" → "\/", non-ASCII → \uXXXX. */
export function phpJsonEncode(value) {
  return JSON.stringify(value)
    .replace(/\//g, '\\/')
    .replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function setDotted(obj, key, value) {
  const parts = key.split('.');
  let cur = obj;
  for (const p of parts.slice(0, -1)) {
    if (cur[p] === null || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts.at(-1)] = value;
}

const SETTING_GROUPS = {
  general: 'settings.general',
  auth: 'settings.auth',
  notifications: 'settings.notifications',
};

/**
 * POST /api/panel/settings/{group} — Setting::set() for every posted key, then
 * Setting::save() and "Updated website settings." in the activity log.
 */
export async function updateSettings(ctx, group, input) {
  const permission = SETTING_GROUPS[group];
  if (!permission) throw httpException(404, '');
  if (!(await hasPermissions(ctx.user, [permission]))) throw httpException(403, 'Forbidden.');

  const file = path.resolve(env.SETTINGS_PATH);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(input)) {
    if (key === '_token' || key === 'token') continue;
    setDotted(data, key, value);
  }
  writeFileSync(file, phpJsonEncode(data));
  await logActivity({ userId: ctx.user.id, description: 'Updated website settings.', ip: ctx.ip, userAgent: ctx.userAgent });
  return ok(data);
}

// --------------------------------------------------------------- context

/**
 * GET /api/panel/context — what the Blade layout read from the session for
 * every page: the user (avatar, name), the role's permission names (sidebar
 * items, @permission blocks), whether an impersonation is active, and the
 * settings the views use.
 */
export async function context(req, ctx) {
  const permissions = (await rolePermissions(ctx.user.role_id)).map((p) => p.name);
  const role = await db(table('roles')).where('id', ctx.user.role_id).first('id', 'name', 'display_name');
  return ok({
    user: userTransformer(req, ctx.user),
    role: role ?? null,
    permissions,
    impersonating: Boolean(ctx.payload.imp),
    settings: {
      app_name: setting('app_name'),
      remember_me: setting('remember_me'),
      forgot_password: setting('forgot_password'),
      reg_enabled: setting('reg_enabled'),
      tos: setting('tos'),
      two_factor_enabled: setting('2fa.enabled', false),
    },
  });
}

// --------------------------------------------------------- impersonation

/**
 * POST /api/panel/impersonate/{user}: canImpersonate() = users.manage;
 * canBeImpersonated() = not already impersonating. Returns a token for the
 * target that carries the impersonator's id in the "imp" claim.
 */
export async function impersonate(ctx, targetId, reqCtx) {
  if (ctx.payload.imp) throw httpException(403, 'Forbidden.');
  if (!(await hasPermissions(ctx.user, ['users.manage']))) throw httpException(403, 'Forbidden.');
  const target = await db(table('users')).where('id', targetId).first();
  if (!target) throw httpException(404, 'Resource not found.');
  if (Number(target.id) === Number(ctx.user.id)) throw httpException(403, 'Forbidden.');

  const token = await issueToken({ ...target }, { ...reqCtx, extraClaims: { imp: ctx.user.id } });
  await logActivity({ userId: ctx.user.id, description: `Started impersonating user ${nameOrEmail(target)} (ID: ${target.id})`, ip: ctx.ip, userAgent: ctx.userAgent });
  return ok({ token });
}

/** POST /api/panel/impersonate/leave — back to the impersonator. */
export async function leaveImpersonation(ctx, reqCtx) {
  const impersonatorId = ctx.payload.imp;
  if (!impersonatorId) throw httpException(403, 'Forbidden.');
  const admin = await db(table('users')).where('id', impersonatorId).first();
  if (!admin) throw httpException(404, 'Resource not found.');
  const token = await issueToken(admin, reqCtx);
  await logActivity({ userId: admin.id, description: `Stopped impersonating user ${nameOrEmail(ctx.user)} (ID: ${ctx.user.id})`, ip: ctx.ip, userAgent: ctx.userAgent });
  return ok({ token });
}


// ------------------------------------------------------- company profile

/** POST /api/panel/company-profile/fetch-neat-id {neat_id} — reads neat_eoi. */
export async function fetchNeatId({ neat_id }) {
  const rows = await db(table('neat_eoi')).select('email', 'company', 'phone').where('neat_id', neat_id ?? null);
  if (!rows.length) throw new HttpError(500, { message: 'Server Error' }); // $neatDetails[0] on an empty collection
  return ok({ msg: 'succes', data: rows[0] });
}

/**
 * POST /api/panel/company-profile — company_details row + company user
 * (role 4, Active, verified). DEV-15/16: admin-only; only the User model's
 * fillable attributes are written and the password is bcrypt-hashed once.
 */
export async function createCompanyProfile(input) {
  const now = nowSql();
  await db(table('company_details')).insert({ created_at: now, neat_id: input.neat_id ?? null, name: input.company ?? null });
  await db(table('users')).insert({
    email: input.email,
    password: await hashPassword(input.password ?? ''),
    username: input.neat_id ?? null,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    phone: input.phone ?? null,
    role_id: 4,
    status: 'Active',
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });
  return ok({ msg: 'User Created Successfully!!' });
}

/** Cross-database names (Phase-2 EoI system on the same server). */
const PHASE2EOI = () => process.env.EOI_DB_SCHEMA ?? 'neatphase2eoi';
const PHASE2 = () => process.env.EOI_REGISTRY_DB_SCHEMA ?? 'neatphase2';
const ident = (name) => {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error('Invalid schema name');
  return `\`${name}\``;
};

/** POST /api/panel/company-profile/products {neat_id} — accepted Phase-2 products. */
export async function getEoiProducts({ neat_id }) {
  const rows = await db.raw(
    `select code from ${ident(PHASE2EOI())}.product where neat_id = ? and product_active = 'Yes' and final_result = 'Accepted'`,
    [neat_id ?? null],
  );
  return ok({ msg: 'succes', data: rows[0] });
}

/**
 * POST /api/panel/company-profile/product-details {code}
 * DEV-15: the original concatenated $request->code into raw SQL (injection);
 * the same query is parameterised here.
 */
export async function getEoiProductDetails({ code }) {
  const eoi = ident(PHASE2EOI());
  const reg = ident(PHASE2());
  const [rows] = await db.raw(
    `select ne.company as company, p.name as product, p.youtube_link as youtube, p.trial_sol_link, p.product_technology as technology,
            ne.email as email, p.product_active, pd.product_type as product_type, pdce.proposed_pricing as pricing, pdce.avg_likert_rating as avg_like
       from ${eoi}.product as p
       inner join ${reg}.neat_eoi as ne on ne.neat_id COLLATE utf8mb4_general_ci = p.neat_id
       inner join ${eoi}.product_details as pd on p.code = pd.code
       inner join ${eoi}.product_details_company_experience as pdce on p.code = pdce.code
      where p.code = ? and p.product_active = 'Yes'`,
    [code ?? null],
  );
  if (!rows.length) throw new HttpError(500, { message: 'Server Error' });
  return ok({ msg: 'succes', data: rows[0] });
}

/** POST /api/panel/company-profile/create-product — product + product_details rows. */
export async function createProduct(input) {
  const now = nowSql();
  await db(table('product')).insert({
    created_at: now,
    neat_id: input.neat_id ?? null,
    code: input.code ?? null,
    name: input.product ?? null,
    youtube_link: input.youtube_link ?? null,
    trial_sol_link: input.trial_sol_link ?? null,
    product_technology: input.product_technology ?? null,
    product_active: input.product_active ?? null,
    email: input.email ?? null,
  });
  await db(table('product_details')).insert({
    created_at: now,
    neat_id: input.neat_id ?? null,
    code: input.code ?? null,
    application_number: input.neat_id ?? null,
    company_name: input.company ?? null,
    product_type: input.product_type ?? null,
    price: input.proposed_pricing ?? null,
    payment_link: '',
    providedFreeCourses: '500',
    registeredFreeCourses: '0',
    availableFreeCourses: '500',
    product_active: input.product_active ?? null,
    isDetailsSubmitted: 'No',
    product_video_uploaded: 'No',
    product_video_name: 'None',
    product_video_file: 'None',
    course_logo_uploaded: 'No',
    course_logo_name: 'None',
    course_logo_file: 'None',
    course_name: input.product ?? null,
    avg_likert_rating: input.avg_likert_rating ?? null,
    neat_course_id: 'None',
    mou_signed_status: '0',
    view_counter: '0',
  });
  return ok({ msg: 'Product Created successfully!!' });
}
