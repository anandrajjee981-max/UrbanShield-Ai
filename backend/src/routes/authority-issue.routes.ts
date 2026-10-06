import { Router } from 'express';
import * as authorityIssueController from '../controller/authority-issue.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { rejectIssueSchema, verifyIssueSchema } from '../validation/issue-review.schema.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Authority issue review routes (`/api/authority/issues/...`).
 *
 * Every route on this router runs the same two guards, in this order:
 *
 *   1. `authenticate`            - reads the JWT from the HTTP-only cookie and sets
 *                                  `req.user`. No cookie is a 401, and the role is
 *                                  taken from the verified token, never from a
 *                                  header or a body field.
 *   2. `requireRole('AUTHORITY')` - only AUTHORITY accounts may access the review
 *                                  queue. Verification status does not restrict
 *                                  viewing, verifying or rejecting issues.
 *
 * The transitions are separate actions (`/verify`, `/reject`) rather than one
 * `PATCH /:issueId` with a `status` field, so there is no endpoint from which a
 * client can choose an arbitrary status. Both action bodies are `.strict()` Zod
 * objects, which is the second line of defence: a `verifiedBy` or `status` field
 * in the body is a 400 even for an AUTHORITY account.
 */
const authorityIssueRouter = Router();

/** The only role that may review citizen reports. */
const AUTHORITY_ONLY: UserRole[] = ['AUTHORITY'];

/** Applies the guards above to a single route. */
const authorityOnly = [
  authenticate,
  requireRole(...AUTHORITY_ONLY),
];

/** GET /api/authority/issues - the issues waiting for authority review. */
authorityIssueRouter.get('/', ...authorityOnly, authorityIssueController.listIssues);

/** GET /api/authority/issues/:issueId - one issue in full. */
authorityIssueRouter.get('/:issueId', ...authorityOnly, authorityIssueController.getIssue);

/** PATCH /api/authority/issues/:issueId/verify - REPORTED -> VERIFIED. */
authorityIssueRouter.patch(
  '/:issueId/verify',
  ...authorityOnly,
  validateBody(verifyIssueSchema),
  authorityIssueController.verifyIssue,
);

/** PATCH /api/authority/issues/:issueId/reject - REPORTED -> REJECTED. */
authorityIssueRouter.patch(
  '/:issueId/reject',
  ...authorityOnly,
  validateBody(rejectIssueSchema),
  authorityIssueController.rejectIssue,
);

export default authorityIssueRouter;