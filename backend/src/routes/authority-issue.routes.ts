import { Router } from 'express';
import * as authorityIssueController from '../controller/authority-issue.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { requireVerifiedAuthority } from '../middleware/authority.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { rejectIssueSchema, verifyIssueSchema } from '../validation/issue-review.schema.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Authority issue review routes (`/api/authority/issues/...`).
 *
 * Every route on this router runs the same three guards, in this order:
 *
 *   1. `authenticate`            - reads the JWT from the HTTP-only cookie and sets
 *                                  `req.user`. No cookie is a 401, and the role is
 *                                  taken from the verified token, never from a
 *                                  header or a body field.
 *   2. `requireRole('AUTHORITY')` - a CITIZEN or an ADMIN gets a 403 here and never
 *                                  reaches a controller. Registering as AUTHORITY is
 *                                  what makes someone a *candidate*; it grants
 *                                  nothing on its own.
 *   3. `requireVerifiedAuthority()` - the condition `requireRole` cannot express:
 *                                  role = AUTHORITY **and**
 *                                  verificationStatus = VERIFIED in the database. A
 *                                  PENDING or REJECTED candidate gets a 403 with
 *                                  AUTHORITY_NOT_VERIFIED, so registering as an
 *                                  authority is never enough to review a citizen
 *                                  issue - an admin has to verify the applicant
 *                                  first.
 *
 * The guard reads the status from the database rather than from the JWT on every
 * request (see src/middleware/authority.middleware.ts for why), which is also what
 * means a client cannot talk its way in by sending `status: 'VERIFIED'`.
 *
 * The transitions are separate actions (`/verify`, `/reject`) rather than one
 * `PATCH /:issueId` with a `status` field, so there is no endpoint from which a
 * client can choose an arbitrary status. Both action bodies are `.strict()` Zod
 * objects, which is the second line of defence: a `verifiedBy` or `status` field
 * in the body is a 400 even for a verified authority.
 */
const authorityIssueRouter = Router();

/** The only role that may review citizen reports. */
const AUTHORITY_ONLY: UserRole[] = ['AUTHORITY'];

/** Applies the three guards above to a single route. */
const verifiedAuthorityOnly = [
  authenticate,
  requireRole(...AUTHORITY_ONLY),
  requireVerifiedAuthority(),
];

/** GET /api/authority/issues - the issues waiting for authority review. */
authorityIssueRouter.get('/', ...verifiedAuthorityOnly, authorityIssueController.listIssues);

/** GET /api/authority/issues/:issueId - one issue in full. */
authorityIssueRouter.get('/:issueId', ...verifiedAuthorityOnly, authorityIssueController.getIssue);

/** PATCH /api/authority/issues/:issueId/verify - REPORTED -> VERIFIED. */
authorityIssueRouter.patch(
  '/:issueId/verify',
  ...verifiedAuthorityOnly,
  validateBody(verifyIssueSchema),
  authorityIssueController.verifyIssue,
);

/** PATCH /api/authority/issues/:issueId/reject - REPORTED -> REJECTED. */
authorityIssueRouter.patch(
  '/:issueId/reject',
  ...verifiedAuthorityOnly,
  validateBody(rejectIssueSchema),
  authorityIssueController.rejectIssue,
);

export default authorityIssueRouter;