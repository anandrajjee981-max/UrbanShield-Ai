import { Router } from 'express';
import * as adminAuthorityController from '../controller/admin-authority.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  rejectAuthorityApplicationSchema,
  verifyAuthorityApplicationSchema,
} from '../validation/authority.schema.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Admin authority verification routes
 * (`/api/admin/authority-applications/...`).
 *
 * Every route on this router runs the same two guards, in this order:
 *
 *   1. `authenticate` - reads the JWT from the HTTP-only cookie and sets
 *      `req.user`. No cookie is a 401, and the role is taken from the verified
 *      token, never from a header or a body field.
 *   2. `requireRole`  - compares that role against ADMIN. A signed-in CITIZEN or
 *      AUTHORITY gets a 403 here and never reaches a controller, so no candidate
 *      can read another applicant's personal data, open a private document, or
 *      verify or reject anybody.
 *
 * The status transitions are separate actions (`/verify`, `/reject`) rather than one
 * `PATCH /:applicationId` with a `status` field, so there is no endpoint from which
 * a client can choose an arbitrary status. Both action bodies are `.strict()` Zod
 * objects, which is the second line of defence: a `verificationStatus`, `role` or
 * `adminId` field in the body is a 400 even for an admin.
 */
const adminAuthorityRouter = Router();

/** The only role allowed to review authority applications. */
const ADMIN_ONLY: UserRole[] = ['ADMIN'];

adminAuthorityRouter.get('/', authenticate, requireRole(...ADMIN_ONLY), adminAuthorityController.listApplications);

adminAuthorityRouter.get(
  '/:applicationId',
  authenticate,
  requireRole(...ADMIN_ONLY),
  adminAuthorityController.getApplication,
);

/**
 * GET /api/admin/authority-applications/:applicationId/audit - the decision history.
 *
 * No ordering concern with `/:applicationId` above: Express matches a path
 * parameter against exactly one segment, so `/:applicationId` can never swallow
 * the two-segment `/:applicationId/audit`.
 */
adminAuthorityRouter.get(
  '/:applicationId/audit',
  authenticate,
  requireRole(...ADMIN_ONLY),
  adminAuthorityController.getAuditTrail,
);

adminAuthorityRouter.patch(
  '/:applicationId/verify',
  authenticate,
  requireRole(...ADMIN_ONLY),
  validateBody(verifyAuthorityApplicationSchema),
  adminAuthorityController.verifyApplication,
);

adminAuthorityRouter.patch(
  '/:applicationId/reject',
  authenticate,
  requireRole(...ADMIN_ONLY),
  validateBody(rejectAuthorityApplicationSchema),
  adminAuthorityController.rejectApplication,
);

export default adminAuthorityRouter;