// Port of Api\StudentController (students, learners, FAQs, states, colleges,
// free-seat codes).
import { db, table } from '../database/knex.js';
import { legacyAuthenticate, LegacyResponse } from './auth/legacyAuth.js';
import { assertOwnApplication } from './auth/hardening.js';
import { extractToken, verifyToken } from './auth/jwtService.js';
import { legacyRun, legacyValidate, legacyErrorResponse } from './legacyErrors.js';
import { sendMail } from '../integrations/mail/mailer.js';
import { freeSeatVerification } from '../integrations/mail/templates/freeSeatVerification.js';
import { nowSql } from '../utils/time.js';
import { looseEq, offset } from '../utils/php.js';
import { withoutSecrets } from '../repositories/userRepository.js';

const ok = (body) => ({ status: 200, body });
const STUDENT_KEYS = ['user_id', 'uuid', 'email'];

/** Missing payload key → PHP "Undefined index" (caught by the action's try/catch). */
function claim(payload, key) {
  if (!(key in payload)) throw new Error(`Undefined index: ${key}`);
  return payload[key];
}

// ------------------------------------------------------------------ FAQs

/** POST /api/getFaqs {role} — bare JSON array, no try/catch in the original. */
export const getFaqs = async ({ role }) => ok(await db(table('faqs')).where('role', role));

/** POST /api/getFaqsHindi {role} */
export const getFaqsHindi = async ({ role }) => ok(await db(table('faqs')).select('title_hindi', 'body_hindi').where('role', role));

// ------------------------------------------------------- student details

const STUDENT_RULES = {
  father_name: 'required',
  date_of_birth: 'required',
  residential_address: 'required',
  state: 'required',
  category: 'required',
  gender: 'required',
  college_state: 'required',
  college_name: 'required',
  year_of_admission: 'required',
  identity_number: 'required',
  admission_registration_number: 'required',
  stream_of_education: 'required',
  academic_record: 'required',
};

/** POST /api/submitStudentDetails */
export const submitStudentDetails = (req, input) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, STUDENT_KEYS);
    await legacyValidate(input, STUDENT_RULES);

    const appNo = claim(payload, 'application_number');
    const row = {
      updated_at: nowSql(),
      name_of_learner: claim(payload, 'username'),
      application_number: appNo,
      father_name: input.father_name,
      date_of_birth: input.date_of_birth,
      residential_address: input.residential_address,
      state: input.state,
      category: input.category,
      gender: input.gender,
      college_state: input.college_state,
      college_name: input.college_name,
      year_of_admission: input.year_of_admission,
      identity_number: input.identity_number,
      admission_registration_number: input.admission_registration_number,
      stream_of_education: input.stream_of_education,
      academic_record: input.academic_record,
      contact_number: claim(payload, 'phone'),
      email: claim(payload, 'email'),
      isDetailsSubmitted: 'Yes',
    };

    const details = () => db(table('student_details'));
    if (await details().where('application_number', appNo).first()) {
      await details().where('application_number', appNo).update(row);
    } else {
      // The original checks uniqueness against $request->email / ->contact_number,
      // fields the form no longer sends (commented-out rules) — so these compare
      // against NULL. Behaviour preserved.
      if (await details().where('email', input.email ?? null).first()) {
        return ok({ message: 'Error', reason: 'Email already exists in database' });
      }
      if (await details().where('contact_number', input.contact_number ?? null).first()) {
        return ok({ message: 'Error', reason: 'Contact number already exists in database' });
      }
      await details().insert(row);
    }
    return ok({ message: 'Success' });
  });

/** GET /api/getStudentDetails */
export const getStudentDetails = (req) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, STUDENT_KEYS);
    const studentDetails = await db(table('student_details')).where('email', claim(payload, 'email'));
    const first = offset(studentDetails, 0);
    const updated = first.id != null && looseEq(first.isDetailsSubmitted, 'Yes') ? 'Yes' : 'No';
    return ok({ message: 'Success', student_details: studentDetails, student_details_updated: updated });
  });

/** GET /api/editStudentDetails — re-opens the student form */
export const editStudentDetails = (req) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, STUDENT_KEYS);
    await db(table('student_details'))
      .where('application_number', claim(payload, 'application_number'))
      .update({ updated_at: nowSql(), isDetailsSubmitted: 'No' });
    return ok({ message: 'Success' });
  });

// --------------------------------------------------- purchases (public*)

