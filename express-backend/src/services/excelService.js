import { db, table } from '../database/knex.js';
import { tokenAuthenticate, LegacyResponse } from './auth/tokenAuth.js';
import { legacyRun } from './serviceErrors.js';
import { looseEq } from '../utils/php.js';

const ok = (body) => ({ status: 200, body });
const KEYS = ['user_id', 'uuid', 'email'];

async function adminGuard(req) {
  const { user } = await tokenAuthenticate(req, KEYS);
  if (Number(user.role_id) !== 1) throw new LegacyResponse(403, { message: 'Error', reason: 'Forbidden' });
}

/** GET /api/getInstitutesWithStudentsForExcel */
export const getInstitutesWithStudents = (req) =>
  legacyRun(async () => {
    await adminGuard(req);
    const institutes = await db(table('institute_details')).select({
      'Institute Name': 'institute_name',
      Email: 'institute_email',
      Address: 'institute_address',
      State: 'institute_state',
      'Contact Person': 'institute_contact_person_name',
      'Neat Coordinator': 'institute_neat_coordinator',
      Mobile: 'institute_mobile',
      Landline: 'institute_landline',
      'Permanent Institute ID': 'permanent_institute_id',
    });
    const students = await db(table('student')).select({
      'Permanent Institute ID': 'permanent_institute_id',
      'Institute Name': 'institute_name',
      'Student Application Number': 'application_number',
      Name: 'name',
      'Father`s Name': 'father_name',
      Mobile: 'mobile',
      Email: 'email',
      Birthdate: 'birthdate',
      Category: 'category',
      Gender: 'gender',
      'Year of Admission': 'year_of_admission',
      Program: 'program',
      'Department/Stream': 'department_stream',
      'Course Peference 1': 'preference_1',
      'Course Preference 2': 'preference_2',
      'Course Preference 3': 'preference_3',
      'HSC Marks': 'marks_hsc',
      'Total Marks': 'total_marks',
      Percentage: 'percentage',
      'Assigned Free Course': 'course_name',
    });
    return ok({ message: 'Success', institutes, students });
  });

/** GET /api/getUsersExcel?role_id=3|4|6|'' — PHP switch (loose ==) semantics. */
export const getUsersExcel = (req, { role_id }) =>
  legacyRun(async () => {
    await adminGuard(req);
    const u = table('users');
    if (looseEq(role_id, '3')) {
      const RegisteredUsers = await db(u)
        .select({ 'Student Name': 'username', Email: 'email', 'Mobile Number': 'phone', Status: `${u}.status` })
        .where(`${u}.role_id`, role_id);
      return ok({ message: 'Success', RegisteredUsers });
    }
    if (looseEq(role_id, '4')) {
      const pd = table('product_details');
      const RegisteredUsers = await db(u)
        .join(pd, `${u}.application_number`, '=', `${pd}.neat_id`)
        .select({ 'Company Name': `${pd}.company_name`, 'Product Name': `${pd}.course_name`, Email: `${u}.email`, 'Mobile Number': `${u}.phone`, Status: `${u}.status` })
        .where(`${u}.role_id`, role_id);
      return ok({ message: 'Success', RegisteredUsers });
    }
    if (looseEq(role_id, '6')) {
      const l = table('learner');
      const RegisteredUsers = await db(u)
        .join(l, `${l}.application_number`, '=', `${u}.application_number`)
        .select({
          'Learner Name': `${u}.username`, Email: `${u}.email`, 'Mobile Number': `${u}.phone`, Profession: `${l}.profession`,
          'Date of Birth': `${l}.date_of_birth`, Gender: `${l}.gender`, Age: `${l}.age`, Status: `${u}.status`,
        })
        .where(`${u}.role_id`, role_id)
        .where(`${l}.isDetailsSubmitted`, 'Yes');
      return ok({ message: 'Success', RegisteredUsers });
    }
    if (looseEq(role_id, '')) {
      const a = table('student_free_seat_allocations');
      const s = table('student');
      const FreeSeatAllocation = await db(a)
        .join(s, `${a}.student_email`, '=', `${s}.email`)
        .select({ 'Student Name': `${s}.name`, 'Mobile Number': `${s}.mobile`, 'Student Email': `${a}.student_email`, 'Course ID': `${a}.course_id` });
      return ok({ message: 'Success', FreeSeatAllocation });
    }
    return { status: 200, empty: true }; // no matching case: the action returns nothing
  });
