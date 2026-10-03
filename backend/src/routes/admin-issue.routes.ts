import { Router } from 'express';
import * as adminIssueController from '../controller/admin-issue.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { rejectIssueSchema, verifyIssueSchema } from '../validation/admin-issue.schema.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Admin issue review routes.
 *
 * Every route on this router runs the same two guards, in this order:
 *
 *   1. `authenticate`     - reads the JWT from the HTTP-only cookie and sets
 *                           `req.user`. No cookie is a 401, and the role is
 *                           taken from the verified token, never from a header or
 *                           a body field.
 *   2. `requireRole`      - compares that role against ADMIN. A signed-in
 *                           CITIZEN or AUTHORITY gets a 403 here and never
 *                           reaches a controller.
 *
 * The status transitions are separate actions (`/verify`, `/reject`) rather than
 * one `PATCH /:issueId` with a `status` field, so there is no endpoint from which
 * a client can choose an arbitrary status. Both action bodies are `.strict()`
 * Zod objects, which is the second line of defence: a `verifiedBy` or `status`
 * field in the body is a 400 even for an admin.
 */
const adminIssueRouter = Router();

/** The only role allowed to review citizen reports. */
const ADMIN_ONLY: UserRole[] = ['ADMIN'];

adminIssueRouter.get('/', authenticate, requireRole(...ADMIN_ONLY), adminIssueController.listIssues);

adminIssueRouter.get('/:issueId', authenticate, requireRole(...ADMIN_ONLY), adminIssueController.getIssue);

adminIssueRouter.patch(
  '/:issueId/verify',
  authenticate,
  requireRole(...ADMIN_ONLY),
  validateBody(verifyIssueSchema),
  adminIssueController.verifyIssue,
);

adminIssueRouter.patch(
  '/:issueId/reject',
  authenticate,
  requireRole(...ADMIN_ONLY),
  validateBody(rejectIssueSchema),
  adminIssueController.rejectIssue,
);

export default adminIssueRouter;
