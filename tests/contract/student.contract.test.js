// STU-01..18 — parity with Laravel Api\StudentController.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import { capturedMail, clearCapturedMail } from '../../src/integrations/mail/mailer.js';
import { SECRET_USER_COLUMNS } from '../../src/repositories/userRepository.js';

let reference;
const users = {};
beforeAll(async () => {
  reference = await laravelAvailable();
  for (const [role, id] of Object.entries({ admin: 1, student: 13, institute: 56, learner: 72 })) {
    users[role] = await db('users').where('id', id).first('id', 'email', 'application_number', 'permanent_institute_id');
  }
});

const both = (method, path, opts) => Promise.all([callLaravel(method, path, opts), callNode(method, path, opts)]);
async function asUser(role, method, path, opts = {}) {
  const lt = await fixtureToken(callLaravel, users[role].email);
  const nt = await fixtureToken(callNode, users[role].email);
  const l = await callLaravel(method, path, { ...opts, query: { ...(opts.query ?? {}), token: lt } });
  const n = await callNode(method, path, { ...opts, query: { ...(opts.query ?? {}), token: nt } });
  return [l, n];
}
const expectSame = ([l, n]) => {
  expect(n.status).toBe(l.status);
  expect(n.body).toEqual(l.body);
};

describe('STU public endpoints', () => {
  it('getFaqs / getFaqsHindi', async ({ skip }) => {
    if (!reference) skip();
    for (const path of ['/api/getFaqs', '/api/getFaqsHindi']) {
      for (const body of [{ role: 'student' }, { role: 'company' }, {}]) expectSame(await both('POST', path, { body }));
    }
  });

  it('getStates', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await both('GET', '/api/getStates'));
  });

  it('checkStudentExists (registered, unknown, missing)', async ({ skip }) => {
    if (!reference) skip();
    for (const body of [{ student_email: users.student.email }, { student_email: 'nobody@example.invalid' }, {}]) {
      expectSame(await both('POST', '/api/checkStudentExists', { body }));
    }
  });

  it('getPurchasedProducts / getFreeProducts / getAppliedProducts (legacy public mode)', async ({ skip }) => {
    if (!reference) skip();
    const buyer = await db('product_purchased_audit').where('status', 'Payment Successful').first('application_number');
    for (const path of ['/api/getPurchasedProducts', '/api/getFreeProducts', '/api/getAppliedProducts']) {
      for (const body of [{ application_number: buyer.application_number }, { application_number: users.student.application_number }, {}]) {
        expectSame(await both('POST', path, { body }));
      }
    }
  });
});

describe('STU student flows', () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await db('student_details').where('application_number', users.student.application_number).first();
  });
  afterAll(async () => {
    if (snapshot) await db('student_details').where('application_number', users.student.application_number).update(snapshot);
  });

  it('getStudentDetails (student with details, admin without → Undefined offset)', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await asUser('student', 'GET', '/api/getStudentDetails'));
    expectSame(await asUser('admin', 'GET', '/api/getStudentDetails'));
    expectSame(await both('GET', '/api/getStudentDetails'));
  });

  it('submitStudentDetails (invalid input, then a valid update)', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await asUser('student', 'POST', '/api/submitStudentDetails', { body: { father_name: 'x' } }));
    const body = {
      father_name: 'Contract Father', date_of_birth: '2000-01-01', residential_address: 'Addr', state: 'Delhi', category: 'GEN', gender: 'Male',
      college_state: 'Delhi', college_name: 'Contract College', year_of_admission: '2020', identity_number: 'ID1', admission_registration_number: 'AR1',
      stream_of_education: 'Engineering', academic_record: '80',
    };
    const [l, n] = await asUser('student', 'POST', '/api/submitStudentDetails', { body });
    expectSame([l, n]);
    const row = await db('student_details').where('application_number', users.student.application_number).first();
    expect(row).toMatchObject({ father_name: 'Contract Father', college_name: 'Contract College', isDetailsSubmitted: 'Yes' });
  });

  it('editStudentDetails re-opens the form', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await asUser('student', 'GET', '/api/editStudentDetails'));
    const row = await db('student_details').where('application_number', users.student.application_number).first('isDetailsSubmitted');
    expect(row.isDetailsSubmitted).toBe('No');
  });

  it('getCollegeNames (state, unknown state, no token)', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await asUser('student', 'POST', '/api/getCollegeNames', { body: { college_state: 'Delhi' } }));
    expectSame(await asUser('student', 'POST', '/api/getCollegeNames', { body: { college_state: 'Atlantis' } }));
    expectSame(await both('POST', '/api/getCollegeNames', { body: { college_state: 'Delhi' } }));
  });
});