const purchaseQuery = (applicationNumber, courseType) =>
  db(table('product_purchased_audit'))
    .join(table('product_details'), `${table('product_purchased_audit')}.code`, '=', `${table('product_details')}.code`)
    .select(
      `${table('product_details')}.course_name`,
      `${table('product_purchased_audit')}.status`,
      `${table('product_details')}.code`,
      `${table('product_details')}.price`,
      `${table('product_details')}.product_direct_url`,
      `${table('product_purchased_audit')}.course_type`,
    )
    .where(`${table('product_purchased_audit')}.application_number`, applicationNumber)
    .where(`${table('product_purchased_audit')}.status`, 'Payment Successful')
    .where(`${table('product_purchased_audit')}.course_type`, courseType);

// The original catch block uses the key "asdlkfj" for the error text.
const purchasesRun = (fn) =>
  legacyRun(fn).then((r) => (r.body?.reason !== undefined && r.body.message === 'Error' && r.status === 200 ? ok({ message: 'Error', asdlkfj: r.body.reason }) : r));

/** POST /api/getPurchasedProducts {application_number} — public in Laravel (SEC-IDOR-01) */
export const getPurchasedProducts = (req, { application_number }) =>
  purchasesRun(async () => {
    await assertOwnApplication(req, application_number);
    return ok({ message: 'Success', products: await purchaseQuery(application_number, 'Paid') });
  });

/** POST /api/getFreeProducts {application_number} — public in Laravel (SEC-IDOR-01) */
export const getFreeProducts = (req, { application_number }) =>
  purchasesRun(async () => {
    await assertOwnApplication(req, application_number);
    return ok({ message: 'Success', products: await purchaseQuery(application_number, 'Free') });
  });

/** POST /api/getAppliedProducts {application_number} — public in Laravel (SEC-IDOR-01) */
export const getAppliedProducts = (req, { application_number }) =>
  purchasesRun(async () => {
    await assertOwnApplication(req, application_number);
    const products = await db(table('product_purchased_audit'))
      .join(table('product'), `${table('product_purchased_audit')}.code`, '=', `${table('product')}.code`)
      .select(`${table('product')}.name`, `${table('product_purchased_audit')}.code`, `${table('product_purchased_audit')}.transaction_id`, `${table('product_purchased_audit')}.course_type`, `${table('product_purchased_audit')}.status`)
      .where('application_number', application_number)
      .where('status', '!=', 'Approved');
    return ok({ message: 'Success', products });
  });

// ----------------------------------------------------------- free seats

/** POST /api/sendFreeSeatVerificationMail {code} */
export const sendFreeSeatVerificationMail = (req, { code }) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, STUDENT_KEYS);
    const row = await db(table('free_seat_code')).where('product_code', code).first('company_secret_code');
    await sendMail({ to: claim(payload, 'email'), ...freeSeatVerification({ company_secret_code: row?.company_secret_code ?? null }) });
    return ok({ message: 'Success' });
  });

/** POST /api/checkStudentExists {student_email} (public) */
export const checkStudentExists = ({ student_email }) =>
  legacyRun(async () => {
    const [{ n }] = await db(table('users')).where('email', student_email).count({ n: '*' });
    return ok({ message: 'Success', registered: Number(n) === 1 ? 'Yes' : 'No' });
  });

/** POST /api/checkStudentSecretCode — JWT payload only (no guard). */
export const checkStudentSecretCode = (req, input) =>
  legacyRun(async () => {
    const payload = await verifyToken(extractToken(req));
    if (!looseEq(claim(payload, 'application_number'), input.application_number)) {
      return ok({ message: 'Error', reason: 'Invalid User Logged In' });
    }
    const base = () =>
      db(table('student_free_seat_allocations'))
        .where('student_id', input.application_number)
        .where('course_id', input.product_id)
        .where('neat_secret_code', input.neat_secret_code);
    const count = Number((await base().count({ n: '*' }))[0].n);
    if (count !== 1) return ok({ message: 'Error', reason: 'You are not Eligible for a free Course' });
    const availed = Number((await base().where('is_course_availed', 'Yes').count({ n: '*' }))[0].n);
    return availed === 1
      ? ok({ message: 'Availed', reason: 'Free course already availed.' })
      : ok({ message: 'Success', reason: 'Congrats on receiving the Free Course' });
  });

