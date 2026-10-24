// Port of Api\InstituteController (institute profile, students, Excel uploads).
import { db, table } from '../database/knex.js';
import { legacyAuthenticate } from './auth/legacyAuth.js';
import { legacyRun, legacyValidate } from './legacyErrors.js';
import { logger } from '../config/logger.js';
import { carbonAge, carbonParse } from '../utils/phpDate.js';
import { idx, looseEq, offset, strOf, PhpError } from '../utils/php.js';
import { unixNow } from '../utils/time.js';

const ok = (body) => ({ status: 200, body });
const KEYS = ['user_id', 'uuid', 'email'];
const students = () => db(table('student'));

function claim(payload, key) {
  if (!(key in payload)) throw new PhpError(`Undefined index: ${key}`);
  return payload[key];
}

/**
 * Laravel `$request->all()` for a JSON array body posted with ?token=...:
 * the body's numeric keys first, then query-string keys not in the body.
 * @returns {Array<[string|number, unknown]>}
 */
function allEntries(req) {
  const body = req.body;
  const bodyEntries = Array.isArray(body)
    ? body.map((v, i) => [i, v])
    : body && typeof body === 'object'
      ? Object.entries(body)
      : [];
  const bodyKeys = new Set(bodyEntries.map(([k]) => String(k)));
  const queryEntries = Object.entries(req.query ?? {}).filter(([k]) => !bodyKeys.has(k));
  return [...bodyEntries, ...queryEntries];
}

/** `$k == '0' || $k != 'token'` (PHP 7 loose comparisons on int|string keys). */
const isDataKey = (k) => looseEq(k, '0') || !looseEq(k, 'token');

/** InstituteController::validateStudent() — only the FIRST entry is checked. */
async function validateStudent(entries) {
  for (const [, student] of entries) {
    const years = carbonAge(carbonParse(idx(student, 'Date of Birth')));
    if (!(years >= 18 && years <= 30)) return `Invalid Date of Birth for student : ${strOf(idx(student, 'Name of Beneficiary'))}`;

    const program = idx(student, 'Programs');
    if (!looseEq(program, 'Graduate') && !looseEq(program, 'Post Graduate') && !looseEq(program, 'Undergraduate')) {
      return `Invalid Program for student : ${strOf(idx(student, 'Name of Beneficiary'))}`;
    }
    if (await students().where('email', idx(student, 'Valid Email')).first()) {
      return `Email id already present for student : ${strOf(idx(student, 'Name of Beneficiary'))}`;
    }
    if (await students().where('mobile', idx(student, 'Valid Mobile Number')).first()) {
      return `Mobile number already present for student : ${strOf(idx(student, 'Name of Beneficiary'))}`;
    }
    return true;
  }
  return null; // empty input: the original falls off the loop
}

/** InstituteController::deleteRecords() — manual rollback of rows inserted so far. */
async function deleteRecords(ids) {
  for (const id of ids) await students().where({ id }).delete();
}

/**
 * Shared body of ecxelUpload / uploadExcelPaid.
 * @param {{ prepare?: (payload) => Promise<object>, rowOf: (val, payload, ctx) => Promise<object>, failureName: (val) => unknown }} steps
 *   prepare runs before validation (reads done at the top of the original action),
 *   rowOf builds each insert row (may throw PhpError), failureName feeds the error reason.
 */
async function excelUpload(req, { prepare = async () => ({}), rowOf, failureName }) {
  const { payload } = await legacyAuthenticate(req, KEYS);
  const ctx = await prepare(payload);
  const entries = allEntries(req);
  const recordsInserted = [];

  const message = await validateStudent(entries);
  if (!looseEq(message, 'true')) return ok({ message: 'Error', reason: message });

  let val;
  let lastVal;
  let sawVal = false;
  try {
    for ([, val] of entries.filter(([k]) => isDataKey(k))) {
      sawVal = true;
      lastVal = val;
      const [id] = await students().insert(await rowOf(val, payload, ctx));
      recordsInserted.push(id);
    }
  } catch (err) {
    // DEV-06: the original echo()'d $e->getMessage() before the JSON body,
    // producing an unparsable response. The port logs it instead.
    logger.warn({ err: err.message }, 'institute excel upload row failed');
    await deleteRecords(recordsInserted);
    return ok({ message: 'Error', reason: `Invalid data for student: ${strOf(failureName(val))}` });
  }

  if (recordsInserted.length > 0) return ok({ message: 'Success' });
  if (!sawVal) throw new PhpError('Undefined variable: val');
  return ok({ message: 'Error', reason: `Invalid data for student: ${strOf(lastVal)}` });
}