describe('STU free-seat codes', () => {
  it('checkStudentSecretCode (wrong user, not eligible, no token)', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await asUser('student', 'POST', '/api/checkStudentSecretCode', { body: { application_number: 'someone-else', product_id: 'P', neat_secret_code: 'S' } }));
    expectSame(await asUser('student', 'POST', '/api/checkStudentSecretCode', { body: { application_number: users.student.application_number, product_id: 'P', neat_secret_code: 'S' } }));
    expectSame(await both('POST', '/api/checkStudentSecretCode', { body: {} }));
  });

  it('checkCompanySecretCode (invalid code)', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await asUser('student', 'POST', '/api/checkCompanySecretCode', { body: { company_secret_code: 'nope', course_id: 'P' } }));
  });

  it('sendFreeSeatVerificationMail sends FreeSeatVerification to the token e-mail', async ({ skip }) => {
    if (!reference) skip();
    clearCapturedMail();
    const code = (await db('free_seat_code').first('product_code', 'company_secret_code'));
    expectSame(await asUser('student', 'POST', '/api/sendFreeSeatVerificationMail', { body: { code: code.product_code } }));
    const mail = capturedMail().at(-1);
    expect(mail).toMatchObject({ mailable: 'FreeSeatVerification', to: users.student.email, subject: 'Free Seat Verification' });
    expect(mail.html).toContain(code.company_secret_code);
  });
});

describe('STU learner flows', () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await db('learner').where('application_number', users.learner.application_number).first();
  });
  afterAll(async () => {
    await db('learner').where('application_number', users.learner.application_number).update(snapshot);
  });

  it('getLearnerDetails (learner present)', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await asUser('learner', 'GET', '/api/getLearnerDetails'));
  });

  it('getLearnerDetails without a learner row returns the users row minus secrets (DEV-05)', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await asUser('student', 'GET', '/api/getLearnerDetails');
    expect(l.body.learner_present).toBe('No');
    expect(l.body.learner_details.password).toMatch(/^\$2y\$/); // the original leaks the hash
    for (const col of SECRET_USER_COLUMNS) expect(n.body.learner_details).not.toHaveProperty(col);
    const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !SECRET_USER_COLUMNS.includes(k) && !['unique_uuid', 'last_login', 'updated_at'].includes(k)));
    expect(strip(n.body.learner_details)).toEqual(strip(l.body.learner_details));
  });

  it('submitLearnerDetails (invalid, valid) and editLearnerDetails', async ({ skip }) => {
    if (!reference) skip();
    expectSame(await asUser('learner', 'POST', '/api/submitLearnerDetails', { body: { age: '20' } }));
    expectSame(await asUser('learner', 'POST', '/api/submitLearnerDetails', { body: { date_of_birth: '1999-09-09', age: '27', gender: 'Female', profession: 'Tester' } }));
    expect(await db('learner').where('application_number', users.learner.application_number).first('age', 'isDetailsSubmitted')).toEqual({ age: 27, isDetailsSubmitted: 'Yes' });
    expectSame(await asUser('learner', 'GET', '/api/editLearnerDetails'));
  });
});

describe('STU checkFileUpload', () => {
  it('institute with students / student without claim / no token', async ({ skip }) => {
    if (!reference) skip();
    const [l, n] = await asUser('institute', 'GET', '/api/checkFileUpload');
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
    // Uncaught exceptions: same 500 status; message without the PHP line suffix (DEV-04).
    for (const [lr, nr] of [await asUser('student', 'GET', '/api/checkFileUpload'), await both('GET', '/api/checkFileUpload')]) {
      expect(nr.status).toBe(lr.status);
      expect(lr.body.message).toMatch(/ Line: \d+$/);
    }
  });
});
