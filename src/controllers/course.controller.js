import { asyncHandler, send } from '../http/asyncHandler.js';
import * as course from '../services/courseService.js';
import { input } from '../utils/request.js';

const bucketOf = (req) => input(req, 'bucket').bucket;

export const getProductsLandingPage = asyncHandler(async (_req, res) => send(res, await course.getProductsLandingPage()));
export const getB2BProductsLandingPage = asyncHandler(async (_req, res) => send(res, await course.getB2BProductsLandingPage()));
export const getB2CProductsLandingPage = asyncHandler(async (_req, res) => send(res, await course.getB2CProductsLandingPage()));

export const getBucketWiseProducts = asyncHandler(async (req, res) => send(res, await course.getBucketWiseProducts(bucketOf(req), null)));
export const getB2BBucketWiseProducts = asyncHandler(async (req, res) => send(res, await course.getBucketWiseProducts(bucketOf(req), 'B2B')));
export const getB2CBucketWiseProducts = asyncHandler(async (req, res) => send(res, await course.getBucketWiseProducts(bucketOf(req), 'B2C')));


export const getBucketWiseSearchProducts = asyncHandler(async (req, res) => send(res, await course.getBucketWiseSearchProducts(bucketOf(req), null)));
export const getB2BBucketWiseSearchProducts = asyncHandler(async (req, res) => send(res, await course.getBucketWiseSearchProducts(bucketOf(req), null)));
export const getB2CBucketWiseSearchProducts = asyncHandler(async (req, res) => send(res, await course.getBucketWiseSearchProducts(bucketOf(req), 'B2C')));

export const getProductBuckets = asyncHandler(async (_req, res) => send(res, await course.getProductBuckets(null)));
export const getB2BProductBuckets = asyncHandler(async (_req, res) => send(res, await course.getProductBuckets('B2B')));
export const getB2CProductBuckets = asyncHandler(async (_req, res) => send(res, await course.getProductBuckets('B2C')));

export const getHomePageCounter = asyncHandler(async (_req, res) => send(res, await course.getHomePageCounter()));
export const getProductsForAllocation = asyncHandler(async (_req, res) => send(res, await course.getProductsForAllocation()));

export const getProductDetails = asyncHandler(async (req, res) => send(res, await course.getProductDetails(req, input(req, 'code'))));

export const addComment = asyncHandler(async (req, res) => send(res, await course.addComment(req, input(req, 'comment', 'course_id', 'type'))));
export const getComments = asyncHandler(async (req, res) => send(res, await course.getComments(req, input(req, 'code', 'count'))));
export const addReplyToComment = asyncHandler(async (req, res) => send(res, await course.addReplyToComment(req, input(req, 'comment_id', 'reply'))));

export const editProductDetails = asyncHandler(async (req, res) => send(res, await course.editProductDetails(req, input(req, 'code'))));
export const getAppliedStudents = asyncHandler(async (req, res) => send(res, await course.getAppliedStudents(req, input(req, 'code'))));

export const submitB2BEnquiry = asyncHandler(async (req, res) =>
  send(
    res,
    await course.submitB2BEnquiry(
      input(req, 'neat_id', 'product_code', 'college_representative_name', 'designation', 'college_name', 'college_email', 'no_of_seats', 'mobile_number', 'message'),
    ),
  ),
);

export const applyForPaidCourse = asyncHandler(async (req, res) => send(res, await course.applyForPaidCourse(req, input(req, 'code', 'quantity'))));
