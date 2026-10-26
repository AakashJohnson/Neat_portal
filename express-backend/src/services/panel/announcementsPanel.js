import { db, table } from '../../database/knex.js';
import { validateOrFail } from '../../validators/validator.js';
import { httpException } from '../../http/respond.js';
import { logActivity } from '../../repositories/activityRepository.js';
import { announcementTransformer, avatarUrl, fractalPaginate } from '../stock/transformers.js';
import { sendMail } from '../../integrations/mail/mailer.js';
import { e, renderMessage } from '../../integrations/mail/markdownMail.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { nowSql } from '../../utils/time.js';

const ok = (body, status = 200) => ({ status, body });
const announcements = () => db(table('announcements'));
const limit = (s, n) => (String(s ?? '').length > n ? `${String(s).slice(0, n)}...` : String(s ?? ''));
const log = (ctx, description) => logActivity({ userId: ctx.user.id, description, ip: ctx.ip, userAgent: ctx.userAgent });

/** UserPresenter fields the announcement views use. */
const creatorOf = (req, u) =>
  u
    ? { id: u.id, username: u.username, name: `${u.first_name ?? ''} ${u.last_name ?? ''}`, avatar: avatarUrl(req, u.avatar) }
    : null;

async function withCreators(req, rows) {
  const ids = [...new Set(rows.map((a) => a.user_id))];
  const creators = ids.length ? await db(table('users')).whereIn('id', ids) : [];
  const byId = new Map(creators.map((u) => [String(u.id), u]));
  return rows.map((a) => ({ ...announcementTransformer(a), creator: creatorOf(req, byId.get(String(a.user_id))) }));
}

/** GET /api/panel/announcements (index, 10 per page) or /api/panel/announcements/list (7 per page). */
export async function paginate(req, perPage) {
  const page = await fractalPaginate(req, announcements().orderBy('created_at', 'desc'), perPage, (a) => a);
  return ok({ ...page, data: await withCreators(req, page.data) });
}

export async function show(req, id) {
  const a = await announcements().where('id', id).first();
  if (!a) throw httpException(404, 'Resource not found.');
  return ok((await withCreators(req, [a]))[0]);
}

/** NavbarItemsHook: latest(5) and whether the newest one is unread ("wasReadBy"). */
export async function navbar(req, user) {
  const rows = await withCreators(req, await announcements().orderBy('created_at', 'desc').limit(5));
  const lastRead = user.announcements_last_read_at ? String(user.announcements_last_read_at) : null;
  // $user->announcements_last_read_at < $this->created_at (null < date is true in PHP).
  const unread = rows.length > 0 && (lastRead === null || lastRead < rows[0].created_at);
  return { items: rows, unread };
}

const RULES = { title: 'required|max:150', body: 'required|max:1500', email_notifications: 'boolean' };

export async function create(req, ctx, input) {
  await validateOrFail(input, RULES);
  const now = nowSql();
  const [id] = await announcements().insert({ title: input.title, body: input.body, user_id: ctx.user.id, created_at: now, updated_at: now });
  const a = await announcements().where('id', id).first();
  await log(ctx, `Created an announcement #${id}: ${limit(a.title, 50)}`);
  if (input.email_notification) setImmediate(() => notifyAllUsers(a).catch((err) => logger.error({ err }, 'announcement e-mail notification failed')));
  return ok({ ...announcementTransformer(a), message: 'Announcement created successfully.' }, 201);
}

export async function update(req, ctx, id, input) {
  const a = await announcements().where('id', id).first();
  if (!a) throw httpException(404, 'Resource not found.');
  await validateOrFail(input, RULES);
  await announcements().where('id', a.id).update({ title: input.title, body: input.body, updated_at: nowSql() });
  await log(ctx, `Created an announcement #${a.id}: :title`);
  return ok({ ...announcementTransformer(await announcements().where('id', a.id).first()), message: 'Announcement updated successfully.' });
}

export async function destroy(ctx, id) {
  const a = await announcements().where('id', id).first();
  if (!a) throw httpException(404, 'Resource not found.');
  await announcements().where('id', a.id).delete();
  await log(ctx, `Deleted announcement #${a.id}`);
  return ok({ message: 'Announcement deleted successfully.' });
}

/** AnnouncementEmail ("[Announcement] <title>", mail::message: title, body, "Thanks,<br>Neat") to every user. */
async function notifyAllUsers(a) {
  const appName = 'Neat';
  const { html, text } = renderMessage(`# ${e(a.title)}\n\n${a.body}\n\nThanks,<br>\n${appName}`, { appUrl: env.APP_URL ?? 'http://localhost', appName });
  let lastId = 0;
  for (;;) {
    const chunk = await db(table('users')).where('id', '>', lastId).orderBy('id').limit(200).select('id', 'email');
    if (!chunk.length) break;
    for (const u of chunk) await sendMail({ mailable: 'AnnouncementEmail', to: u.email, subject: `[Announcement] ${a.title}`, html, text });
    lastId = chunk.at(-1).id;
  }
}
