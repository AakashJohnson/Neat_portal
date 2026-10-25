import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { callNode } from '../helpers/contract.js';
import { createRecoveredFixtures } from '../helpers/recoveredFixtures.js';
import { db } from '../../src/database/knex.js';
import { categoryQuotas } from '../../src/services/allocationService.js';
import * as mailer from '../../src/integrations/mail/mailer.js';

let f;
beforeAll(async () => { f = await createRecoveredFixtures(); });
afterAll(async () => { await f?.cleanup(); });
const call = (method, path, role, body = {}) => callNode(method, path, { body: method === 'GET' ? undefined : body, query: { ...(role ? { token: f.tokens[role] } : {}), ...(method === 'GET' ? body : {}) } });
const post = (path, role, body) => call('POST', path, role, body);

describe('recovered routes reject unauthenticated requests', () => {
  for (const [method, path] of [
    ['POST', '/api/getCounts'], ['POST', '/api/getProductFlags'], ['GET', '/api/getStudentTransactionIds'], ['GET', '/api/product-list'],
    ['GET', '/api/getStudentEligibility'], ['POST', '/api/submitTransactionId'], ['POST', '/api/sendFreeAllocationMail'],
    ['POST', '/api/applyForFreeCourse'], ['POST', '/api/assignFreeCourse'], ['POST', '/api/assignPaidCourse'],
    ['POST', '/api/addToCart'], ['POST', '/api/displayCart'], ['POST', '/api/displayPaidProducts'],
    ['POST', '/api/allocateseat'], ['GET', '/api/allocated-seat'], ['POST', '/api/paymentRedirect'],
  ]) it(`${method} ${path}`, async () => { expect((await call(method, path)).status).toBe(401); });
});

describe('company, cart and manual transaction flows', () => {
  it('returns only owned product counts and flags', async () => {
    expect((await post('/api/getCounts', 'company')).body).toEqual({ message: 'Success', products: 3, free_students: 0, paid_students: 0 });
    const list = await call('GET', '/api/product-list', 'company');
    expect(list.body.products).toHaveLength(3);
    expect(list.body.products.map(p => p[0])).not.toContain(f.foreign);
    expect((await post('/api/getProductFlags', 'company', { code: f.bulk })).body.flags).toMatchObject({ code: f.bulk, isDetailsSubmitted: 'Yes' });
    expect((await post('/api/getProductFlags', 'other', { code: f.bulk })).status).toBe(403);
    expect((await post('/api/getCounts', 'student')).status).toBe(403);
  });

  it('adds to the current user cart idempotently, ignoring spoofed account numbers', async () => {
    for (let i = 0; i < 2; i++) expect((await post('/api/addToCart', 'student', { product_id: f.bulk, application_number: f.users.learner.application_number })).status).toBe(200);
    expect(await db('cart').where({ code: f.bulk })).toHaveLength(1);
    expect((await post('/api/displayCart', 'student')).body.products[0].code).toBe(f.bulk);
    expect((await post('/api/displayCart', 'learner', { application_number: f.users.student.application_number })).body.products).toEqual([]);
    expect((await post('/api/addToCart', 'student', { product_id: 'missing' })).status).toBe(404);
  });

  it('starts checkout using server product pricing and rejects non-positive quantities', async () => {
    for (const quantity of [0, -1, 1.5]) expect((await post('/api/paymentRedirect', 'student', { product_id: f.bulk, quantity })).status).toBe(422);
    expect((await post('/api/paymentRedirect', 'student', { product_id: f.bulk, quantity: 1 })).status).toBe(200);
    const response = await post('/api/paymentRedirect', 'student', { product_id: f.bulk, quantity: 2, redirectUrl: 'fee=0' });
    expect(response.status).toBe(200);
    const url = new URL(response.body.payment_url);
    expect(url.origin).toBe('https://payments.example.invalid');
    expect(url.searchParams.get('fee')).toBe('200');
    expect(await db('product_purchased_audit').where({ code: f.bulk, application_number: f.users.student.application_number }).first()).toMatchObject({ quantity: 2, course_type: 'Paid' });
  });

  it('persists a transaction ID; only its company can approve it; repeated decisions are idempotent', async () => {
    const details = { code: f.bulk, transaction_id: `${f.marker}-transaction` };
    expect((await post('/api/submitTransactionId', 'learner', details)).status).toBe(404);
    expect((await post('/api/submitTransactionId', 'student', details)).status).toBe(200);
    const pending = await call('GET', '/api/getStudentTransactionIds', 'company');
    expect(pending.body.students).toHaveLength(1);
    expect(pending.body.students[0].transaction_id).toBe(details.transaction_id);
    expect((await call('GET', '/api/getStudentTransactionIds', 'other')).body.students).toEqual([]);
    const decision = { code: f.bulk, application_number: f.users.student.application_number, status: 'Approved' };
    expect((await post('/api/assignPaidCourse', 'other', decision)).status).toBe(403);
    expect((await post('/api/assignPaidCourse', 'company', decision)).status).toBe(200);
    expect((await post('/api/assignPaidCourse', 'company', decision)).status).toBe(200);
    expect((await post('/api/assignPaidCourse', 'company', { ...decision, status: 'Rejected' })).status).toBe(409);
    expect((await call('GET', '/api/getStudentTransactionIds', 'company')).body.students).toEqual([]);
    expect((await post('/api/displayPaidProducts', 'student')).body.products.map(p => p.code)).toContain(f.bulk);
    expect((await post('/api/getCounts', 'company')).body.paid_students).toBe(2);
    expect((await post('/api/submitTransactionId', 'student', details)).status).toBe(409);
  });
});

