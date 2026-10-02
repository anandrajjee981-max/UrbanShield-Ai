import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import * as issueController from '../controller/issue.controller.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadIssueImage } from '../middleware/upload.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { TooManyRequestsError } from '../utils/api-error.js';
import { createIssueSchema } from '../validation/issue.schema.js';



const issueRouter = Router();


const issueCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.ISSUE_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? 'anonymous'),
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many issue reports submitted. Please try again in a minute'));
  },
});

/**
 * Photos are throttled harder than reports. Every upload costs a full round trip
 * to ImageKit and stores the bytes, and the evidence step of the report wizard
 * only ever needs one photo per attempt - so a burst far above that is abuse,
 * not a citizen.
 */
const issueUploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.ISSUE_UPLOAD_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? 'anonymous'),
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many images uploaded. Please try again in a minute'));
  },
});

/** POST /api/issues */
issueRouter.post(
  '/',
  authenticate,
  issueCreateLimiter,
  uploadIssueImage,
  validateBody(createIssueSchema),
  issueController.createIssue,
);

/** POST /api/issues/upload - returns the imageUrl to send with the issue. */
issueRouter.post(
  '/upload',
  authenticate,
  issueUploadLimiter,
  uploadIssueImage,
  issueController.uploadIssuePhoto,
);

/** GET /api/issues/my */
issueRouter.get('/my', authenticate, issueController.listMyIssues);

export default issueRouter;
