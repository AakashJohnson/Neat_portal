import { randomUUID } from 'node:crypto';
import { db, table } from '../database/knex.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { requireAccount } from './auth/permissions.js';
import { validateOrFail } from '../validators/validator.js';
import { httpException } from '../http/respond.js';
import { nowSql } from '../utils/time.js';
import { sendMail } from '../integrations/mail/mailer.js';
import { freeSeatAllocation } from '../integrations/mail/templates/freeSeatAllocation.js';

const ok = body => ({ status: 200, body });
const CODE_RULE = 'required|string|max:50';

export function categoryQuotas(seats) {
  const obc = Math.round(seats * 0.27);
  const sc = Math.round(seats * 0.15);
  const st = Math.round(seats * 0.075);
  return {
    'General (Gen)': seats - obc - sc - st,
    'Other Backward Classes (OBC)': obc,
    'Scheduled Caste (SC)': sc,
    'Scheduled Tribe (ST)': st,
  };
}

async function lockProduct(trx, code) {
  const product = await trx(table('product_details')).where({ code }).forUpdate().first();
  if (!product) throw httpException(404, 'Product not found.');
  if (product.product_active !== 'Approved' || product.isDetailsSubmitted !== 'Yes') throw httpException(409, 'The product is not approved for allocation.');
  const seats = Number(product.availableFreeCourses);
  const registered = Number(product.registeredFreeCourses);
  if (!Number.isSafeInteger(seats) || seats < 0 || !Number.isSafeInteger(registered) || registered < 0) {
    throw httpException(409, 'Product seat counts are invalid. Please correct the product configuration.');
  }
  return product;
}

async function allocateStudents(trx, product, students, adminId) {
  if (!students.length) return [];
  const secret = await trx(table('free_seat_code')).where('product_code', product.code).first();
  if (!secret?.neat_secret_code || !secret.company_secret_code) throw httpException(409, 'Free-seat codes must be configured before allocation.');
  const now = nowSql();
  const notifications = [];
  for (const student of students) {
    const allocation = {
      student_id: student.application_number, student_email: student.email,
      admission_registration_number: student.admission_registration_number,
      course_id: product.code, stream_id: student.department_stream,
      permanent_institute_id: student.permanent_institute_id,
      isEligibleFreeCourse: 1, is_course_availed: 'No',
      neat_secret_code: secret.neat_secret_code, company_secret_code: secret.company_secret_code,
      student_secret_code: randomUUID(), created_at: now, updated_at: now,
    };
    await trx(table('student_free_seat_allocations')).insert(allocation);
    await trx(table('student')).where('id', student.id).update({
      isEligibleFreeCourse: 1, is_rule_engine_processed: 1, course_name: product.course_name,
    });
    await trx(table('product_purchased_audit')).where({
      application_number: student.application_number, code: product.code, course_type: 'Free', status: 'Applied',
    }).update({ status: 'Payment Successful', approved_by: String(adminId), updated_at: now });
    notifications.push({ student, allocation, courseName: product.course_name });
  }
  await trx(table('product_details')).where('code', product.code).update({
    availableFreeCourses: Number(product.availableFreeCourses) - students.length,
    registeredFreeCourses: Number(product.registeredFreeCourses) + students.length,
  });
  return notifications;
}

async function notify({ student, allocation, courseName }) {
  try {
    await sendMail({ to: student.email, ...freeSeatAllocation(student, allocation, courseName) });
    if (env.MAIL_TRANSPORT !== 'smtp') {
      logger.warn('Free-seat allocation email captured only; SMTP delivery is disabled');
      return 'captured';
    }
    return 'sent';
  } catch (err) {
    logger.warn({ code: err.code, name: err.name }, 'Free-seat email failed; allocation remains committed');
    return 'failed';
  }
}

async function allocationResult(notifications) {
  const delivery = { sent: 0, captured: 0, failed: 0 };
  for (let i = 0; i < notifications.length; i += 10) {
    for (const status of await Promise.all(notifications.slice(i, i + 10).map(notify))) delivery[status]++;
  }
  return ok({ message: 'Success', reason: `${notifications.length} free seat(s) allocated.`, allocated: notifications.length, email_delivery: delivery });
}

