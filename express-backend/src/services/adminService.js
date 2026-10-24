// Port of Api\AdminController and the admin parts of Api\ProductController.
import { db, table } from '../database/knex.js';
import { legacyAuthenticate, LegacyResponse } from './auth/legacyAuth.js';
import { assertAuthenticated } from './auth/hardening.js';
import { extractToken, verifyToken, JwtError } from './auth/jwtService.js';
import { findById } from '../repositories/userRepository.js';
import { legacyRun } from './legacyErrors.js';
import { paginate, phpInt } from '../http/paginate.js';
import { phpUcfirst } from '../utils/php.js';

const ok = (body) => ({ status: 200, body });
const KEYS = ['user_id', 'uuid', 'email'];
const ADMIN_ROLE = 1;

// Test/staff accounts excluded from every admin statistic in the original.
export const EXCLUDED_EMAILS = Object.freeze([
  'admin@example.com', 'test@inst.com', 'surya.pillai@lntinfotech.com', 'vishal@lntinfotech.com', 'piyush@lntinfotech.com',
  'chandrakant.borse@lntinfotech.com', 'manoj0mishra02@gmail.com', 'kamlesh@i2k2.com', 'chandrasekhar.buddha@gmail.com',
  'bssinwarhanumangarh@gmail.com', 'startupfellow5@aicte-india.org', 'chandrakant.borse87@gmail.com', 'bhandarinarendra23@gmail.com',
  'Asd@1234', 'vishalg.patil@lntinfotech.com', 'patilvg@gmail.com', 'piyushahuja22@gmail.com', 'ahujapiyush22@gmail.com',
  'chandrakantborse87@gmail.com', 'shwetabhatnagar99@gmail.com',
]);

/**
 * DEV-08: the original checked only that *some* user was logged in. Admin-only
 * endpoints additionally require role_id 1 (the Angular admin screens already
 * send an admin token, so the unchanged client keeps working).
 */
function requireAdmin(user) {
  if (Number(user.role_id) !== ADMIN_ROLE) throw new LegacyResponse(403, { message: 'Error', reason: 'Forbidden' });
}

/** Standard guard + admin role. */
async function adminGuard(req) {
  const auth = await legacyAuthenticate(req, KEYS);
  requireAdmin(auth.user);
  return auth;
}

// Admin catch blocks answer {"message":"Error"} without a reason.
const quiet = (fn) =>
  legacyRun(fn).then((r) => (r.status === 200 && r.body?.message === 'Error' && r.body.reason !== undefined ? ok({ message: 'Error' }) : r));

const countUsers = async (roleId, excluded = true) => {
  const q = db(table('users')).where('role_id', roleId);
  if (excluded) q.whereNotIn('email', EXCLUDED_EMAILS);
  return Number((await q.count({ n: '*' }))[0].n);
};

/** GET /api/getAdminCounts */
export const getAdminCounts = (req) =>
  quiet(async () => {
    await adminGuard(req);
    return ok({
      message: 'Success',
      products: Number((await db(table('product')).count({ n: '*' }))[0].n),
      students: await countUsers(3),
      institutes: await countUsers(5),
      companies: await countUsers(4),
      learners: await countUsers(6),
    });
  });

/**
 * `!JWTAuth::parseToken()->authenticate() || !$this->verifyUser($request->token)`
 * → 401 {"message":"Unauthorized"}; exceptions → 500 {"message":"Error","error":...}.
 */
async function paginatedGuard(req) {
  let payload;
  try {
    payload = await verifyToken(extractToken(req), { mode: 'parseToken' });
  } catch (err) {
    if (err instanceof JwtError) throw new LegacyResponse(500, { message: 'Error', error: err.message });
    throw err;
  }
  const user = await findById(payload.sub);
  if (!user) throw new LegacyResponse(401, { message: 'Unauthorized' });
  for (const key of KEYS) {
    if (!(key in payload)) throw new LegacyResponse(500, { message: 'Error', error: `Undefined index: ${key}` });
  }
  requireAdmin(user);
  return { user, payload };
}

const perPageOf = (input) => {
  let perPage = phpInt(input.per_page, 100);
  if (perPage > 100 || perPage < 1) perPage = 100;
  return perPage;
};

const filled = (v) => v !== null && v !== undefined && String(v).trim() !== '';

/** GET /api/getAdminStudents?page&per_page&search */
export async function getStudents(req, input) {
  try {
    await paginatedGuard(req);
    const q = db(table('users')).select('username', 'email', 'phone', 'status').where('role_id', 3).whereNotIn('email', EXCLUDED_EMAILS);
    if (filled(input.search)) {
      const like = `%${String(input.search).trim()}%`;
      q.where((w) => w.where('username', 'like', like).orWhere('email', 'like', like).orWhere('phone', 'like', like));
    }
    q.orderBy('username', 'asc');
    return ok({ message: 'Success', students: await paginate(req, q, perPageOf(input)) });
  } catch (err) {
    if (err instanceof LegacyResponse) return { status: err.status, body: err.body };
    return { status: 500, body: { message: 'Error', error: 'Server Error' } };
  }
}

