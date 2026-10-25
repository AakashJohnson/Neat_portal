// Endpoints the Angular services called with `?token=` + localStorage token
// (extracted from src/app/Services/*.service.ts). The client marks these
// requests with an empty `token` parameter; the BFF replaces it with the
// session JWT, or with the string "null" when there is no session — exactly
// what Angular sent when localStorage had no token. Endpoints not listed were
// called without a token and are proxied without one. Hardened purchase-list
// endpoints also require the current session even though Angular omitted it.
export const TOKEN_ENDPOINTS = new Set([
  'addComment', 'addReplyToComment', 'addToCart', 'allocateseat', 'applyForFreeCourse', 'applyForPaidCourse',
  'assignFreeCourse', 'assignPaidCourse', 'changeProductStatus', 'checkCompanySecretCode', 'checkFileUpload',
  'checkStudentExists', 'checkStudentSecretCode', 'displayCart', 'displayPaidProducts', 'allocated-seat', 'ecxelUpload', 'editInstituteDetails',
  'editLearnerDetails', 'editProductDetails', 'editStudentDetails', 'exportAsExcel', 'free-seat-student',
  'getAdminCounts', 'getAdminLearners', 'getAdminProducts', 'getAdminStudents', 'getCollegeNames', 'getComments',
  'getCompanies', 'getCompanyWiseProduct', 'getCounts', 'getCourseWiseProduct', 'getFile', 'getFileExtension',
  'getInstituteDetails', 'getInstitutes', 'getInstitutesWithStudentsForExcel', 'getLearnerDetails',
  'getProductDetails', 'getProductFlags', 'getProducts', 'getProductsForAllocation', 'getStudentDetails',
  'getStudentEligibility', 'getStudentTransactionIds', 'getStudents', 'getUsersExcel', 'mou-list',
  'getPurchasedProducts', 'getFreeProducts', 'getAppliedProducts',
  'paymentFailure', 'paymentRedirect', 'paymentSuccess', 'product-list', 'product-management',
  'sendFreeAllocationMail', 'sendFreeSeatVerificationMail', 'submitFeedback', 'submitInstituteDetails',
  'submitLearnerDetails', 'submitProductDetails', 'submitStudentDetails', 'submitStudentDetailsFromInstitute',
  'submitTransactionId', 'update-mou-date', 'uploadExcelPaid', 'verifyUserLoggedIn',
]);
