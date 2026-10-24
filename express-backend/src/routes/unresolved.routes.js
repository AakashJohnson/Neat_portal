// R-03 UNRESOLVED: routes registered in Laravel's routes/api.php whose
// controller methods do not exist. In production every call fails with
// BadMethodCallException → HTTP 500. The port answers the same status (DEV-04
// body) instead of inventing behaviour. Intended behaviour must be confirmed by
// the owner before these are implemented (MIGRATION_TRACKER: UNRESOLVED).
import { Router } from 'express';

export const UNRESOLVED_ROUTES = Object.freeze([
  ['post', '/getCounts', 'CompanyController@getCounts'],
  ['post', '/getProductFlags', 'CompanyController@getProductFlags'],
  ['get', '/getStudentTransactionIds', 'CompanyController@getStudentTransactionIds'],
  ['get', '/product-list', 'CompanyController@getcompanyProductList'],
  ['get', '/getStudentEligibility', 'StudentController@getStudentEligibility'],
  ['post', '/submitTransactionId', 'StudentController@submitTransactionId'],
  ['post', '/sendFreeAllocationMail', 'StudentController@sendFreeAllocationMail'],
  ['post', '/applyForFreeCourse', 'CourseController@applyForFreeCourse'],
  ['post', '/assignFreeCourse', 'CourseController@assignFreeCourse'],
  ['post', '/assignPaidCourse', 'CourseController@assignPaidCourse'],
  ['post', '/addToCart', 'CourseController@addToCart'],
  ['post', '/displayCart', 'CourseController@displayCart'],
  ['post', '/displayPaidProducts', 'CourseController@displayPaidProducts'],
  ['post', '/allocateseat', 'ProductController@allocateseat'],
  ['get', '/allocated-seat', 'ProductController@allotedSeat'],
  ['post', '/resendEmailVerificationLink', 'ProductController@checkEmailStatus'],
  ['post', '/paymentRedirect', 'PaymentController@paymentRedirect'],
]);

export const unresolvedRouter = Router();

for (const [method, path] of UNRESOLVED_ROUTES) {
  unresolvedRouter[method](path, (_req, res) => res.status(500).json({ message: 'Server Error' }));
}