/** GET /api/getAdminLearners?page&per_page&search (DEV-04: no PHP "line" in errors) */
export async function getLearners(req, input) {
  try {
    await paginatedGuard(req);
    const u = table('users');
    const l = table('learner');
    const q = db(u)
      .join(l, `${l}.application_number`, '=', `${u}.application_number`)
      .select(`${u}.username`, `${u}.email`, `${u}.phone`, `${u}.status`, `${l}.profession`)
      .where(`${u}.role_id`, 6)
      .whereNotIn(`${u}.email`, EXCLUDED_EMAILS);
    if (filled(input.search)) {
      const like = `%${String(input.search).trim()}%`;
      q.where((w) =>
        w.where(`${u}.username`, 'like', like).orWhere(`${u}.email`, 'like', like).orWhere(`${u}.phone`, 'like', like).orWhere(`${l}.profession`, 'like', like),
      );
    }
    q.orderBy(`${u}.username`, 'asc');
    return ok({ message: 'Success', learners: await paginate(req, q, perPageOf(input)) });
  } catch (err) {
    if (err instanceof LegacyResponse) return { status: err.status, body: err.body };
    return { status: 500, body: { message: 'Error', error: 'Server Error' } };
  }
}

/** GET /api/getAdminProducts */
export const getAdminProducts = (req) =>
  quiet(async () => {
    await adminGuard(req);
    return ok({ message: 'Success', products: await db(table('product_details')).where('isDetailsSubmitted', 'Yes').orderBy('id', 'desc') });
  });

/** GET /api/getCompanies — also used by the public grievance page (any logged-in user). */
export const getCompanies = (req) =>
  quiet(async () => {
    await legacyAuthenticate(req, KEYS);
    return ok({ message: 'Success', companies: await db(table('company')) });
  });

/** GET /api/getInstitutes */
export const getInstitutes = (req) =>
  quiet(async () => {
    await adminGuard(req);
    const u = table('users');
    const i = table('institute');
    const institutes = await db(u)
      .join(i, `${i}.Permanent Institute Id`, '=', `${u}.permanent_institute_id`)
      .whereNotIn(`${u}.email`, EXCLUDED_EMAILS)
      .where(`${u}.role_id`, 5)
      .select({ institute_name: `${i}.Institute Name`, institute_email: `${u}.email`, institute_mobile: `${u}.phone`, status: `${u}.status` });
    return ok({ message: 'Success', institutes });
  });

/** POST /api/getCompanyWiseProduct {company_name} — also used by the grievance page. */
export const getCompanyWiseProduct = (req, { company_name }) =>
  quiet(async () => {
    await legacyAuthenticate(req, KEYS);
    const company = await db(table('company_details')).where('name', company_name).first('neat_id');
    const products = await db(table('product_details')).where({ neat_id: company?.neat_id ?? null, isDetailsSubmitted: 'Yes' });
    return ok({ message: 'Success', products });
  });

/** POST /api/changeProductStatus {code, status} */
export const changeProductStatus = (req, { code, status }) =>
  quiet(async () => {
    await adminGuard(req);
    await db(table('product_details')).where('code', code).update({ product_active: status });
    return ok({ message: 'Success', reason: 'Status Updated Successfully' });
  });

/** GET /api/free-seat-student — StudentRepository::getStudent() (Eloquent: name is ucfirst()'d). */
export const freeSeatStudent = (req) =>
  quiet(async () => {
    await adminGuard(req);
    const rows = await db(table('student')).select('name', 'email', 'mobile', 'gender').where({ isEligibleFreeCourse: 1, is_rule_engine_processed: 1 });
    return ok({ message: 'Success', status: 200, studentLists: rows.map((r) => ({ ...r, name: r.name == null ? r.name : phpUcfirst(r.name) })) });
  });

/** GET /api/mou-list — ProductRepository::companyList() */
export const mouList = (req) =>
  quiet(async () => {
    await adminGuard(req);
    const companyLists = await db(table('company_details')).select('name', 'neat_id', 'id', 'mou_file_uploaded', 'mou_file', 'mou_date').orderBy('name', 'asc');
    return ok({ message: 'Success', status: 200, mouLists: { companyLists } });
  });

/**
 * GET /api/getCompanyDetails?neat_id= — public in Laravel (SEC-IDOR-02, hardened:
 * admin token required). Reads `financial_competence`, which does not exist in
 * this database (R-01), so the original always answers {"message":"Error"}.
 */
