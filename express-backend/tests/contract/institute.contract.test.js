// INS-01..07 — parity with Laravel Api\InstituteController.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { callLaravel, callNode, laravelAvailable, fixtureToken } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';
import { DB_ERROR_REASON } from '../../src/services/legacyErrors.js';

let reference;
let inst;
let student;
let detailsSnapshot;

beforeAll(async () => {
  reference = await laravelAvailable();
  inst = await db('users').where('id', 56).first('email', 'permanent_institute_id', 'application_number');
  student = await db('users').where('id', 13).first('email');
  detailsSnapshot = await db('institute_details').where('institute_email', inst.email);
});

afterAll(async () => {
  // Restore institute_details for the fixture institute and remove test students.
  await db('institute_details').where('institute_email', inst.email).delete();
  if (detailsSnapshot.length) await db('institute_details').insert(detailsSnapshot);
  await db('student').where('email', 'like', '%@contract.invalid').delete();
  await db('institute_details').where('institute_contact_person_email', 'contract@contract.invalid').delete();
});

const both = (method, path, opts) => Promise.all([callLaravel(method, path, opts), callNode(method, path, opts)]);
async function as(email, method, path, opts = {}) {
  const lt = await fixtureToken(callLaravel, email);
  const nt = await fixtureToken(callNode, email);
  return [
    await callLaravel(method, path, { ...opts, query: { ...(opts.query ?? {}), token: lt } }),
    await callNode(method, path, { ...opts, query: { ...(opts.query ?? {}), token: nt } }),
  ];
}
// Laravel sometimes echo()'s a PHP error before the JSON (DEV-06): compare the JSON part.
const jsonPart = (b) => (typeof b === 'string' && b.includes('{') ? JSON.parse(b.slice(b.indexOf('{'))) : b);
const same = ([l, n]) => {
  expect(n.status).toBe(l.status);
  const lb = jsonPart(l.body);
  if (typeof lb?.reason === 'string' && lb.reason.startsWith('SQLSTATE')) {
    expect(n.body).toEqual({ message: 'Error', reason: DB_ERROR_REASON }); // DEV-01
  } else {
    expect(n.body).toEqual(lb);
  }
};

describe('INS read endpoints', () => {
  it('getInstituteDetails (institute, student without claim, no token)', async ({ skip }) => {
    if (!reference) skip();
    same(await as(inst.email, 'GET', '/api/getInstituteDetails'));
    same(await as(student.email, 'GET', '/api/getInstituteDetails'));
    same(await both('GET', '/api/getInstituteDetails'));
  });

  it('getStudents', async ({ skip }) => {
    if (!reference) skip();
    same(await as(inst.email, 'POST', '/api/getStudents'));
    same(await as(student.email, 'POST', '/api/getStudents'));
  });
});

describe('INS institute details', () => {
  it('submitInstituteDetails: invalid input and duplicate e-mail', async ({ skip }) => {
    if (!reference) skip();
    same(await as(inst.email, 'POST', '/api/submitInstituteDetails', { body: { institute_name: 'x' } }));
    const existing = await db('institute_details').first('institute_email', 'institute_mobile');
    const body = {
      institute_address: 'A', institute_contact_person_email: 'contract@contract.invalid', institute_email: existing.institute_email,
      institute_mobile: '9000000001', institute_name: 'N', institute_neat_coordinator: 'C', institute_state: 'Delhi', institute_students_number: '10',
    };
    same(await as(inst.email, 'POST', '/api/submitInstituteDetails', { body }));
  });

  it('editInstituteDetails then submitInstituteDetails stores an equivalent row', async ({ skip }) => {
    if (!reference) skip();
    same(await as(inst.email, 'GET', '/api/editInstituteDetails'));
    const body = {
      institute_address: 'Contract Address', institute_contact_person_email: 'contract@contract.invalid', institute_email: 'inst@contract.invalid',
      institute_mobile: '9000000002', institute_name: 'Contract Institute', institute_neat_coordinator: 'Coordinator', institute_state: 'Delhi',
      institute_students_number: '42', institute_aishe_code: 'C-1',
    };
    const lt = await fixtureToken(callLaravel, inst.email);
    const l = await callLaravel('POST', '/api/submitInstituteDetails', { query: { token: lt }, body });
    const lRow = await db('institute_details').where('institute_email', inst.email).first();
    await db('institute_details').where('institute_email', inst.email).delete();
    const nt = await fixtureToken(callNode, inst.email);
    const n = await callNode('POST', '/api/submitInstituteDetails', { query: { token: nt }, body });
    const nRow = await db('institute_details').where('institute_email', inst.email).first();
    expect(n.body).toEqual(l.body);
    const strip = ({ id, ...r }) => r;
    expect(strip(nRow)).toEqual(strip(lRow));
  });
});