export async function allocateSeats(req, input) {
  const admin = await requireAccount(req, [1]);
  await validateOrFail(input, { course_id: CODE_RULE });
  const notifications = await db.transaction(async trx => {
    const product = await lockProduct(trx, input.course_id);
    const seats = Number(product.availableFreeCourses);
    if (!seats) throw httpException(409, 'No free seats remain for this product.');
    let streams = String(product.stream ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (streams[0]?.replace(/\s/g, '') === 'AllEngineeringBranches') streams = ['CS', 'IT', 'ECE', 'Management', 'Computer Science'];
    if (!streams.length) throw httpException(409, 'Product streams must be configured before allocation.');
    const students = [];
    for (const [category, limit] of Object.entries(categoryQuotas(seats))) {
      if (!limit) continue;
      const candidates = await trx(table('student')).where({ category, isEligibleFreeCourse: 0 })
        .whereIn('department_stream', streams)
        .whereNotExists(trx(table('student_free_seat_allocations')).select(trx.raw('1'))
          .whereColumn('student_id', `${table('student')}.application_number`).whereNull('deleted_at'))
        .orderByRaw('CAST(?? AS DECIMAL(10, 4)) DESC', ['percentage'])
        .orderBy('gender').orderBy('birthdate').orderBy('name').orderBy('id').limit(limit).forUpdate();
      students.push(...candidates);
    }
    return allocateStudents(trx, product, students, admin.id);
  });
  return allocationResult(notifications);
}

export async function assignFreeCourse(req, input) {
  const admin = await requireAccount(req, [1]);
  await validateOrFail(input, { application_number: 'required|string|max:50', code: 'nullable|string|max:50' });
  let code = input.code;
  if (!code) {
    const applications = await db(table('product_purchased_audit')).where({
      application_number: input.application_number, course_type: 'Free', status: 'Applied',
    }).select('code').limit(2);
    if (applications.length !== 1) throw httpException(422, 'Specify the product code when there is not exactly one pending free-course application.');
    code = applications[0].code;
  }
  const notifications = await db.transaction(async trx => {
    const product = await lockProduct(trx, code);
    const student = await trx(table('student')).where('application_number', input.application_number).forUpdate().first();
    if (!student) throw httpException(404, 'Nominated student not found.');
    const previous = await trx(table('student_free_seat_allocations')).where('student_id', input.application_number).whereNull('deleted_at').first('course_id');
    if (previous?.course_id === code) return [];
    if (previous || student.isEligibleFreeCourse) throw httpException(409, 'The student has already received a free-seat allocation.');
    if (!Number(product.availableFreeCourses)) throw httpException(409, 'No free seats remain for this product.');
    return allocateStudents(trx, product, [student], admin.id);
  });
  return allocationResult(notifications);
}

export async function allocatedSeats(req, input) {
  await requireAccount(req, [1]);
  const paging = { page: input.page ?? 1, per_page: input.per_page ?? 25 };
  await validateOrFail(paging, { page: 'integer|min:1|max:1000000', per_page: 'integer|min:1|max:100' });
  const query = () => db(table('student_free_seat_allocations')).whereNull('deleted_at');
  const [{ total }] = await query().count({ total: '*' });
  const rows = await query().select('id', 'student_id', 'student_email', 'course_id', 'stream_id', 'permanent_institute_id', 'is_course_availed')
    .orderBy('id', 'desc').limit(Number(paging.per_page)).offset((Number(paging.page) - 1) * Number(paging.per_page));
  return ok({ message: 'Success', allocations: rows, total: Number(total), page: Number(paging.page), per_page: Number(paging.per_page) });
}

export async function getStudentEligibility(req) {
  const user = await requireAccount(req, [3]);
  if (!user.application_number) throw httpException(409, 'Your account is missing its application number. Please contact support.');
  const student = await db(table('student')).where({ application_number: user.application_number, email: user.email }).first('isEligibleFreeCourse');
  const allocations = await db(table('student_free_seat_allocations')).where({ student_id: user.application_number })
    .whereNull('deleted_at').select('course_id', 'is_course_availed');
  return ok({ message: 'Success', nominated: !!student, isEligibleFreeCourse: !!student?.isEligibleFreeCourse, allocations });
}

export async function sendFreeAllocationMail(req, input) {
  const user = await requireAccount(req, [1, 3]);
  await validateOrFail(input, { code: CODE_RULE, application_number: 'nullable|string|max:50' });
  const appNo = Number(user.role_id) === 1 ? input.application_number : user.application_number;
  if (!appNo) throw httpException(422, 'A student application number is required.');
  const student = await db(table('student')).where('application_number', appNo).first();
  if (!student || (Number(user.role_id) !== 1 && student.email !== user.email)) throw httpException(404, 'Nominated student not found.');
  const allocation = await db(table('student_free_seat_allocations')).where({ student_id: appNo, course_id: input.code }).whereNull('deleted_at').first();
  if (!allocation) throw httpException(404, 'No free seat has been allocated for this product.');
  const product = await db(table('product_details')).where('code', input.code).first('course_name');
  if (!product) throw httpException(404, 'Product not found.');
  const delivery = await notify({ student, allocation, courseName: product.course_name });
  if (delivery !== 'sent') throw httpException(503, 'The allocation exists, but its email could not be delivered. Please contact support to check SMTP.');
  return ok({ message: 'Success', reason: 'Allocation email sent.', email_delivery: delivery });
}
