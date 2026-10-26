import { randomUUID } from 'node:crypto';
import { db, table } from '../database/knex.js';
import { requireAccount } from './auth/permissions.js';
import { requireOwnedProduct } from './companyService.js';
import { validateOrFail } from '../validators/validator.js';
import { httpException } from '../http/respond.js';
import { applyForPaidCourse } from './courseService.js';
import { nowSql } from '../utils/time.js';

const ok = body => ({ status: 200, body });
const CODE_RULE = 'required|string|max:191';
const buyers = [3, 5, 6];

async function buyer(req) {
  const user = await requireAccount(req, buyers);
  if (!user.application_number) throw httpException(409, 'Your account is missing its application number. Please contact support.');
  return user;
}

async function approvedProduct(code, connection = db) {
  const product = await connection(table('product_details')).where({ code, product_active: 'Approved', isDetailsSubmitted: 'Yes' }).first();
  if (!product) throw httpException(404, 'This product is not available.');
  return product;
}

export async function addToCart(req, input) {
  const user = await buyer(req);
  await validateOrFail(input, { product_id: CODE_RULE });
  await approvedProduct(input.product_id);
  await db(table('cart')).insert({ application_number: user.application_number, code: input.product_id, active: 'Yes' })
    .onConflict(['application_number', 'code']).merge({ active: 'Yes', updated_at: nowSql() });
  return ok({ message: 'Success', cartInsert: true });
}

export async function displayCart(req) {
  const user = await buyer(req);
  const cart = table('cart');
  const products = table('product_details');
  const rows = await db(cart).join(products, `${products}.code`, `${cart}.code`)
    .where(`${cart}.application_number`, user.application_number).where(`${cart}.active`, 'Yes')
    .select(`${cart}.*`, `${products}.course_name`, `${products}.product_highlights`, `${products}.price`);
  return ok({ message: 'Success', products: rows });
}

export async function displayPaidProducts(req) {
  const user = await buyer(req);
  const audit = table('product_purchased_audit');
  const products = table('product_details');
  const rows = await db(audit).join(products, `${products}.code`, `${audit}.code`)
    .where(`${audit}.application_number`, user.application_number).where(`${audit}.course_type`, 'Paid')
    .where(`${audit}.status`, 'Payment Successful')
    .select(`${products}.course_name`, `${products}.code`, `${products}.price`, `${products}.product_direct_url`, `${audit}.status`, `${audit}.course_type`);
  return ok({ message: 'Success', products: rows });
}

export async function submitTransactionId(req, input) {
  const user = await buyer(req);
  await validateOrFail(input, { code: CODE_RULE, transaction_id: 'required|string|max:191' });
  await db.transaction(async trx => {
    const query = () => trx(table('product_purchased_audit')).where({ application_number: user.application_number, code: input.code, course_type: 'Paid' });
    const purchase = await query().forUpdate().first();
    if (!purchase) throw httpException(404, 'Apply for this paid course before submitting a transaction ID.');
    if (purchase.status === 'Payment Successful') throw httpException(409, 'This purchase is already approved.');
    await query().update({ transaction_id: input.transaction_id, status: 'Payment Pending', approved_by: 'Under Evaluation', updated_at: nowSql() });
  });
  return ok({ message: 'Success', reason: 'Transaction ID submitted for company verification.' });
}

export async function assignPaidCourse(req, input) {
  const user = await requireAccount(req, [1, 4]);
  await validateOrFail(input, { code: CODE_RULE, application_number: 'required|string|max:191', status: 'required|in:Approved,Rejected' });
  const status = input.status === 'Approved' ? 'Payment Successful' : 'Payment Failed';
  await db.transaction(async trx => {
    await requireOwnedProduct(user, input.code, trx);
    const query = () => trx(table('product_purchased_audit')).where({ application_number: input.application_number, code: input.code, course_type: 'Paid' });
    const purchase = await query().forUpdate().first();
    if (!purchase) throw httpException(404, 'Paid course application not found.');
    if (!purchase.transaction_id) throw httpException(409, 'A transaction ID must be submitted before verification.');
    if (purchase.status === status) return;
    if (purchase.status?.toLowerCase() !== 'payment pending') throw httpException(409, 'This transaction has already been reviewed.');
    await query().update({ status, approved_by: String(user.id), updated_at: nowSql() });
  });
  return ok({ message: 'Success', reason: `Transaction ${input.status.toLowerCase()}.` });
}

export async function applyForFreeCourse(req, input) {
  const user = await requireAccount(req, [3]);
  await validateOrFail(input, { code: CODE_RULE });
  await db.transaction(async trx => {
    const student = await trx(table('student')).where({ application_number: user.application_number, email: user.email }).forUpdate().first();
    if (!student) throw httpException(403, 'Free-seat applications require an institute nomination.');
    if (student.isEligibleFreeCourse) throw httpException(409, 'A free seat has already been allocated to you.');
    await approvedProduct(input.code, trx);
    const query = () => trx(table('product_purchased_audit')).where({ application_number: user.application_number, code: input.code });
    const existing = await query().first();
    if (existing) {
      if (existing.course_type === 'Free' && existing.status === 'Applied') return;
      throw httpException(409, 'An application or purchase for this product already exists.');
    }
    await query().insert({ application_number: user.application_number, code: input.code, course_type: 'Free', status: 'Applied', quantity: 1, sessionid: randomUUID() });
  });
  return ok({ message: 'Success', reason: 'Free-course application submitted for allocation.' });
}

/** Retired redirect caller now shares the actual checkout implementation. */
export async function paymentRedirect(req, input) {
  await buyer(req);
  const values = { code: input.product_id ?? input.code, quantity: input.quantity ?? 1 };
  await validateOrFail(values, { code: CODE_RULE, quantity: 'required|integer|min:1|max:2147483647' });
  const product = await approvedProduct(values.code);
  if (Number(product.price) > 0) {
    let url;
    try { url = new URL(product.payment_link); } catch { throw httpException(409, 'The company payment link is not configured.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw httpException(409, 'The company payment link is invalid.');
  }
  const result = await applyForPaidCourse(req, values);
  if (result.body?.message !== 'Success' || !result.body.redirect_url) throw httpException(409, 'Unable to start checkout for this product.');
  return ok({ ...result.body, payment_url: result.body.redirect_url });
}