/** PHP microtime(true) with the decimal point removed (precision 14), e.g. "17927814091234". */
function microtimeAppId() {
  const t = Number((performance.timeOrigin + performance.now()) / 1000);
  return t.toPrecision(14).replace(/0+$/, '').replace(/\.$/, '').replace('.', '');
}

/** POST /api/ecxelUpload — free-seat nominations parsed from Excel in the browser. */
export const ecxelUpload = (req) =>
  legacyRun(async () => {
    return excelUpload(req, {
      // $payload['permanent_institute_id'] and the Institute lookup happen before validation.
      prepare: async (payload) => {
        const permanentId = claim(payload, 'permanent_institute_id');
        const institute = await db(table('institute')).select('Institute Name').where('Permanent Institute Id', permanentId).first();
        return { permanentId, institute: institute ?? null };
      },
      rowOf: async (val, _payload, { permanentId, institute }) => {
        return {
          name: idx(val, 'Name of Beneficiary'),
          father_name: idx(val, 'Father Name'),
          mobile: idx(val, 'Valid Mobile Number'),
          email: idx(val, 'Valid Email'),
          birthdate: idx(val, 'Date of Birth'),
          admission_registration_number: idx(val, 'Admission/ Registration number'),
          program: idx(val, 'Programs'),
          category: idx(val, 'Category'),
          department_stream: idx(val, 'Department/ Stream'),
          gender: idx(val, 'Gender'),
          year_of_admission: idx(val, 'Year of Admission'),
          application_number: idx(val, 'Application Number'),
          permanent_institute_id: permanentId,
          institute_name: idx(institute, 'Institute Name'),
          state: idx(val, 'State/ UT'),
          aicte_code: 'C-9425',
          marks_hsc: idx(val, 'Marks secured in Class 12th'),
          total_marks: idx(val, 'Total Marks'),
          percentage: idx(val, 'Percentage'),
          course_name: idx(val, 'Courses'),
        };
      },
      failureName: (val) => idx(val, 'Name of Beneficiary'),
    });
  });

/** POST /api/uploadExcelPaid — paid-seat student list parsed from Excel in the browser. */
export const uploadExcelPaid = (req) =>
  legacyRun(async () => {
    return excelUpload(req, {
      rowOf: async (val, payload) => ({
        name: idx(val, 'Name of Beneficiary'),
        father_name: idx(val, 'Father’s Name'),
        mobile: idx(val, 'Valid Mobile Number'),
        email: idx(val, 'Valid Email'),
        birthdate: idx(val, 'Date of Birth'),
        admission_registration_number: idx(val, 'Admission/ Registration number'),
        program: idx(val, 'Programs'),
        category: idx(val, 'Category'),
        course_name: idx(val, 'Course Name'),
        gender: idx(val, 'Gender'),
        year_of_admission: idx(val, 'Year of Admission'),
        application_number: microtimeAppId(),
        permanent_institute_id: claim(payload, 'permanent_institute_id'),
        institute_name: idx(val, 'Name of Institution'),
        state: idx(val, 'State of Institution'),
        aicte_code: idx(val, 'AICTE Code'),
        isEligibleFreeCourse: 'No',
      }),
      // The original reports $val['Name'], a column the sheet does not have.
      failureName: (val) => idx(val, 'Name'),
    });
  });