/** POST /api/checkCompanySecretCode — marks the free seat as availed. */
export const checkCompanySecretCode = (req, input) =>
  legacyRun(async () => {
    const payload = await verifyToken(extractToken(req));
    const appNo = claim(payload, 'application_number');
    const where = { company_secret_code: input.company_secret_code, student_id: appNo, course_id: input.course_id };
    const [{ n }] = await db(table('student_free_seat_allocations')).where({ ...where, is_course_availed: 'No' }).count({ n: '*' });
    if (Number(n) !== 1) return ok({ message: 'Error', reason: 'The Code for the Free Seat is Not Valid' });
    await db(table('student_free_seat_allocations')).where(where).update({ updated_at: nowSql(), is_course_availed: 'Yes' });
    return ok({ message: 'Success', reason: 'Congrats on receiving the Free Course' });
  });

// ------------------------------------------------------------- learners

/** POST /api/submitLearnerDetails */
export const submitLearnerDetails = (req, input) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, STUDENT_KEYS);
    await legacyValidate(input, { date_of_birth: 'required', age: 'required|integer|min:1|max:150', gender: 'required', profession: 'required|string|max:191' });
    const appNo = claim(payload, 'application_number');
    await db.transaction(async trx => {
      const user = await trx(table('users')).where('application_number', appNo).forUpdate().first();
      const row = {
        updated_at: nowSql(),
        date_of_birth: input.date_of_birth,
        age: input.age,
        gender: input.gender,
        profession: input.profession,
        isDetailsSubmitted: 'Yes',
      };
      const existing = await trx(table('learner')).where('application_number', appNo).first();
      if (existing) await trx(table('learner')).where('application_number', appNo).update(row);
      else await trx(table('learner')).insert({
        ...row, application_number: appNo, name: user.username, phone: user.phone, email: user.email,
      });
    });
    return ok({ message: 'Success' });
  });

/** GET /api/getLearnerDetails */
export const getLearnerDetails = (req) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, STUDENT_KEYS, { payloadFirst: true });
    const appNo = claim(payload, 'application_number');
    const [{ n }] = await db(table('learner')).where('application_number', appNo).count({ n: '*' });
    if (Number(n) > 0) {
      return ok({ learner_present: 'Yes', learner_details: (await db(table('learner')).where('application_number', appNo).first()) ?? null });
    }
    // DEV-05: the original returned the full users row from the query builder,
    // including the bcrypt password hash and one-time secrets (Eloquent $hidden
    // does not apply to DB::table()). Those columns are removed; all other
    // fields are returned unchanged.
    const user = (await db(table('users')).where('application_number', appNo).first()) ?? null;
    return ok({ learner_present: 'No', learner_details: user && withoutSecrets(user) });
  });

/** GET /api/editLearnerDetails */
export const editLearnerDetails = (req) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, STUDENT_KEYS);
    await db(table('learner'))
      .where('application_number', claim(payload, 'application_number'))
      .update({ updated_at: nowSql(), isDetailsSubmitted: 'No' });
    return ok({ message: 'Success', learner_present: 'No' });
  });

// ------------------------------------------------------ colleges/states

/** POST /api/getCollegeNames {college_state} — bare JSON array */
export const getCollegeNames = (req, { college_state }) =>
  legacyRun(async () => {
    await legacyAuthenticate(req, STUDENT_KEYS);
    const names = await db(table('institute'))
      .distinct({ name: 'Institute Name' })
      .where('State', college_state)
      .orderBy('Institute Name', 'asc');
    return ok(names);
  });

/** GET /api/getStates */
export const getStates = () =>
  legacyRun(async () => {
    const rows = await db(table('institute')).distinct('State').orderBy('State', 'asc');
    return ok({ message: 'Success', states: rows.map((r) => r.State) });
  }).then((r) => (r.body?.message === 'Error' ? ok({ message: 'Error' }) : r));

/**
 * GET /api/checkFileUpload — no try/catch in the original: token problems are
 * uncaught (500, see DEV-04); no rows → empty 200 response.
 */
export async function checkFileUpload(req) {
  let auth;
  try {
    auth = await legacyAuthenticate(req, STUDENT_KEYS);
  } catch (err) {
    if (err instanceof LegacyResponse && err.status === 404) return { status: 404, body: err.body };
    if (err instanceof LegacyResponse) {
      // Uncaught JWTException / ErrorException in the original → HTTP 500.
      return { status: 500, body: { message: err.body.reason } };
    }
    return legacyErrorResponse(err);
  }
  if (!('permanent_institute_id' in auth.payload)) return { status: 500, body: { message: 'Server Error' } };
  const [{ n }] = await db(table('student')).where('permanent_institute_id', auth.payload.permanent_institute_id).count({ n: '*' });
  return Number(n) > 0 ? ok({ message: 'Success' }) : { status: 200, empty: true };
}
