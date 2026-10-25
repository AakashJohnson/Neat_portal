import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callNode } from '../helpers/contract.js';
import { createRecoveredFixtures } from '../helpers/recoveredFixtures.js';
import { db } from '../../src/database/knex.js';

let f;
beforeAll(async () => { f = await createRecoveredFixtures(); });
afterAll(async () => { await f?.cleanup(); });
const call = (method, endpoint, role, body) => callNode(method, `/api/${endpoint}`, { query: { token: f.tokens[role] }, body });
const profile = () => ({
  institute_name: f.marker, institute_email: `${f.marker}-office@example.invalid`,
  institute_address: 'Test address', institute_aishe_code: 'C-TEST', institute_state: 'Delhi',
  institute_neat_coordinator: 'Coordinator', institute_contact_person_email: `${f.marker}-contact@example.invalid`,
  institute_mobile: '9887766554', institute_landline: '01112345678', institute_students_number: '42',
});
const nomination = (id, extra = {}) => ({
  'Name of Beneficiary': `Nominee ${id}`, 'Father\u2019s Name': 'Test Father',
  'Valid Mobile Number': `97766554${String(id).padStart(2, '0')}`,
  'Valid Email': `${f.marker}-nominee${id}@example.com`, 'Date of Birth': '1/2/2003',
  'Admission/ Registration number': `ADM-${id}`, Programs: 'Graduate',
  'Department/ Stream': 'Computer Science', Category: 'General (Gen)', Gender: 'Female',
  'Year of Admission': '2023', 'Name of Institution': f.marker, 'State/ UT': 'Delhi',
  'AICTE Code': 'C-TEST', 'Free Seat Preference 1': f.bulk, 'Free Seat Preference 2': f.manual,
  'Free Seat Preference 3': f.foreign, 'Marks secured in Class 12th': '450', 'Total Marks': '500', Percentage: '90',
  ...extra,
});

describe('profile persistence independent of Laravel reference', () => {
  it('opens a fresh institute profile without an undefined-offset error', async () => {
    expect((await call('GET', 'getInstituteDetails', 'institute')).body).toMatchObject({ message: 'Success', institute_details_updated: 'No' });
  });
  it('saves every institute field and retrieves by account rather than submitted contact email', async () => {
    expect((await call('POST', 'submitInstituteDetails', 'institute', profile())).body).toEqual({ message: 'Success' });
    const result = (await call('GET', 'getInstituteDetails', 'institute')).body;
    expect(result.institute_details[0]).toMatchObject({ ...profile(), application_number: f.users.institute.application_number });
  });
  it('preserves institute details on edit and updates the same row without duplicates', async () => {
    const where = { application_number: f.users.institute.application_number };
    const before = await db('institute_details').where(where).first();
    await call('GET', 'editInstituteDetails', 'institute');
    expect(await db('institute_details').where(where).first()).toEqual(before);
    const responses = await Promise.all([1, 2].map(() => call('POST', 'submitInstituteDetails', 'institute', { ...profile(), institute_address: 'Updated address' })));
    expect(responses.every(r => r.body.message === 'Success')).toBe(true);
    expect(await db('institute_details').where(where)).toHaveLength(1);
    expect(await db('institute_details').where(where).first()).toMatchObject({ id: before.id, institute_address: 'Updated address' });
  });
  it('rejects invalid institute updates without altering existing details', async () => {
    const where = { application_number: f.users.institute.application_number };
    const before = await db('institute_details').where(where).first();
    expect((await call('POST', 'submitInstituteDetails', 'institute', { ...profile(), institute_name: '' })).body.message).toBe('Error');
    expect(await db('institute_details').where(where).first()).toEqual(before);
  });
  it('creates missing historical learner profiles and saves required fields, never false success', async () => {
    const values = { date_of_birth: '2-1-2000', age: '26', gender: 'Female', profession: 'Engineer' };
    expect((await call('POST', 'submitLearnerDetails', 'learner', values)).body.message).toBe('Success');
    expect(await db('learner').where('application_number', f.users.learner.application_number).first()).toMatchObject({
      ...values, age: 26, email: f.users.learner.email, name: f.users.learner.username, phone: f.users.learner.phone, isDetailsSubmitted: 'Yes',
    });
    expect((await call('POST', 'submitLearnerDetails', 'learner', { ...values, profession: '' })).body.message).toBe('Error');
    expect((await call('POST', 'submitLearnerDetails', 'learner', { ...values, age: '-1' })).body.message).toBe('Error');
  });
});

describe('institute nomination template', () => {
  it('accepts the downloadable template without hidden Application Number or Courses columns', async () => {
    const result = await call('POST', 'ecxelUpload', 'institute', [nomination(1)]);
    expect(result.body).toMatchObject({ message: 'Success' });
    const row = await db('student').where('email', nomination(1)['Valid Email']).first();
    expect(row).toMatchObject({
      father_name: 'Test Father', aicte_code: 'C-TEST', percentage: '90',
      preference_1: f.bulk, preference_2: f.manual, preference_3: f.foreign,
      permanent_institute_id: f.users.institute.permanent_institute_id,
    });
    expect(row.application_number).toMatch(/^\d{10}$/);
    expect((await call('POST', 'getStudents', 'institute', {})).body.students.map(s => s.id)).toContain(row.id);
  });
  it('validates later rows and rolls back the whole batch', async () => {
    const rows = [nomination(2), nomination(3, { Programs: 'Invalid' })];
    expect((await call('POST', 'ecxelUpload', 'institute', rows)).body.message).toBe('Error');
    expect(await db('student').whereIn('email', rows.map(r => r['Valid Email']))).toHaveLength(0);
  });
  it('rejects empty and duplicate nominations without extra records', async () => {
    expect((await call('POST', 'ecxelUpload', 'institute', [])).body.message).toBe('Error');
    expect((await call('POST', 'ecxelUpload', 'institute', [nomination(1)])).body.message).toBe('Error');
    expect(await db('student').where('email', nomination(1)['Valid Email'])).toHaveLength(1);
  });
});
