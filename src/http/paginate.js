// Laravel 6 `$query->paginate($perPage)` → LengthAwarePaginator::toArray().
import { requestUrl } from '../utils/request.js';

/** PHP `(int) $value` for request input ("20abc" → 20, "abc" → 0). */
export function phpInt(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number') return Math.trunc(value);
  const m = String(value).trim().match(/^[+-]?\d+/);
  return m ? Number(m[0]) : 0;
}

/** Paginator::resolveCurrentPage(): integer >= 1 from ?page=, else 1. */
function currentPage(req) {
  const raw = req.query?.page ?? req.body?.page;
  const n = typeof raw === 'number' ? raw : /^\s*\d+\s*$/.test(String(raw ?? '')) ? Number(raw) : NaN;
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * Runs COUNT(*) + LIMIT/OFFSET on a Knex query and returns Laravel's JSON shape:
 * { current_page, data, first_page_url, from, last_page, last_page_url,
 *   next_page_url, path, per_page, prev_page_url, to, total }
 */
export async function paginate(req, query, perPage) {
  const page = currentPage(req);
  const [{ total }] = await query.clone().clearSelect().clearOrder().count({ total: '*' });
  const totalN = Number(total);
  const data = await query.clone().limit(perPage).offset((page - 1) * perPage);

  const path = requestUrl(req);
  const url = (p) => `${path}?page=${p}`;
  const lastPage = Math.max(Math.ceil(totalN / perPage), 1);
  const from = data.length ? (page - 1) * perPage + 1 : null;
  const to = data.length ? from + data.length - 1 : null;

  return {
    current_page: page,
    data,
    first_page_url: url(1),
    from,
    last_page: lastPage,
    last_page_url: url(lastPage),
    next_page_url: page < lastPage ? url(page + 1) : null,
    path,
    per_page: perPage,
    prev_page_url: page > 1 ? url(page - 1) : null,
    to,
    total: totalN,
  };
}
