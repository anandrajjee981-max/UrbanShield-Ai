import { Router } from 'express';
import * as authorityController from '../controller/authority.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { resolveIssueSchema } from '../validation/workflow.schema.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Authority field-workflow routes.
 *
 *   GET   /api/authority/issues               - tasks assigned to me
 *   GET   /api/authority/issues/browse        - every citizen report (read-only)
 *   PATCH /api/authority/issues/:issueId/start   - ASSIGNED -> IN_PROGRESS
 *   PATCH /api/authority/issues/:issueId/resolve - IN_PROGRESS -> RESOLVED
 *
 * Every route runs `authenticate` + `requireRole('AUTHORITY')`, and the owner
 * id is read from the JWT (`req.user.userId`), never from the body - so an
 * authority can only ever list, start or resolve their own tasks. The resolve
 * body carries an optional field note; `{}` and no body are both accepted.
 *
 * `/browse` is registered before `/:issueId` routes so "browse" is never
 * mistaken for an issue id.
 */
const authorityIssueRouter = Router();

/** The only role allowed to work field tasks. */
const AUTHORITY_ONLY: UserRole[] = ['AUTHORITY'];

authorityIssueRouter.get('/', authenticate, requireRole(...AUTHORITY_ONLY), authorityController.listTasks);

authorityIssueRouter.get('/browse', authenticate, requireRole(...AUTHORITY_ONLY), authorityController.browseReports);

authorityIssueRouter.patch(
  '/:issueId/start',
  authenticate,
  requireRole(...AUTHORITY_ONLY),
  authorityController.startTask,
);

authorityIssueRouter.patch(
  '/:issueId/resolve',
  authenticate,
  requireRole(...AUTHORITY_ONLY),
  validateBody(resolveIssueSchema),
  authorityController.resolveTask,
);

export default authorityIssueRouter;
