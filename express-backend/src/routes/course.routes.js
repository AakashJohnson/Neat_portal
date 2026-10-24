import { Router } from 'express';
import * as c from '../controllers/course.controller.js';

export const courseRouter = Router();

courseRouter.get('/getProductsLandingPage', c.getProductsLandingPage);
courseRouter.get('/getB2CProductsLandingPage', c.getB2CProductsLandingPage);
courseRouter.get('/getB2BProductsLandingPage', c.getB2BProductsLandingPage);
courseRouter.post('/getProductDetails', c.getProductDetails);
courseRouter.post('/getAppliedStudents', c.getAppliedStudents);
courseRouter.post('/applyForPaidCourse', c.applyForPaidCourse);
courseRouter.post('/editProductDetails', c.editProductDetails);
courseRouter.post('/addComment', c.addComment);
courseRouter.post('/getComments', c.getComments);
courseRouter.post('/addReplyToComment', c.addReplyToComment);
courseRouter.post('/getProductsForAllocation', c.getProductsForAllocation);
courseRouter.get('/getProductBuckets', c.getProductBuckets);
courseRouter.get('/getB2CProductBuckets', c.getB2CProductBuckets);
courseRouter.get('/getB2BProductBuckets', c.getB2BProductBuckets);
courseRouter.get('/getBucketWiseProducts', c.getBucketWiseProducts);
courseRouter.get('/getB2BBucketWiseProducts', c.getB2BBucketWiseProducts);
courseRouter.get('/getB2CBucketWiseProducts', c.getB2CBucketWiseProducts);
courseRouter.get('/getBucketWiseSearchProducts', c.getBucketWiseSearchProducts);
courseRouter.get('/getB2BBucketWiseSearchProducts', c.getB2BBucketWiseSearchProducts);
courseRouter.get('/getB2CBucketWiseSearchProducts', c.getB2CBucketWiseSearchProducts);
courseRouter.post('/submitB2BEnquiry', c.submitB2BEnquiry);
courseRouter.get('/getHomePageCounter', c.getHomePageCounter);

// UNRESOLVED (R-03): routed in Laravel but the controller methods do not exist —
// applyForFreeCourse, assignFreeCourse, assignPaidCourse, addToCart, displayCart,
// displayPaidProducts. Handled in routes/unresolved.routes.js.
