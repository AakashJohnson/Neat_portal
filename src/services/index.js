'use client';
// Port of src/app/Services/*.service.ts. Same method names and endpoints; the
// `token` argument is gone because the BFF attaches the JWT from the httpOnly
// cookie. Every method resolves to { status, ok, data } (see lib/api.js).
import { api } from '@/lib/api';

export const jarwisService = {
  signUp: (data) => api.post('/register', data),
  sendPasswordResetLink: (data) => api.post('/sendPasswordResetLink', data),
  changePassword: (data) => api.post('/resetPassword', data),
  emailVerification: (data) => api.post('/emailVerification', data),
  otpVerification: (data) => api.post('/otpVerification', data),
  resendEmailVerificationLink: (data) => api.post('/resendEmailVerificationLink', data),
};

export const companyService = {
  getCounts: (data) => api.post('/getCounts', data),
  getProducts: (data) => api.post('/getProducts', data),
  getProductsLandingPage: () => api.get('/getProductsLandingPage'),
  getB2BProductsLandingPage: () => api.get('/getB2BProductsLandingPage'),
  getB2CProductsLandingPage: () => api.get('/getB2CProductsLandingPage'),
  getProductBuckets: () => api.get('/getProductBuckets'),
  getB2BProductBuckets: () => api.get('/getB2BProductBuckets'),
  getB2CProductBuckets: () => api.get('/getB2CProductBuckets'),
  getBucketWiseProducts: (bucket) => api.getRaw('/getBucketWiseProducts', 'bucket=' + bucket),
  getB2BBucketWiseProducts: (bucket) => api.getRaw('/getB2BBucketWiseProducts', 'bucket=' + bucket),
  getB2CBucketWiseProducts: (bucket) => api.getRaw('/getB2CBucketWiseProducts', 'bucket=' + bucket),
  getBucketWiseSearchProducts: (bucket) => api.getRaw('/getBucketWiseSearchProducts', 'bucket=' + bucket),
  getB2BBucketWiseSearchProducts: (bucket) => api.getRaw('/getB2BBucketWiseSearchProducts', 'bucket=' + bucket),
  getB2CBucketWiseSearchProducts: (bucket) => api.getRaw('/getB2CBucketWiseSearchProducts', 'bucket=' + bucket),
  getProductFlags: (data) => api.post('/getProductFlags', data),
  submitProductDetails: (data) => api.post('/submitProductDetails', data),
  getStudentTransactionIds: () => api.get('/getStudentTransactionIds'),
  editProductDetails: (data) => api.post('/editProductDetails', data),
  productList: () => api.get('/product-list'),
  getHomePageCounter: () => api.get('/getHomePageCounter'),
};

export const courseService = {
  getProductDetails: (data) => api.post('/getProductDetails', data),
  applyForFreeCourse: (data) => api.post('/applyForFreeCourse', data),
  applyForPaidCourse: (data) => api.post('/applyForPaidCourse', data),
  getProductsForAllocation: (data) => api.post('/getProductsForAllocation', data),
  assignFreeCourse: (data) => api.post('/assignFreeCourse', data),
  assignPaidCourse: (data) => api.post('/assignPaidCourse', data),
  getComments: (data) => api.post('/getComments', data),
  addComment: (data) => api.post('/addComment', data),
  addReplyToComment: (data) => api.post('/addReplyToComment', data),
  addToCart: (data) => api.post('/addToCart', data),
  displayCart: (data) => api.post('/displayCart', data),
  submitB2BEnquiry: (data) => api.post('/submitB2BEnquiry', data),
};

