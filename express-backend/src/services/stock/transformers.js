// League\Fractal transformers of the stock API (app/Transformers/* and the
// activity-log / announcements plugins), plus the DataArraySerializer paginator.
import UAParser from 'ua-parser-js';
import { marked } from 'marked';
import { requestUrl } from '../../utils/request.js';

const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;
/** PHP (string) cast of a nullable timestamp/date column. */
const str = (v) => (v === null || v === undefined ? '' : String(v));
const int = (v) => (v === null || v === undefined || v === '' ? 0 : Math.trunc(Number(v)) || 0);

/** UserPresenter::avatar() */
export function avatarUrl(req, avatar) {
  if (!avatar) return `${baseUrl(req)}/assets/img/profile.png`;
  return /http|gravatar/.test(avatar) ? avatar : `${baseUrl(req)}/upload/users/${avatar}`;
}

/** UserPresenter::nameOrEmail() */
export const nameOrEmail = (u) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email;

export function userTransformer(req, u) {
  // json_decode($user->two_factor_options, true): null for null/invalid JSON.
  let options;
  try {
    options = u.two_factor_options == null ? null : JSON.parse(u.two_factor_options);
  } catch {
    options = null;
  }
  return {
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    username: u.username,
    email: u.email,
    phone: u.phone,
    avatar: avatarUrl(req, u.avatar),
    address: u.address,
    country_id: u.country_id ? int(u.country_id) : null,
    role_id: int(u.role_id),
    status: u.status,
    birthday: u.birthday ? String(u.birthday).slice(0, 10) : null,
    last_login: str(u.last_login),
    two_factor_country_code: int(u.two_factor_country_code),
    two_factor_phone: str(u.two_factor_phone),
    two_factor_options: options,
    email_verified_at: u.email_verified_at ? String(u.email_verified_at) : null,
    created_at: str(u.created_at),
    updated_at: str(u.updated_at),
  };
}

export const roleTransformer = (r) => ({
  id: int(r.id),
  name: r.name,
  display_name: r.display_name,
  description: r.description,
  removable: Boolean(Number(r.removable)),
  users_count: r.users_count === undefined || r.users_count === null ? null : int(r.users_count),
  updated_at: str(r.updated_at),
  created_at: str(r.created_at),
});

export const permissionTransformer = (p) => ({
  id: int(p.id),
  name: p.name,
  display_name: p.display_name,
  description: p.description,
  removable: Boolean(Number(p.removable)),
  updated_at: str(p.updated_at),
  created_at: str(p.created_at),
});

export const countryTransformer = (req, c) => ({
  id: int(c.id),
  name: c.name,
  full_name: c.full_name,
  capital: c.capital,
  citizenship: c.citizenship,
  country_code: int(c.country_code),
  currency: c.currency,
  currency_code: c.currency_code,
  currency_sub_unit: c.currency_sub_unit,
  currency_symbol: c.currency_symbol,
  iso_3166_2: c.iso_3166_2,
  iso_3166_3: c.iso_3166_3,
  region_code: int(c.region_code),
  sub_region_code: int(c.sub_region_code),
  eea: Boolean(Number(c.eea)),
  calling_code: int(c.calling_code),
  flag: c.flag ? `${baseUrl(req)}/flags/${c.flag}` : null,
});

/**
 * jenssegers/agent browser()/platform()/device() — false when unknown.
 * Names follow Mobile_Detect / Agent conventions for the common cases.
 */
export function agentInfo(userAgent) {
  const r = new UAParser(userAgent ?? '').getResult();
  const browserMap = { 'Mobile Safari': 'Safari', 'Chrome Headless': 'Chrome', 'Edge': 'Edge', 'IE': 'IE' };
  const osMap = { 'Mac OS': 'OS X', Android: 'AndroidOS', iOS: 'iOS', Windows: 'Windows', Linux: 'Linux', Ubuntu: 'Ubuntu' };
  const browser = r.browser.name ? browserMap[r.browser.name] ?? r.browser.name : false;
  const platform = r.os.name ? osMap[r.os.name] ?? r.os.name : false;
  let device = false;
  if (r.device.model) device = r.device.model;
  else if (r.os.name === 'Mac OS') device = 'Macintosh';
  else if (r.engine.name === 'WebKit' || r.engine.name === 'Blink') device = 'WebKit';
  return { browser, platform, device };
}

/** DbSession::mapSessionAttributes() + SessionTransformer */
export function sessionTransformer(s) {
  const a = agentInfo(s.user_agent);
  const last = s.last_activity == null ? '' : new Date(Number(s.last_activity) * 1000).toISOString().slice(0, 19).replace('T', ' ');
  return { id: s.id, user_id: int(s.user_id), ip_address: s.ip_address, user_agent: s.user_agent, browser: a.browser, platform: a.platform, device: a.device, last_activity: last };
}

export function activityTransformer(a) {
  const agent = agentInfo(a.user_agent);
  return {
    id: int(a.id), user_id: int(a.user_id), ip_address: a.ip_address, user_agent: a.user_agent,
    browser: agent.browser, platform: agent.platform, device: agent.device, description: a.description, created_at: str(a.created_at),
  };
}

export const announcementTransformer = (a) => ({
  id: int(a.id),
  user_id: int(a.user_id),
  title: a.title,
  body: a.body,
  // Announcement::getParsedBodyAttribute(): Illuminate\Mail\Markdown::parse($body)
  parsed_body: a.body ? marked.parse(a.body).trimEnd() : '',
  created_at: str(a.created_at),
  updated_at: str(a.updated_at),
});

/**
 * ApiController::respondWithPagination() with DataArraySerializer:
 * { data: [...], meta: { total, per_page, current_page, last_page, next_page_url, prev_page_url, from, to } }
 * Every query-string parameter except "page" is appended to the page URLs.
 */
export async function fractalPaginate(req, query, perPage, transform, perPageRaw = perPage) {
  const rawPage = req.query?.page;
  const page = /^\s*\d+\s*$/.test(String(rawPage ?? '')) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  const [{ total }] = await query.clone().clearSelect().clearOrder().count({ total: '*' });
  const totalN = Number(total);
  const rows = await query.clone().limit(perPage).offset((page - 1) * perPage);
  const lastPage = Math.max(Math.ceil(totalN / perPage), 1);

  const params = Object.entries(req.query ?? {}).filter(([k, v]) => k !== 'page' && v !== null && v !== undefined);
  // Arr::query() = http_build_query(..., PHP_QUERY_RFC3986): rawurlencode() rules.
  const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const url = (p) => {
    const qs = [...params.map(([k, v]) => [k, String(v)]), ['page', String(p)]].map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
    return `${requestUrl(req)}?${qs}`;
  };
  const from = rows.length ? (page - 1) * perPage + 1 : null;
  return {
    data: rows.map(transform),
    meta: {
      total: totalN,
      // Laravel passes $request->per_page through unchanged: a string when supplied.
      per_page: perPageRaw,
      current_page: page,
      last_page: lastPage,
      next_page_url: lastPage > page ? url(page + 1) : null,
      prev_page_url: page > 1 ? url(page - 1) : null,
      from,
      to: rows.length ? from + rows.length - 1 : null,
    },
  };
}
