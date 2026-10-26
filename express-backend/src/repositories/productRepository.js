import { db, table } from '../database/knex.js';

/**
 * The listing query shared by every CourseController catalog endpoint:
 *   select product_details.*, product.name
 *   from product_details join product on product_details.code = product.code
 *   where isDetailsSubmitted = 'Yes' and product_active = 'Approved'
 */
export function approvedProductsQuery() {
  return db(table('product_details'))
    .select(`${table('product_details')}.*`, `${table('product')}.name`)
    .join(table('product'), `${table('product_details')}.code`, '=', `${table('product')}.code`)
    .where(`${table('product_details')}.isDetailsSubmitted`, 'Yes')
    .where(`${table('product_details')}.product_active`, 'Approved');
}


export const inRandomOrder = (q) => q.orderByRaw('RAND()');

/** `->where(function ($q) { company_name like %x% or course_name like %x% })` */
export function whereCompanyOrCourseLike(q, term) {
  const like = `%${term ?? ''}%`;
  return q.where((w) =>
    w.where(`${table('product_details')}.company_name`, 'like', like).orWhere(`${table('product_details')}.course_name`, 'like', like),
  );
}

/** `->distinct('product_bucket')->...->orderBy('product_bucket')->get('product_bucket')` */
export function approvedBuckets(productType) {
  const q = db(table('product_details')).distinct('product_bucket').where('product_active', 'Approved').where('isDetailsSubmitted', 'Yes');
  if (productType) q.where('product_type', productType);
  return q.orderBy('product_bucket', 'asc');
}

export const findDetailsByCode = (code) => db(table('product_details')).where('code', code).first();
export const findProductByCode = (code) => db(table('product')).where('code', code).first();