/** POST /api/submitInstituteDetails */
export const submitInstituteDetails = (req, input) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, KEYS);
    await legacyValidate(input, {
      institute_address: 'required',
      institute_contact_person_email: 'required',
      institute_email: 'required|email',
      institute_mobile: 'required',
      institute_name: 'required',
      institute_neat_coordinator: 'required',
      institute_state: 'required',
      institute_students_number: 'required',
    });
    const details = () => db(table('institute_details'));
    if (await details().where('institute_email', input.institute_email).first()) {
      return ok({ message: 'Error', reason: 'Email already exists in database' });
    }
    if (await details().where('institute_mobile', input.institute_mobile).first()) {
      return ok({ message: 'Error', reason: 'Mobile number already exists in database' });
    }
    const [id] = await details().insert({
      application_number: claim(payload, 'application_number'),
      institute_name: input.institute_name,
      institute_aishe_code: input.institute_aishe_code ?? null,
      // The stored e-mail is the account e-mail from the token, not the form field.
      institute_email: claim(payload, 'email'),
      institute_address: input.institute_address,
      institute_state: input.institute_state,
      institute_contact_person_email: input.institute_contact_person_email,
      institute_neat_coordinator: input.institute_neat_coordinator,
      institute_mobile: input.institute_mobile,
      institute_landline: input.institute_landline ?? null,
      institute_students_number: input.institute_students_number,
      permanent_institute_id: claim(payload, 'permanent_institute_id'),
    });
    return id > 0 ? ok({ message: 'Success' }) : ok({ message: 'Error', reason: 'Data not inserted.' });
  });

/** POST /api/submitStudentDetailsFromInstitute — add or edit one student of the institute. */
export const submitStudentDetails = (req, input) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, KEYS);
    await legacyValidate(input, {
      name: 'required',
      father_name: 'required',
      email: 'required|email',
      mobile: 'required',
      birthdate: 'required',
      admission_registration_number: 'required',
      course_name: 'required',
      category: 'required',
      gender: 'required',
      year_of_admission: 'required',
      program: 'required',
    });
    const fields = {
      name: input.name,
      father_name: input.father_name,
      mobile: input.mobile,
      email: input.email,
      birthdate: input.birthdate,
      admission_registration_number: input.admission_registration_number,
      course_name: input.course_name,
      category: input.category,
      gender: input.gender,
      year_of_admission: input.year_of_admission,
      program: input.program,
    };
    const permanentId = claim(payload, 'permanent_institute_id');
    const appNo = input.application_number ?? null;

    if (await students().where({ application_number: appNo, permanent_institute_id: permanentId }).first()) {
      // Note: the update is keyed by application_number only (as in the original).
      const affected = await students().where('application_number', appNo).update(fields);
      return affected === 0 ? ok({ message: 'Error', reason: 'Data not Updated.' }) : ok({ message: 'Success' });
    }
    if (await students().where('email', input.email).first()) return ok({ message: 'Error', reason: 'Email already exists in database' });
    if (await students().where('mobile', input.mobile).first()) return ok({ message: 'Error', reason: 'Mobile number already exists in database' });
    if (appNo !== null) return ok({ message: 'Error', reason: 'Kindly do not insert application number for new student.' });

    await students().insert({ ...fields, application_number: unixNow(), permanent_institute_id: permanentId });
    return ok({ message: 'Success' });
  });

/** POST /api/getStudents */
export const getStudents = (req) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, KEYS);
    return ok({ message: 'Success', students: await students().where('permanent_institute_id', claim(payload, 'permanent_institute_id')) });
  });

/** GET /api/getInstituteDetails */
export const getInstituteDetails = (req) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, KEYS);
    const details = await db(table('institute_details')).where('institute_email', claim(payload, 'email'));
    const permanentId = claim(payload, 'permanent_institute_id');
    const type = await db(table('institute')).where('Permanent Institute Id', permanentId).first('Institution Type');
    const [{ n }] = await students().where('permanent_institute_id', permanentId).count({ n: '*' });
    if (offset(details, 0).id != null) {
      return ok({
        message: 'Success',
        institute_details: details,
        institute_details_updated: 'Yes',
        institute_type: type?.['Institution Type'] ?? null,
        std_rec: Number(n),
      });
    }
    return ok({ message: 'Success', institute_details_updated: 'No', institute_type: type?.['Institution Type'] ?? null });
  });

/** GET /api/editInstituteDetails — deletes the institute_details row so it can be re-entered. */
export const editInstituteDetails = (req) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, KEYS);
    await db(table('institute_details')).where('institute_email', claim(payload, 'email')).delete();
    return ok({ message: 'Success', reason: 'You can now Edit your details' });
  });
