import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const select = async (page, label, option) => {
  await page.locator(`mat-select[aria-label="${label}"]`).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};
const submit = async (page, endpoint) => {
  const pending = page.waitForResponse(r => r.url().includes(`/bff/${endpoint}`) && r.request().method() === 'POST');
  await page.locator('button[type=submit]').click();
  const response = await pending.catch(async error => {
    console.error('Visible validation:', await page.locator('mat-error, .toast-message').allTextContents());
    console.error('Profile fields:', await page.locator('form input').evaluateAll(inputs => inputs.map(i => ({ name: i.name, value: i.value }))));
    throw error;
  });
  assert.equal(response.status(), 200);
  assert.equal((await response.json()).message, 'Success');
};
const matches = (row, fields) => {
  assert.ok(row, 'Profile row must exist');
  for (const [key, value] of Object.entries(fields)) assert.equal(String(row[key]), String(value), `Persisted ${key}`);
};

export async function checkProfile({ page, base, db, role, user, marker }) {
  if (role === 'Student') {
    await page.goto(`${base}/student/profile`);
    await expect(page.getByRole('cell', { name: user.email, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const fields = {
      father_name: 'Acceptance Father', residential_address: 'Acceptance Address',
      identity_number: 'TEST-ID-123', admission_registration_number: 'ADM-PROFILE',
      stream_of_education: 'Computer Science', academic_record: '85',
    };
    for (const [key, value] of Object.entries(fields)) await page.locator(`input[name="${key}"]`).fill(value);
    await page.getByPlaceholder('Date of Birth', { exact: true }).fill('01/02/2003');
    for (const [label, option] of [
      ['Gender', 'Female'], ['State', 'Delhi'], ['Category', 'General (Gen)'],
      ['College state', 'Delhi'], ['College Name', 'Other'], ['Year of Admission', '2023'],
    ]) await select(page, label, option);
    await page.getByPlaceholder('Enter College Name', { exact: true }).fill(marker);
    await submit(page, 'submitStudentDetails');
    matches(await db('student_details').where('application_number', user.application_number).first(), {
      ...fields, date_of_birth: '2-1-2003', gender: 'Female', state: 'Delhi',
      category: 'General', college_state: 'Delhi', college_name: marker,
      year_of_admission: '2023', isDetailsSubmitted: 'Yes', email: user.email, contact_number: user.phone,
    });
    await page.reload();
    await expect(page.getByRole('cell', { name: fields.residential_address, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.locator('input[name="residential_address"]').fill('Must not be saved');
    await page.route('**/bff/submitStudentDetails*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Error', reason: 'Profile update rejected' }),
    }));
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('Profile update rejected', { exact: true })).toBeVisible();
    await expect(page.locator('button[type=submit]')).toBeVisible();
    await page.unroute('**/bff/submitStudentDetails*');
    await submit(page, 'submitStudentDetails');
    matches(await db('student_details').where('application_number', user.application_number).first(), { residential_address: 'Must not be saved' });
  }

  if (role === 'Institute') {
    await page.goto(`${base}/institute/institute-details`);
    const fields = {
      institute_name: marker, institute_aishe_code: 'C-ACCEPTANCE',
      institute_email: `${marker}-office@example.com`, institute_address: 'Institute Address',
      institute_neat_coordinator: 'Test Coordinator', institute_mobile: user.phone,
      institute_landline: '01123456789', institute_students_number: '42',
      institute_contact_person_email: `${marker}-coordinator@example.com`,
    };
    const placeholders = {
      institute_name: 'Name of Institution', institute_aishe_code: 'AICTE/AISHE Code',
      institute_email: 'Email', institute_address: 'Address', institute_neat_coordinator: 'NEAT Coordinator',
      institute_mobile: 'Mobile Number (to be valid)', institute_landline: 'Landline Number',
      institute_students_number: 'No. of Students', institute_contact_person_email: 'Email of NEAT Coordinator',
    };
    for (const [key, value] of Object.entries(fields)) await page.getByPlaceholder(placeholders[key], { exact: true }).fill(value);
    await select(page, 'State', 'Delhi');
    await submit(page, 'submitInstituteDetails');
    const row = await db('institute_details').where('application_number', user.application_number).first();
    matches(row, { ...fields, institute_state: 'Delhi', permanent_institute_id: user.permanent_institute_id });
    await page.reload();
    await expect(page.getByRole('cell', { name: fields.institute_email, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByPlaceholder('Address', { exact: true })).toHaveValue(fields.institute_address);
    assert.equal((await db('institute_details').where('id', row.id).first()).institute_address, fields.institute_address, 'Opening Edit must not delete saved details');
    await page.getByPlaceholder('Address', { exact: true }).fill('Updated Institute Address');
    await submit(page, 'submitInstituteDetails');
    matches(await db('institute_details').where('id', row.id).first(), { institute_address: 'Updated Institute Address' });
    assert.equal(Number((await db('institute_details').where('application_number', user.application_number).count({ n: '*' }))[0].n), 1);
    await page.goto(`${base}/institute/file-upload`);
    await expect(page.getByRole('button', { name: 'Upload', exact: true })).toBeDisabled();
    const nominee = {
      'Name of Beneficiary': `${marker}-nominee`, 'Father\u2019s Name': 'Nominee Father',
      'Valid Mobile Number': user.phone, 'Valid Email': `${marker}-nominee@example.com`,
      'Date of Birth': '1/2/2003', 'Admission/ Registration number': 'ADM-UPLOAD', Programs: 'Graduate',
      'Department/ Stream': 'Computer Science', Category: 'General (Gen)', Gender: 'Female',
      'Year of Admission': '2023', 'Name of Institution': marker, 'State/ UT': 'Delhi', 'AICTE Code': 'C-ACCEPTANCE',
      'Free Seat Preference 1': 'Course One', 'Free Seat Preference 2': 'Course Two', 'Free Seat Preference 3': 'Course Three',
      'Marks secured in Class 12th': '450', 'Total Marks': '500', Percentage: '90',
    };
    const sample = XLSX.read(readFileSync(new URL('../public/assets/sample_excel.xlsx', import.meta.url)), { type: 'buffer' });
    const headers = XLSX.utils.sheet_to_json(sample.Sheets[sample.SheetNames[0]], { header: 1 })[0];
    assert.deepEqual(Object.keys(nominee), headers, 'Use precisely the downloadable template columns');
    const chooseWorkbook = async data => {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data, { header: headers }), 'Nominations');
      await page.locator('input[type=file]').setInputFiles({
        name: 'nominations.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }),
      });
      await expect(page.getByRole('status')).toContainText('1 student nomination(s) ready');
    };
    await chooseWorkbook([{ ...nominee, Programs: 'Invalid' }]);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('invalid');
    assert.equal(await db('student').where('email', nominee['Valid Email']).first(), undefined);
    await chooseWorkbook([nominee]);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page).toHaveURL(`${base}/institute`);
    const saved = await db('student').where('email', nominee['Valid Email']).first();
    matches(saved, {
      name: nominee['Name of Beneficiary'], father_name: 'Nominee Father', mobile: user.phone,
      email: nominee['Valid Email'], birthdate: '1/2/2003', admission_registration_number: 'ADM-UPLOAD',
      program: 'Graduate', department_stream: 'Computer Science', category: 'General (Gen)', gender: 'Female',
      year_of_admission: '2023', institute_name: marker, state: 'Delhi', aicte_code: 'C-ACCEPTANCE',
      preference_1: 'Course One', preference_2: 'Course Two', preference_3: 'Course Three',
      marks_hsc: '450', total_marks: '500', percentage: '90', permanent_institute_id: user.permanent_institute_id,
    });
    assert.match(saved.application_number, /^\d{10}$/);
    await page.goto(`${base}/institute/student-details`);
    await expect(page.getByRole('gridcell', { name: nominee['Name of Beneficiary'], exact: true })).toBeVisible();
    console.log('PASS Institute: actual Excel template -> invalid batch rejected -> replacement batch -> all SQL fields -> student list');
  }

  if (role === 'Learner') {
    await page.goto(`${base}/learner`);
    await expect(page.locator('mat-label').filter({ hasText: user.email })).toBeVisible();
    await page.getByPlaceholder('Choose a date', { exact: true }).fill('01/02/2000');
    await page.locator('mat-radio-button').filter({ hasText: 'Female' }).locator('label').click();
    await page.getByPlaceholder('Age', { exact: true }).fill('26');
    await page.getByPlaceholder('Profession', { exact: true }).fill('Acceptance Engineer');
    await page.route('**/bff/submitLearnerDetails*', route => route.fulfill({
      status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Profile service unavailable' }),
    }));
    const rejected = page.waitForResponse(r => r.url().includes('/bff/submitLearnerDetails'));
    await page.locator('button[type=submit]').click();
    assert.equal((await rejected).status(), 500);
    await expect(page.getByText('Profile service unavailable', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Profession', { exact: true })).toHaveValue('Acceptance Engineer');
    await page.unroute('**/bff/submitLearnerDetails*');
    await submit(page, 'submitLearnerDetails');
    matches(await db('learner').where('application_number', user.application_number).first(), {
      date_of_birth: '2-1-2000', age: '26', gender: 'Female', profession: 'Acceptance Engineer', isDetailsSubmitted: 'Yes',
    });
    await page.reload();
    await expect(page.getByRole('cell', { name: 'Acceptance Engineer', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByPlaceholder('Profession', { exact: true })).toHaveValue('Acceptance Engineer');
    await page.getByPlaceholder('Profession', { exact: true }).fill('Updated Engineer');
    await submit(page, 'submitLearnerDetails');
    matches(await db('learner').where('application_number', user.application_number).first(), { profession: 'Updated Engineer' });
  }
  console.log(`PASS ${role}: full profile persistence -> reload -> edit -> resave`);
}
