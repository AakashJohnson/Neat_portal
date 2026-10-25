import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '../../src/database/knex.js';
import { hashPassword } from '../../src/services/auth/authService.js';
import { issueToken } from '../../src/services/auth/jwtService.js';
import { nowSql } from '../../src/utils/time.js';

export async function createRecoveredFixtures() {
  if (process.env.DB_DATABASE !== 'neat_portal_test') throw new Error('Recovered-flow fixtures require neat_portal_test.');
  const f = { marker: `rf${randomBytes(5).toString('hex')}`, password: 'Recovered#Test1', users: {}, tokens: {}, codes: [], applications: [] };
  f.cleanup = async () => {
    if (f.codes.length) {
      await db('student_free_seat_allocations').whereIn('course_id', f.codes).delete();
      await db('product_purchased_audit').whereIn('code', f.codes).delete();
      await db('cart').whereIn('code', f.codes).delete();
      await db('free_seat_code').whereIn('product_code', f.codes).delete();
      await db('product_details').whereIn('code', f.codes).delete();
      await db('product').whereIn('code', f.codes).delete();
    }
    if (f.applications.length) await db('student').whereIn('application_number', f.applications).delete();
    const ids = Object.values(f.users).map(u => u.id);
    const apps = Object.values(f.users).map(u => u.application_number);
    if (apps.length) {
      for (const name of ['learner', 'student_details', 'institute_details']) await db(name).whereIn('application_number', apps).delete();
      await db('student').whereIn('permanent_institute_id', apps).delete();
    }
    if (ids.length) {
      await db('api_tokens').whereIn('user_id', ids).delete();
      await db('user_activity').whereIn('user_id', ids).delete();
      await db('users').whereIn('id', ids).delete();
    }
  };
  try {
    const password = await hashPassword(f.password);
    for (const [name, role_id] of Object.entries({ admin: 1, company: 4, other: 4, student: 3, learner: 6, institute: 5 })) {
      const row = { email: `${f.marker}-${name}@example.invalid`, username: `${f.marker}-${name}`, password, role_id, application_number: `${f.marker}-${name}`,
        phone: '9000000000', status: 'Active', email_verified_at: nowSql(), unique_uuid: randomUUID() };
      if (role_id === 5) row.permanent_institute_id = row.application_number;
      const [id] = await db('users').insert(row);
      f.users[name] = { ...row, id };
      f.tokens[name] = await issueToken(f.users[name], { issuer: 'http://localhost:4101/api/login' });
    }
    for (const [name, seats, owner] of [['bulk', 8, 'company'], ['manual', 2, 'company'], ['rollback', 1, 'company'], ['foreign', 1, 'other']]) {
      const code = `${f.marker}-${name}`;
      f.codes.push(code);
      f[name] = code;
      await db('product').insert({ code, name: code, neat_id: f.users[owner].application_number, email: f.users[owner].email, product_active: 'Yes' });
      await db('product_details').insert({
        code, application_number: f.users[owner].application_number, neat_id: f.users[owner].application_number,
        course_name: code, company_name: f.marker, price: 100, payment_link: 'https://payments.example.invalid/checkout', neat_course_id: 'None',
        view_counter: 0, product_type: 'B2C', product_active: 'Approved', isDetailsSubmitted: 'Yes',
        availableFreeCourses: seats, registeredFreeCourses: 0, providedFreeCourses: seats, stream: code,
      });
      if (name !== 'rollback') await db('free_seat_code').insert({ product_code: code, company_code: f.users[owner].application_number, neat_secret_code: randomUUID(), company_secret_code: randomUUID() });
    }
    f.nominate = async (name, stream, category, percentage, user = null) => {
      const application_number = user?.application_number ?? `${f.marker}-${name}`;
      f.applications.push(application_number);
      const [id] = await db('student').insert({
        application_number, name, email: user?.email ?? `${f.marker}-${name}@example.invalid`,
        mobile: `${f.marker}-${name}`, birthdate: '2003-01-01', admission_registration_number: `${f.marker}-${name}`,
        category, gender: 'Female', year_of_admission: '2023', department_stream: stream,
        institute_name: f.marker, state: 'Delhi', aicte_code: f.marker, permanent_institute_id: f.marker,
        percentage: String(percentage), isEligibleFreeCourse: 0, is_rule_engine_processed: 0,
      });
      return { id, application_number };
    };
    await f.nominate('manual-student', f.manual, 'General (Gen)', 95, f.users.student);
    f.rollbackStudent = await f.nominate('rollback-student', f.rollback, 'General (Gen)', 90);
    for (const [prefix, category, count] of [
      ['gen', 'General (Gen)', 6], ['obc', 'Other Backward Classes (OBC)', 3], ['sc', 'Scheduled Caste (SC)', 2], ['st', 'Scheduled Tribe (ST)', 2],
    ]) {
      for (let i = 0; i < count; i++) await f.nominate(`${prefix}-${i}`, f.bulk, category, 100 - i * 10);
    }
    return f;
  } catch (err) {
    await f.cleanup();
    throw err;
  }
}
