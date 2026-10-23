// Port of Api\CourseController (public catalog, product details, comments,
// B2B enquiry, paid/free course application).
import { randomInt, randomUUID } from 'node:crypto';
import { db, table } from '../database/knex.js';
import * as products from '../repositories/productRepository.js';
import { legacyAuthenticate } from './auth/legacyAuth.js';
import { extractToken, verifyToken } from './auth/jwtService.js';
import { findById } from '../repositories/userRepository.js';
import { legacyRun } from './legacyErrors.js';
import { sendMail } from '../integrations/mail/mailer.js';
import { b2bCompany } from '../integrations/mail/templates/b2bCompany.js';
import { logger } from '../config/logger.js';
import { nowSql } from '../utils/time.js';
import { looseEq, offset, phpConcat, phpMultiply, prop, toPhpNumber } from '../utils/php.js';

const ok = (body) => ({ status: 200, body });
// Catalog actions catch everything and answer {"message":"Error"} without a reason.
const catalog = (fn) =>
  legacyRun(fn).then((r) => (r.body?.message === 'Error' && !Array.isArray(r.body) ? ok({ message: 'Error' }) : r));

// ---------------------------------------------------------------- listings

/** GET /api/getProductsLandingPage */
export const getProductsLandingPage = () =>
  catalog(async () => ok({ message: 'Success', products: await products.inRandomOrder(products.approvedProductsQuery()) }));

/** GET /api/getB2BProductsLandingPage (type filter commented out in the original; orderBy id after RAND()) */
export const getB2BProductsLandingPage = () =>
  catalog(async () =>
    ok({ message: 'Success', products: await products.inRandomOrder(products.approvedProductsQuery()).orderBy('id', 'desc') }),
  );

/** GET /api/getB2CProductsLandingPage */
export const getB2CProductsLandingPage = () =>
  catalog(async () =>
    ok({
      message: 'Success',
      products: await products.inRandomOrder(products.approvedProductsQuery().where(`${table('product_details')}.product_type`, 'B2C')),
    }),
  );

/**
 * GET /api/get{,B2B,B2C}BucketWiseProducts?bucket=
 * bucket == "All" (PHP loose) → no bucket filter.
 */
export const getBucketWiseProducts = (bucket, productType) =>
  catalog(async () => {
    const q = products.approvedProductsQuery();
    if (!looseEq(bucket, 'All')) q.where(`${table('product_details')}.product_bucket`, bucket);
    if (productType) q.where(`${table('product_details')}.product_type`, productType);
    return ok({ message: 'Success', products: await products.inRandomOrder(q) });
  });

/**
 * GET /api/get{,B2B,B2C}BucketWiseSearchProducts?bucket=
 * bucket == "" (PHP loose, so also null) → no search filter. Only the B2C
 * variant filters by type; the B2B one has its type filter commented out.
 */
export const getBucketWiseSearchProducts = (bucket, productType) =>
  catalog(async () => {
    const q = products.approvedProductsQuery();
    if (!looseEq(bucket, '')) products.whereCompanyOrCourseLike(q, bucket);
    if (productType) q.where(`${table('product_details')}.product_type`, productType);
    return ok({ message: 'Success', products: await products.inRandomOrder(q) });
  });

/** GET /api/get{,B2B,B2C}ProductBuckets */
export const getProductBuckets = (productType) =>
  catalog(async () => ok({ message: 'Success', buckets: await products.approvedBuckets(productType) }));

/** GET /api/getHomePageCounter */
export const getHomePageCounter = () =>
  catalog(async () => {
    const countUsers = async (roleId) =>
      Number((await db(table('users')).where('role_id', roleId).where('status', 'Active').count({ n: '*' }))[0].n);
    const [{ n }] = await products.approvedProductsQuery().clearSelect().count({ n: '*' });
    return ok({
      message: 'Success',
      products: Number(n),
      regStud: await countUsers('3'),
      regLear: await countUsers('6'),
      regInst: await countUsers('5'),
    });
  });

/** POST /api/getProductsForAllocation */
export const getProductsForAllocation = () =>
  legacyRun(async () =>
    ok({
      message: 'Success',
      products: await db(table('product_details'))
        .select('company_name', 'code', 'course_name', 'availableFreeCourses', 'stream')
        .where({ product_active: 'Approved', isDetailsSubmitted: 'Yes' }),
    }),
  ).then((r) => (r.body?.reason !== undefined ? ok({ message: 'Error', Error: r.body.reason }) : r));

// ----------------------------------------------------------- product details

/**
 * POST /api/getProductDetails {code}
 * Public. A token is optional: JWTAuth::getToken() swallows unparsable tokens,
 * but a parsable-yet-invalid token makes getPayload() throw → {"message":"Error"}.
 * Every call increments product_details.view_counter.
 */
