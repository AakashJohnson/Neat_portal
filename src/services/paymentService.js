import { db, table } from '../database/knex.js';
import { tokenAuthenticate } from './auth/tokenAuth.js';
import { legacyRun } from './serviceErrors.js';
import { sendMail } from '../integrations/mail/mailer.js';
import { institutePayment, learnerPayment } from '../integrations/mail/templates/paymentMails.js';
import { looseEq, toPhpNumber } from '../utils/php.js';

const ok = (body) => ({ status: 200, body });
const SUPPORT_BCC = 'neatsupport@aicte-india.org';

const value = async (tbl, where, column) => (await db(table(tbl)).where(where).first(column))?.[column] ?? null;


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


export const paymentFailure = (req, input) =>
  legacyRun(async () => {
    await tokenAuthenticate(req, ['user_id', 'uuid', 'email']);
    await db(table('product_purchased_audit'))
      .where('application_number', input.studentid ?? null)
      .where('code', input.courseid ?? null)
      .update({ status: 'Payment Failed' });
    return { status: 200, empty: true };
  });