describe('INS submitStudentDetailsFromInstitute', () => {
  const base = {
    name: 'Contract Student', father_name: 'F', mobile: '9100000001', email: 's1@contract.invalid', birthdate: '2002-02-02',
    admission_registration_number: 'AR', course_name: 'C', category: 'GEN', gender: 'Male', year_of_admission: '2021', program: 'Graduate',
  };

  it('invalid input / application number for a new student', async ({ skip }) => {
    if (!reference) skip();
    same(await as(inst.email, 'POST', '/api/submitStudentDetailsFromInstitute', { body: { name: 'x' } }));
    same(await as(inst.email, 'POST', '/api/submitStudentDetailsFromInstitute', { body: { ...base, application_number: 'NOT-EXISTING' } }));
  });

  it('new student insert (fails in the original: R-21)', async ({ skip }) => {
    if (!reference) skip();
    const lt = await fixtureToken(callLaravel, inst.email);
    const l = await callLaravel('POST', '/api/submitStudentDetailsFromInstitute', { query: { token: lt }, body: base });
    const lRow = await db('student').where('email', base.email).first();
    await db('student').where('email', base.email).delete();
    const nt = await fixtureToken(callNode, inst.email);
    const n = await callNode('POST', '/api/submitStudentDetailsFromInstitute', { query: { token: nt }, body: base });
    const nRow = await db('student').where('email', base.email).first();
    same([l, n]);
    // R-21: the original insert omits institute_name (NOT NULL, no default), so it always fails.
    expect(lRow).toBeUndefined();
    expect(nRow).toBeUndefined();
  });

  it('update of an existing student of the institute', async ({ skip }) => {
    if (!reference) skip();
    const existing = await db('student').where('permanent_institute_id', inst.permanent_institute_id).whereNotNull('application_number').first();
    if (!existing) skip();
    const snapshot = { ...existing };
    const upd = { ...base, email: existing.email, mobile: existing.mobile, application_number: existing.application_number, name: `${existing.name}` };
    // Laravel updates first (Success or "Data not Updated." when nothing changes) — Node then sees identical data.
    const [l, n] = await as(inst.email, 'POST', '/api/submitStudentDetailsFromInstitute', { body: upd });
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual({ message: 'Error', reason: 'Data not Updated.' }); // second identical update changes nothing
    expect(['Success', 'Error']).toContain(l.body.message);
    await db('student').where('id', existing.id).update(snapshot);
  });
});

describe('INS Excel uploads', () => {
  const row = (i, extra = {}) => ({
    'Name of Beneficiary': `Excel Student ${i}`, 'Father Name': 'F', 'Father’s Name': 'F', 'Valid Mobile Number': `92000000${String(i).padStart(2, '0')}`,
    'Valid Email': `x${i}@contract.invalid`, 'Date of Birth': '1/15/2004', 'Admission/ Registration number': `AR${i}`, Programs: 'Graduate',
    Category: 'GEN', 'Department/ Stream': 'Engineering', Gender: 'Female', 'Year of Admission': '2022', 'Application Number': `APPX${i}`,
    'State/ UT': 'Delhi', 'Marks secured in Class 12th': '400', 'Total Marks': '500', Percentage: '80', Courses: 'Course',
    'Course Name': 'Course', 'Name of Institution': 'Inst', 'State of Institution': 'Delhi', 'AICTE Code': 'C-1', ...extra,
  });

  const cleanup = () => db('student').where('email', 'like', 'x%@contract.invalid').delete();

  for (const path of ['/api/ecxelUpload', '/api/uploadExcelPaid']) {
    it(`${path}: validation failures (age, program, unparsable date, empty)`, async ({ skip }) => {
      if (!reference) skip();
      for (const body of [
        [row(1, { 'Date of Birth': '1/15/1980' })],
        [row(1, { Programs: 'PhD' })],
        [row(1, { 'Date of Birth': '15/01/2004' })],
        [row(1, { 'Date of Birth': '' })],
        [],
      ]) {
        same(await as(inst.email, 'POST', path, { body }));
      }
    });

    it(`${path}: valid rows are inserted; a bad later row rolls back the batch`, async ({ skip }) => {
      if (!reference) skip();
      await cleanup();
      const good = [row(1), row(2)];
      const lt = await fixtureToken(callLaravel, inst.email);
      const l = await callLaravel('POST', path, { query: { token: lt }, body: good });
      const lRows = await db('student').where('email', 'like', 'x%@contract.invalid').orderBy('email');
      await cleanup();
      const nt = await fixtureToken(callNode, inst.email);
      const n = await callNode('POST', path, { query: { token: nt }, body: good });
      const nRows = await db('student').where('email', 'like', 'x%@contract.invalid').orderBy('email');
      same([l, n]);
      const strip = ({ id, application_number, ...r }) => r;
      expect(nRows.map(strip)).toEqual(lRows.map(strip));
      await cleanup();

      // Second row lacks a column → the first insert is deleted again.
      const bad = [row(3), (() => { const r = row(4); delete r['Valid Email']; return r; })()];
      const [lb, nb] = await as(inst.email, 'POST', path, { body: bad });
      same([lb, nb]);
      expect(await db('student').where('email', 'like', 'x%@contract.invalid').count({ n: '*' })).toEqual([{ n: 0 }]);
    });
  }
});