export const getProductDetails = (req, { code }) =>
  catalog(async () => {
    const token = extractToken(req);
    if (token && token.split('.').length === 3) {
      const payload = await verifyToken(token); // throws → {"message":"Error"}
      // `if ($auth = authenticate() && verifyUser(...))` — not negated: an
      // unknown user simply skips the block. verifyUser() reads these keys.
      const user = await findById(payload.sub);
      if (user) {
        for (const key of ['user_id', 'uuid', 'email']) {
          if (!(key in payload)) throw new Error(`Undefined index: ${key}`);
        }
      }
      if (user && (looseEq(payload.role_id, '3') || looseEq(payload.role_id, '6'))) {
        // The student-enquiry mail to the company is commented out in the
        // original; only the property reads (which fail on unknown codes) remain.
        prop(await products.findProductByCode(code), 'name');
        prop(await products.findDetailsByCode(code), 'course_name');
      }
    }

    const prev = await db(table('product_details')).where('code', code).select('view_counter').first();
    const cnt = toPhpNumber(prop(prev, 'view_counter')) + 1;
    await db(table('product_details')).where('code', code).update({ view_counter: cnt });

    const product = await products.findDetailsByCode(code);
    const relatedProduct = await db(table('product_details')).where('code', '!=', code).where('isDetailsSubmitted', 'Yes').first();

    return ok({
      // Carbon::now()->timestamp(6) sets the time to 6 seconds after the epoch.
      created_at: '1970-01-01T00:00:06.000000Z',
      message: 'Success',
      products: product ?? null,
      relatedProduct: relatedProduct ?? null,
    });
  });

// ----------------------------------------------------------------- comments

/** POST /api/addComment */
export const addComment = (req, input) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, ['user_id', 'uuid', 'email'], { payloadFirst: true });
    const [id] = await db(table('comments')).insert({
      comment_id: randomUUID(),
      student_id: payload.application_number,
      username: payload.username,
      comment: input.comment,
      course_id: input.course_id,
      type: input.type,
      created_at: nowSql(),
    });
    return id > 0 ? ok({ message: 'Success' }) : { status: 200, empty: true };
  });

/** POST /api/getComments {code, count} → bare JSON array (limit count*3) */
export const getComments = (req, input) =>
  legacyRun(async () => {
    await legacyAuthenticate(req, ['user_id', 'uuid', 'email'], { payloadFirst: true });
    const limit = phpMultiply(input.count, 3);
    const comments = await db(table('comments')).where('course_id', input.code).limit(Math.trunc(limit));
    for (const c of comments) {
      if (looseEq(c.replied, 'Yes')) c.reply = await db(table('replies')).where('comment_id', c.comment_id);
    }
    return ok(comments);
  });

/** POST /api/addReplyToComment */
export const addReplyToComment = (req, input) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, ['user_id', 'uuid', 'email'], { payloadFirst: true });
    const [id] = await db(table('replies')).insert({
      comment_id: input.comment_id,
      reply: input.reply,
      username: payload.username,
      created_at: nowSql(),
    });
    await db(table('comments')).where('comment_id', input.comment_id).update({ replied: 'Yes' });
    return id > 0 ? ok({ message: 'Success' }) : { status: 200, empty: true };
  });

// ---------------------------------------------------------- company/admin

/** POST /api/editProductDetails — re-opens a product for editing */
export const editProductDetails = (req, { code }) =>
  legacyRun(async () => {
    await legacyAuthenticate(req, ['user_id', 'uuid', 'email'], { payloadFirst: true });
    await db(table('product_details')).where('code', code).update({ isDetailsSubmitted: 'No' });
    return ok({ message: 'Success' });
  });

/** POST /api/getAppliedStudents — note: the original answers message "Error" on success. */
export const getAppliedStudents = (req, { code }) =>
  legacyRun(async () => {
    await legacyAuthenticate(req, ['user_id', 'uuid', 'email'], { payloadFirst: true });
    const numbers = await db(table('product_purchased_audit'))
      .where({ code, course_type: 'Free', status: 'Applied' })
      .pluck('application_number');
    const students = [];
    for (const n of numbers) {
      students.push(offset(await db(table('student_details')).where('application_number', n), 0));
    }
    return ok({ message: 'Error', students });
  });

// ------------------------------------------------------------- B2B enquiry

