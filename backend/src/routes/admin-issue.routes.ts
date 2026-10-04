import { Router } from 'express';
import * as adminIssueController from '../controller/admin-issue.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Admin issue *monitoring* routes (`/api/admin/issues/...`).
 *
 * Every route on this router runs the same two guards, in this order:
 *
 *   1. `authenticate` - reads the JWT from the HTTP-only cookie and sets
 *                       `req.user`. No cookie is a 401, and the role is taken from
 *                       the verified token, never from a header or a body field.
 *   2. `requireRole`  - compares that role against ADMIN. A signed-in CITIZEN or
 *                       AUTHORITY gets a 403 here and never reaches a controller.
 *
 * This router is read-only, and that is deliberate: verifying and rejecting
 * citizen issues is an authority responsibility, and it lives in
 * routes/authority-issue.routes.ts behind `requireVerifiedAuthority()`.
 *
 * There is no `PATCH /:issueId/verify`, no `/reject`, and no free-form
 * `PATCH /:issueId` with a `status` field, so there is no admin endpoint from which
 * an issue status can be changed at all. A client that still calls the old paths
 * gets a 404 rather than a silent success, which is why the old admin verify
 * handlers were deleted instead of being left to return an error.
 */
const adminIssueRouter = Router();

/** The only role allowed to monitor the issue queue. */
const ADMIN_ONLY: UserRole[] = ['ADMIN'];

adminIssueRouter.get('/', authenticate, requireRole(...ADMIN_ONLY), adminIssueController.listIssues);

adminIssueRouter.get('/:issueId', authenticate, requireRole(...ADMIN_ONLY), adminIssueController.getIssue);

export default adminIssueRouter;