export const getCompanyDetails = (req, { neat_id }) =>
  quiet(async () => {
    await assertAuthenticated(req, [ADMIN_ROLE]);
    const byNeat = (t) => db(table(t)).where('neat_id', neat_id).first();
    const available_professional = await byNeat('available_professional');
    const company_details = await byNeat('company_details');
    const management_competence = await byNeat('management_competence');
    const financial_competence = await byNeat('financial_competence');
    return ok({
      message: 'Success',
      available_professional: available_professional ?? null,
      company_details: company_details ?? null,
      management_competence: management_competence ?? null,
      financial_competence: financial_competence ?? null,
    });
  });

/** GET /api/getAdminCountsForAICTEDashboard (public) */
export const getAdminCountsForAICTEDashboard = () =>
  legacyRun(async () =>
    ok({
      message: 'Success',
      products: Number((await db(table('product_details')).where('product_active', 'Approved').count({ n: '*' }))[0].n),
      students: await countUsers(3, false),
      institutes: await countUsers(5, false),
      companies: await countUsers(4, false),
      learners: await countUsers(6, false),
    }),
  );

/** GET /api/getCompanyAndProductsForAICTEDashboard (public) → [ { total_program_count, <company>: [...], total_company } ] */
export const getCompanyAndProductsForAICTEDashboard = () =>
  quiet(async () => {
    const companies = await db(table('product_details')).distinct('company_name');
    const result = { total_program_count: 0 };
    for (const { company_name: name } of companies) {
      const products = await db(table('product_details')).where('company_name', name).select('course_name');
      // PHP array key: null → "" ; later duplicates overwrite earlier ones.
      result[name ?? ''] = products;
      result.total_program_count += products.length;
    }
    result.total_company = companies.length;
    return ok([result]);
  });

/** POST /api/getCourseWiseProduct {course_company_name} — 404 body is {"message":"Error"} here. */
export const getCourseWiseProduct = (req, input) =>
  quiet(async () => {
    try {
      await adminGuard(req);
    } catch (err) {
      if (err instanceof LegacyResponse && err.status === 404) throw new LegacyResponse(404, { message: 'Error' });
      throw err;
    }
    const q = db(table('product_details')).where('isDetailsSubmitted', 'Yes');
    const term = input.course_company_name;
    if (term) q.where((w) => w.where('course_name', 'like', `%${term}%`).orWhere('company_name', 'like', `%${term}%`));
    return ok({ message: 'Success', products: await q });
  });

/** POST /api/update-mou-date {neat_id, mou_date} */
export async function updateMouDate(req, { neat_id, mou_date }) {
  try {
    const payload = await verifyToken(extractToken(req), { mode: 'parseToken' });
    const user = await findById(payload.sub);
    if (!user) return { status: 401, body: { status: false, message: 'Unauthorized' } };
    requireAdmin(user);
    if (!neat_id || !mou_date) return { status: 400, body: { status: false, message: 'Missing parameters' } };
    await db(table('company_details')).where('neat_id', neat_id).update({ mou_date });
    return ok({ status: true, message: 'MOU date updated successfully' });
  } catch (err) {
    if (err instanceof LegacyResponse) return { status: err.status, body: { status: false, ...err.body } };
    const reason = err instanceof JwtError ? err.message : 'Server Error';
    return { status: 500, body: { status: false, message: 'Error', reason } };
  }
}

/** GET /api/product-management — ProductController::productDetails (DEV-04: no PHP "line") */
export async function productManagement(req) {
  try {
    const payload = await verifyToken(extractToken(req), { mode: 'parseToken' });
    const user = await findById(payload.sub);
    if (!user) return { status: 401, body: { message: 'Unauthorized' } };
    requireAdmin(user);
    const pd = table('product_details');
    const pa = table('product_purchased_audit');
    const sumCase = (cond, alias) => db.raw(`SUM(CASE WHEN ${cond} THEN 1 ELSE 0 END) AS ${alias}`);
    const data = await db(pd)
      .join(pa, `${pa}.code`, '=', `${pd}.code`)
      .select(
        `${pd}.code`,
        `${pd}.course_name`,
        `${pd}.view_counter`,
        sumCase(`${pa}.course_type = 'Free'`, 'number_of_free_student'),
        sumCase(`${pa}.course_type = 'Paid'`, 'number_of_paid_application'),
        sumCase(`${pa}.status = 'Payment Failed'`, 'payment_failed'),
        sumCase(`${pa}.status = 'Payment pending'`, 'payment_pending'),
        sumCase(`${pa}.status = 'Payment Successful'`, 'payment_success'),
      )
      .groupBy(`${pd}.code`, `${pd}.course_name`, `${pd}.view_counter`);
    return ok({ status: true, data });
  } catch (err) {
    if (err instanceof LegacyResponse) return { status: err.status, body: err.body };
    const error = err instanceof JwtError ? err.message : 'Server Error';
    return { status: 500, body: { status: false, message: 'Error', error } };
  }
}