export const studentService = {
  checkStudentExists: (data) => api.post('/checkStudentExists', data),
  getStudentDetails: () => api.get('/getStudentDetails'),
  submitStudentDetails: (data) => api.post('/submitStudentDetails', data),
  getFaqs: (data) => api.post('/getFaqs', data),
  getFaqsHindi: (data) => api.post('/getFaqsHindi', data),
  getPurchasedProducts: (data) => api.post('/getPurchasedProducts', data),
  getFreeProducts: (data) => api.post('/getFreeProducts', data),
  getStudentEligibility: () => api.get('/getStudentEligibility'),
  getAppliedProducts: (data) => api.post('/getAppliedProducts', data),
  submitTransactionId: (data) => api.post('/submitTransactionId', data),
  sendFreeAllocationMail: (data) => api.post('/sendFreeAllocationMail', data),
  sendFreeSeatVerificationMail: (data) => api.post('/sendFreeSeatVerificationMail', data),
  checkCompanySecretCode: (data) => api.post('/checkCompanySecretCode', data),
  checkStudentSecretCode: (data) => api.post('/checkStudentSecretCode', data),
  submitLearnerDetails: (data) => api.post('/submitLearnerDetails', data),
  getLearnerDetails: () => api.get('/getLearnerDetails'),
  getCollegeNames: (data) => api.post('/getCollegeNames', data),
  editLearnerDetails: () => api.get('/editLearnerDetails'),
  editStudentDetails: () => api.get('/editStudentDetails'),
  getStates: () => api.get('/getStates'),
  checkFileUpload: () => api.get('/checkFileUpload'),
};

export const instituteService = {
  uploadExcel: (rows) => api.post('/ecxelUpload', rows),
  uploadExcelPaid: (rows) => api.post('/uploadExcelPaid', rows),
  submitInstituteDetails: (data) => api.post('/submitInstituteDetails', data),
  submitStudentDetailsFromInstitute: (data) => api.post('/submitStudentDetailsFromInstitute', data),
  verifyUser: () => api.get('/verifyUserLoggedIn'),
  getStudents: (data) => api.post('/getStudents', data),
  getInstituteDetails: () => api.get('/getInstituteDetails'),
  editInstituteDetails: () => api.get('/editInstituteDetails'),
};

export const adminService = {
  getAdminCounts: () => api.get('/getAdminCounts'),
  getStudents: (page, perPage, search) => api.getRaw('/getAdminStudents', 'page=' + page + '&per_page=' + perPage + '&search=' + encodeURIComponent(search)),
  getLearners: (page, perPage, search) => api.getRaw('/getAdminLearners', 'page=' + page + '&per_page=' + perPage + '&search=' + encodeURIComponent(search)),
  getAdminProducts: () => api.get('/getAdminProducts'),
  getCompanies: () => api.get('/getCompanies'),
  getInstitutes: () => api.get('/getInstitutes'),
  getCompanyWiseProduct: (data) => api.post('/getCompanyWiseProduct', data),
  changeProductStatus: (data) => api.post('/changeProductStatus', data),
  allocateseat: (data) => api.post('/allocateseat', data),
  getFreeSeatStudent: () => api.get('/free-seat-student'),
  getMouList: () => api.get('/mou-list'),
  getProductList: () => api.get('/product-management'),
  getCompanyDetails: (neatId) => api.getRaw('/getCompanyDetails', 'neat_id=' + neatId),
  getCourseWiseProduct: (data) => api.post('/getCourseWiseProduct', data),
  updateMouDate: (neatId, date) => api.post('/update-mou-date', { neat_id: neatId, mou_date: date }),
};

export const grievanceService = {
  submitGrievance: (data) => api.post('/submitGrievance', data),
  submitFeedback: (data) => api.post('/submitFeedback', data),
  submitContactUs: (data) => api.post('/submitContactUs', data),
  getAnnouncements: () => api.get('/getAnnouncements'),
  getDetailArticle: (id) => api.getRaw('/get-details-article', 'id=' + id),
};

export const paymentService = {
  paymentRedirect: (data) => api.post('/paymentRedirect', data),
  paymentSuccess: (data) => api.post('/paymentSuccess', data),
  paymentFailure: (data) => api.post('/paymentFailure', data),
};

export const excelService = {
  getInstitutesWithStudents: () => api.get('/getInstitutesWithStudentsForExcel'),
  getUsers: (roleId) => api.get('/getUsersExcel', { role_id: roleId }),
};

export const fileService = {
  saveFile: (formData) => api.post('/uploadFile', formData),
  updateFileFlags: (data) => api.post('/getFileFlags', data),
  deleteFile: (formData) => api.post('/deleteFile', formData),
  getFile: (data) => api.post('/getFile', data),
  getFileExtension: (data) => api.post('/getFileExtension', data),
  exportAsExcel: () => api.get('/exportAsExcel'),
};