/** POST /api/submitB2BEnquiry (public) */
export const submitB2BEnquiry = (input) =>
  legacyRun(async () => {
    const product = await db(table('product_details')).select('course_name').where('code', input.product_code).first();
    const enquiryNo = randomInt(11111, 100000);
    const data = {
      enquiry_no: enquiryNo,
      product_code: input.product_code,
      product_name: prop(product, 'course_name'),
      college_representative_name: input.college_representative_name,
      designation: input.designation,
      college_name: input.college_name,
      college_email: input.college_email,
      no_of_seats: input.no_of_seats,
      mobile_number: input.mobile_number,
      message: input.message,
    };
    await db(table('b2b_enquiry')).insert({ neat_id: input.neat_id, ...data });

    const company = await db(table('product')).where('code', input.product_code).first();
    try {
      await sendMail({ to: company?.email, ...b2bCompany(data) });
    } catch (err) {
      // DEV-03: the original print_r()'d the mail error into the response body,
      // corrupting the JSON. The port logs it and still answers Success.
      logger.warn({ err: err.message }, 'B2BCompany mail failed');
    }
    return ok({ message: 'Success', reason: 'We have received your message' });
  });

// ---------------------------------------------------- paid/free application

/**
 * POST /api/applyForPaidCourse {code, quantity}
 * Records the purchase intent in product_purchased_audit and returns the URL
 * the browser is sent to (company payment link or direct product URL).
 * The URL is concatenated without encoding, exactly like the original.
 */
export const applyForPaidCourse = (req, input) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, ['user_id', 'uuid', 'email'], { payloadFirst: true });
    const appNo = payload.application_number;
    const { code, quantity } = input;

    const roleId = (await db(table('users')).where('application_number', appNo).first('role_id'))?.role_id ?? null;
    const price = (await db(table('product_details')).where('code', code).first('price'))?.price ?? null;
    const fee = phpMultiply(price, quantity);

    const [[{ uuid }]] = await db.raw('select UUID() as uuid');
    const audit = () => db(table('product_purchased_audit'));
    const count = Number((await audit().where({ application_number: appNo, code }).count({ n: '*' }))[0].n);
    const paidCount = Number((await audit().where({ application_number: appNo, code, status: 'Payment Successful' }).count({ n: '*' }))[0].n);

    if (paidCount > 0) {
      if (looseEq(roleId, '3')) return ok({ message: 'Success', reason: 'Already applied for course.', redirect_url: '/student/free-Products-details-checkout' });
      if (looseEq(roleId, '6')) return ok({ message: 'Success', reason: 'Already applied for course.', redirect_url: '/learner' });
      return { status: 200, empty: true };
    }

    let affected;
    const free = looseEq(fee, 0);
    if (free) {
      if (count === 0) {
        await audit().insert({ application_number: appNo, code, course_type: 'Free', sessionid: uuid, status: 'Payment Successful', quantity });
        affected = 1;
      } else {
        affected = await audit()
          .where({ application_number: appNo, code, course_type: 'Free' })
          .update({ sessionid: uuid, status: 'Payment Successful', quantity });
      }
    } else if (count === 0) {
      await audit().insert({ application_number: appNo, code, course_type: 'Paid', sessionid: uuid, status: 'Payment pending', quantity });
      affected = 1;
    } else {
      affected = await audit().where({ application_number: appNo, code, course_type: 'Paid' }).update({ sessionid: uuid });
    }

    const product = await db(table('product')).where('code', code).first('name');
    const courseName = product?.name ?? null;
    const phone = (await db(table('users')).where('application_number', appNo).first('phone'))?.phone ?? null;
    const details = (await db(table('product_details')).where('code', code).first('payment_link', 'neat_course_id', 'product_direct_url')) ?? {};

    const query = (prefix) =>
      phpConcat(prefix, '&coursename=', courseName, '&sessionid=', uuid, '&fee=', fee, '&studentid=', appNo, '&studentname=', payload.username, '&email=', payload.email, '&mobile=', phone);

    let redirectUrl;
    if (free) {
      if (!looseEq(details.product_direct_url ?? null, '')) {
        redirectUrl = query(phpConcat(details.product_direct_url, '?courseid=', code));
      } else {
        if (looseEq(roleId, '3')) redirectUrl = '/student';
        if (looseEq(roleId, '6')) redirectUrl = '/learner';
      }
    } else if (!looseEq(details.neat_course_id ?? null, 'None')) {
      redirectUrl = query(phpConcat(details.payment_link, '?neat_course_id=', code, '&courseid=', details.neat_course_id));
    } else {
      redirectUrl = query(phpConcat(details.payment_link, '?courseid=', code));
    }

    if (redirectUrl === undefined) {
      return ok({ message: 'Error', reason: 'Undefined variable: redirect_url' });
    }
    if (affected !== 0) return ok({ message: 'Success', reason: 'Applied for course  Succesfully', redirect_url: redirectUrl });
    return { status: 200, empty: true };
  });
