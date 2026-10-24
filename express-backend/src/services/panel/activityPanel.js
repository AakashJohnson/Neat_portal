// neatapp/activity-log web pages for the Next.js panel: the activity log of
// all users (with each entry's user name), of one user, and the logged-in
// user's own log — 20 per page, `search` on the description, newest first
// (EloquentActivity::paginateAndFilterResults).
import { db, table } from '../../database/knex.js';
import { httpException } from '../../http/respond.js';
import { activityTransformer, fractalPaginate, nameOrEmail } from '../stock/transformers.js';

const ok = (body, status = 200) => ({ status, body });

function query(search, userId = null) {
  const q = db(table('user_activity'));
  if (userId !== null) q.where('user_id', userId);
  if (search) q.where('description', 'like', `%${search}%`);
  return q.orderBy('created_at', 'desc');
}

async function page(req, q) {
  const result = await fractalPaginate(req, q, 20, (a) => a);
  const ids = [...new Set(result.data.map((a) => a.user_id))];
  const users = ids.length ? await db(table('users')).whereIn('id', ids).select('id', 'first_name', 'last_name', 'email') : [];
  const names = new Map(users.map((u) => [String(u.id), nameOrEmail(u)]));
  return { ...result, data: result.data.map((a) => ({ ...activityTransformer(a), user_name: names.get(String(a.user_id)) ?? null })) };
}

/** ActivityController@index (users.activity) */
export const all = async (req) => ok(await page(req, query(req.query.search)));

/** UserActivityController@index (users.activity) */
export async function forUser(req, userId) {
  const user = await db(table('users')).where('id', userId).first();
  if (!user) throw httpException(404, 'Resource not found.');
  return ok({ ...(await page(req, query(req.query.search, user.id))), user: { id: user.id, name_or_email: nameOrEmail(user) } });
}

/** UserActivityController@show (own log) */
export const own = async (req, ctx) => ok(await page(req, query(req.query.search, ctx.user.id)));
