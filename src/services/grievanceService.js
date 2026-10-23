// Port of Api\GrievanceController.
import { db, table } from '../database/knex.js';
import { legacyAuthenticate } from './auth/legacyAuth.js';
import { legacyRun, legacyValidate } from './legacyErrors.js';
import { sendMail } from '../integrations/mail/mailer.js';
import { feedbackRaised } from '../integrations/mail/templates/feedbackRaised.js';
import { unixNow } from '../utils/time.js';

const GRIEVANCE_BCC = 'neat.grievance@gmail.com';

/** POST /api/submitGrievance (public). */
export const submitGrievance = (input) =>
  legacyRun(async () => {
    await legacyValidate(input, {
      name: 'required',
      email: 'required|email',
      mobile: 'required|digits:10',
      description: 'required',
    });
    const grievanceId = `GRIV${unixNow()}`;
    const [id] = await db(table('grievance')).insert({
      name: input.name,
      email: input.email,
      mobile: input.mobile,
      organization: input.organization,
      description: input.description,
      grievance_id: grievanceId,
    });
    if (!(id > 0)) return { status: 200, body: { message: 'Error', reason: 'Data not inserted.' } };

    // The original resolved the company's e-mail when company_name was given,
    // but every Mail::send() in this method is commented out, so no mail is sent.
    return { status: 200, body: { message: 'Success', reason: 'Grievance Raised Successfully.' } };
  });

/** POST /api/submitFeedback (JWT, manual guard). */
export const submitFeedback = (req, input, { appUrl }) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, ['user_id', 'uuid', 'email']);
    await legacyValidate(input, {
      name: 'required',
      email: 'required|email',
      experience: 'required',
      feedback: 'required',
    });
    await db(table('feedback')).insert({
      name: input.name,
      email: input.email,
      experience: input.experience,
      feedback: input.feedback,
      user_id: payload.user_id,
      application_number: payload.application_number,
      feedback_id: `FEED${unixNow()}`,
    });
    const mail = feedbackRaised(
      { name: input.name, experience: input.experience, email: input.email, username: payload.username, feedback: input.feedback },
      { appUrl },
    );
    await sendMail({ to: payload.email, bcc: GRIEVANCE_BCC, ...mail });
    return { status: 200, body: { message: 'Success', reason: 'Feedback Raised Successfully!' } };
  });

/** GET /api/getAnnouncements (public). */
export const getAnnouncements = () =>
  legacyRun(async () => {
    const [announcements, news, articales] = await Promise.all([
      db(table('announcements')).where('type', 'announcement'),
      db(table('announcements')).where('type', 'news'),
      db(table('articles')).select('title', 'id').where('status', 1),
    ]);
    return { status: 200, body: { message: 'Success', announcements, news, articales } };
  });

/** GET /api/get-details-article?id= (public; no try/catch in the original). */
export async function getDetailsArticle({ id }) {
  const articles = await db(table('articles')).select('title', 'id', 'description').where('id', id);
  return { status: 200, body: { message: 'Success', articles } };
}

/** POST /api/submitContactUs (public). */
export const submitContactUs = (input) =>
  legacyRun(async () => {
    await db(table('contact_us')).insert({ name: input.name, email: input.email, message: input.message });
    return { status: 200, body: { message: 'Success', reason: 'We have received your message' } };
  });
