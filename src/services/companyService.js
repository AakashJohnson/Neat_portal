// Port of the routed actions of Api\CompanyController (getProducts,
// submitProductDetails). The remaining 30+ CompanyController methods are not
// routed in routes/api.php and are listed as "not exposed" in API_MAPPING.md.
import { db, table } from '../database/knex.js';
import { legacyAuthenticate, LegacyResponse } from './auth/legacyAuth.js';
import { assertOwnApplication } from './auth/hardening.js';
import { legacyRun } from './legacyErrors.js';
import { nowSql } from '../utils/time.js';
import { looseEq, phpEmpty } from '../utils/php.js';

const ok = (body) => ({ status: 200, body });
const KEYS = ['user_id', 'uuid', 'email'];
const ADMIN_ROLE = 1;

/** POST /api/getProducts {application_number} — public in Laravel (SEC-IDOR-03). */
export const getProducts = (req, { application_number }) =>
  legacyRun(async () => {
    await assertOwnApplication(req, application_number);
    const p = table('product');
    const d = table('product_details');
    const products = await db(p)
      .leftJoin(d, `${p}.neat_id`, '=', `${d}.neat_id`)
      .where(`${p}.neat_id`, application_number)
      .where(`${p}.product_active`, 'Yes')
      .distinct({ name: `${d}.course_name`, code: `${d}.code`, course_logo_name: `${d}.course_logo_name`, course_logo_file: `${d}.course_logo_file` });
    return ok({ message: 'Success', products });
  }).then((r) => (r.status === 200 && r.body?.message === 'Error' && r.body.reason !== undefined ? ok({ message: 'Error' }) : r));

/**
 * POST /api/submitProductDetails — company edits a product page.
 * Quirk preserved: an unknown code answers {"message":"Exists"}.
 * DEV-09: the original let any logged-in user edit any product; the port
 * requires the product to belong to the token's company (or an admin token).
 */
export const submitProductDetails = (req, input) =>
  legacyRun(async () => {
    const { payload } = await legacyAuthenticate(req, KEYS, { payloadFirst: true });
    const details = () => db(table('product_details'));

    const [{ n }] = await details().where('code', input.code ?? null).count({ n: '*' });
    if (Number(n) === 0) return ok({ message: 'Exists' });

    const product = await details().where('code', input.code).first('neat_id');
    if (Number(payload.role_id) !== ADMIN_ROLE && !looseEq(product.neat_id, payload.application_number)) {
      throw new LegacyResponse(403, { message: 'Error', reason: 'Forbidden' });
    }

    await details()
      .where('code', input.code)
      .update({
        updated_at: nowSql(),
        application_number: input.application_number ?? null,
        product_highlights: input.product_highlights ?? null,
        product_category: input.product_category ?? null,
        pre_requisites: input.pre_requisites ?? null,
        course_deliverables: input.course_deliverables ?? null,
        faqs: input.faqs ?? null,
        refund_policy: input.refund_policy ?? null,
        additional_cost: input.additional_cost ?? null,
        course_duration: input.course_duration ?? null,
        minimum_batch: input.minimum_batch ?? null,
        course_start_date: input.course_start_date ?? null,
        course_end_date: input.course_end_date ?? null,
        interactive_session: input.interactive_session ?? null,
        examination_dates: input.examination_dates ?? null,
        terms_conditions: input.terms_conditions ?? null,
        short_description: input.short_description ?? null,
        short_description_sidebar: input.short_description_sidebar ?? null,
        requirements_heading: input.requirements_heading ?? null,
        requirements_description: input.requirements_description ?? null,
        description_heading: input.description_heading ?? null,
        description: input.description ?? null,
        payment_link: phpEmpty(input.payment_link) ? '0' : input.payment_link,
        product_direct_url: phpEmpty(input.product_direct_url) ? '0' : input.product_direct_url,
        isDetailsSubmitted: 'Yes',
      });
    return ok({ message: 'Success' });
  });
