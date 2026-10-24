// Port of Api\PaymentController (paymentSuccess, paymentFailure).
//
// SEC-PAY-01 (OPEN, owner decision required): the payment result reaches the
// API through the student's own browser (payment-verification page relays
// ?Success=1&sessionid=… from the company gateway). There is no server-to-server
// confirmation or signature, so whoever knows a purchase's sessionid can mark
// it paid. Fixing this needs a verification contract with each company gateway;
// it is NOT silently changed here. DEV-11 makes sessionids unguessable (random
// v4 instead of MySQL time-based UUID()), see courseService.applyForPaidCourse.
import { db, table } from '../database/knex.js';
import { legacyAuthenticate } from './auth/legacyAuth.js';
import { legacyRun } from './legacyErrors.js';
import { sendMail } from '../integrations/mail/mailer.js';
import { institutePayment, learnerPayment } from '../integrations/mail/templates/paymentMails.js';
import { looseEq, toPhpNumber } from '../utils/php.js';

const ok = (body) => ({ status: 200, body });
const SUPPORT_BCC = 'neatsupport@aicte-india.org';

const value = async (tbl, where, column) => (await db(table(tbl)).where(where).first(column))?.[column] ?? null;

/**
 * POST /api/paymentSuccess {studentid, courseid, token=sessionid}
 * Public (no JWT check) like the original.
 */
export const paymentSuccess = (input) =>
  legacyRun(async () => {
    const { studentid = null, courseid = null, token: sessionid = null } = input;
    const [{ n }] = await db(table('product_purchased_audit'))
      .where({ application_number: studentid, code: courseid, sessionid })
      .count({ n: '*' });
    if (!looseEq(Number(n), '1')) return ok({ message: 'Error', reason: 'Cant Complete the Transaction' });

    const update = await db(table('product_purchased_audit'))
      .where('application_number', studentid)
      .where('code', courseid)
      .update({ status: 'Payment Successful' });

    const companyEmail = await value('product', { code: courseid }, 'email');
    const companyName = await value('product_details', { code: courseid }, 'company_name');
    const user = (await db(table('users')).where('application_number', studentid).first('username', 'email', 'phone', 'role_id')) ?? {};

    let totalPaidSeats = 0;
    for (const row of await db(table('product_purchased_audit')).where('code', courseid)) {
      totalPaidSeats += toPhpNumber(row.quantity);
    }

    if (looseEq(user.role_id ?? null, 5)) {
      const inst = (await db(table('institute_details')).where('application_number', studentid).first()) ?? {};
      const content = {
        company_name: companyName,
        quantity: await value('product_purchased_audit', { application_number: studentid, code: courseid }, 'quantity'),
        name: user.username ?? null,
        address: inst.institute_address ?? null,
        state: inst.institute_state ?? null,
        code: courseid,
        application_number: studentid,
        nodal_name: inst.institute_neat_coordinator ?? null,
        nodal_email: inst.institute_contact_person_email ?? null,
        nodal_phone: inst.institute_mobile ?? null,
        total_paid_seats: totalPaidSeats,
        allocated_free_seats: await value('product_details', { code: courseid }, 'registeredFreeCourses'),
        total_free_seats: await value('product_details', { code: courseid }, 'providedFreeCourses'),
        email: user.email ?? null,
      };
      await sendMail({ to: companyEmail, bcc: SUPPORT_BCC, ...institutePayment(content) });
    } else {
      const content = {
        company_name: companyName,
        name: user.username ?? null,
        code: courseid,
        application_number: studentid,
        email: user.email ?? null,
        phone: user.phone ?? null,
        total_paid_seats: totalPaidSeats,
      };
      await sendMail({ to: companyEmail, bcc: SUPPORT_BCC, ...learnerPayment(content) });
    }

    return ok({ message: 'Success', reason: update });
  });

/** POST /api/paymentFailure — guarded; answers an empty 200 on success (no return in the original). */
export const paymentFailure = (req, input) =>
  legacyRun(async () => {
    await legacyAuthenticate(req, ['user_id', 'uuid', 'email']);
    await db(table('product_purchased_audit'))
      .where('application_number', input.studentid ?? null)
      .where('code', input.courseid ?? null)
      .update({ status: 'Payment Failed' });
    return { status: 200, empty: true };
  });