describe('transactional free-seat allocation', () => {
  it('preserves category percentages and exact stock totals, including small batches', () => {
    expect(categoryQuotas(8)).toEqual({ 'General (Gen)': 4, 'Other Backward Classes (OBC)': 2, 'Scheduled Caste (SC)': 1, 'Scheduled Tribe (ST)': 1 });
    for (let seats = 1; seats <= 200; seats++) {
      const quotas = Object.values(categoryQuotas(seats));
      expect(quotas.reduce((a, b) => a + b, 0)).toBe(seats);
      expect(quotas.every(n => Number.isInteger(n) && n >= 0)).toBe(true);
    }
  });

  it('accepts a nominated student application once and completes it through admin approval', async () => {
    for (let i = 0; i < 2; i++) expect((await post('/api/applyForFreeCourse', 'student', { code: f.manual })).status).toBe(200);
    expect(await db('product_purchased_audit').where({ code: f.manual })).toHaveLength(1);
    expect((await post('/api/assignFreeCourse', 'company', { application_number: f.users.student.application_number })).status).toBe(403);
    const response = await post('/api/assignFreeCourse', 'admin', { application_number: f.users.student.application_number });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ allocated: 1, email_delivery: { captured: 1, sent: 0, failed: 0 } });
    expect((await db('product_purchased_audit').where({ code: f.manual }).first()).status).toBe('Payment Successful');
    expect((await post('/api/assignFreeCourse', 'admin', { application_number: f.users.student.application_number, code: f.manual })).body.allocated).toBe(0);
    expect((await call('GET', '/api/getStudentEligibility', 'student')).body).toMatchObject({ nominated: true, isEligibleFreeCourse: true, allocations: [{ course_id: f.manual, is_course_availed: 'No' }] });
    expect((await post('/api/sendFreeAllocationMail', 'student', { code: f.manual })).status).toBe(503);
    expect(mailer.capturedMail().at(-1).mailable).toBe('FreeSeatAllocation');
  });

  it('locks stock, honors quotas, ranks percentages numerically and prevents concurrent over-allocation', async () => {
    const responses = await Promise.all([post('/api/allocateseat', 'admin', { course_id: f.bulk, collage_freeseat: 9999 }), post('/api/allocateseat', 'admin', { course_id: f.bulk })]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect(responses.find(r => r.status === 200).body.allocated).toBe(8);
    const students = await db('student').where({ department_stream: f.bulk, isEligibleFreeCourse: 1 });
    expect(students).toHaveLength(8);
    expect(students.filter(s => s.category === 'General (Gen)').map(s => s.percentage).sort()).toEqual(['100', '70', '80', '90']);
    expect(await db('student_free_seat_allocations').where('course_id', f.bulk)).toHaveLength(8);
    expect(await db('product_details').where('code', f.bulk).first('availableFreeCourses', 'registeredFreeCourses')).toEqual({ availableFreeCourses: 0, registeredFreeCourses: 8 });
  });

  it('rolls back a missing-code failure; a later mail failure does not undo committed allocation', async () => {
    const request = { course_id: f.rollback };
    expect((await post('/api/allocateseat', 'admin', request)).status).toBe(409);
    expect(await db('student_free_seat_allocations').where('course_id', f.rollback)).toHaveLength(0);
    expect((await db('student').where('id', f.rollbackStudent.id).first()).isEligibleFreeCourse).toBe(0);
    expect((await db('product_details').where('code', f.rollback).first()).availableFreeCourses).toBe(1);
    await db('free_seat_code').insert({ product_code: f.rollback, company_code: f.users.company.application_number, neat_secret_code: 'test-neat', company_secret_code: 'test-company' });
    const send = vi.spyOn(mailer, 'sendMail').mockRejectedValueOnce(new Error('test transport failure'));
    try {
      const response = await post('/api/allocateseat', 'admin', request);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ allocated: 1, email_delivery: { sent: 0, captured: 0, failed: 1 } });
      expect(await db('student_free_seat_allocations').where('course_id', f.rollback)).toHaveLength(1);
    } finally { send.mockRestore(); }
  });

  it('paginates admin results without disclosing verification codes and rejects wrong roles', async () => {
    expect((await call('GET', '/api/allocated-seat', 'company')).status).toBe(403);
    expect((await call('GET', '/api/allocated-seat', 'admin', { per_page: 101 })).status).toBe(422);
    const result = await call('GET', '/api/allocated-seat', 'admin', { per_page: 2 });
    expect(result.body.allocations).toHaveLength(2);
    for (const row of result.body.allocations) expect(Object.keys(row).some(k => k.includes('secret'))).toBe(false);
    expect((await post('/api/allocateseat', 'student', { course_id: f.bulk })).status).toBe(403);
    expect((await post('/api/applyForFreeCourse', 'learner', { code: f.manual })).status).toBe(403);
    expect((await post('/api/assignFreeCourse', 'admin', { application_number: f.users.learner.application_number })).status).toBe(422);
  });
});
