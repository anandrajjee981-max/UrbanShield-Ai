import { Router } from 'express';
import * as adminTaskController from '../controller/admin-task.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { adminAssignTaskSchema } from '../validation/task.schema.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Admin "My Tasks" routes (`/api/admin/tasks`).
 *
 * Work items (AI service failures, no-eligible-authority, assignment failures)
 * are created only by the background workflow - this router is read-only for
 * them, so a client can never fabricate or edit one. Same guard pair as every
 * admin router: `authenticate` (JWT cookie -> req.user) then `requireRole(ADMIN)`.
 *
 * The retry bucket is the exception: `POST /queue/resend` lets the Admin push
 * stuck material (issues the AI could not accept or reject) back through the
 * pipeline. It drains what is already queued - it never invents a queue entry.
 *
 * Deliberately a separate router from admin-issue.routes.ts: work items are
 * not issues, and authority tasks (authority_tasks) never appear here.
 *
 * Route order matters: `/queue` is declared before `/:taskId`, otherwise the
 * param route would swallow it.
 */
const adminTaskRouter = Router();

const ADMIN_ONLY: UserRole[] = ['ADMIN'];

adminTaskRouter.get('/', authenticate, requireRole(...ADMIN_ONLY), adminTaskController.listTasks);

/** Authority assignments board (admin monitoring of authority_tasks). */
adminTaskRouter.get(
  '/assignments',
  authenticate,
  requireRole(...ADMIN_ONLY),
  adminTaskController.listAssignments,
);

/** Manual assignment of a VERIFIED issue to a verified authority. */
adminTaskRouter.post(
  '/assign',
  authenticate,
  requireRole(...ADMIN_ONLY),
  validateBody(adminAssignTaskSchema),
  adminTaskController.assignTask,
);

/** AI retry bucket: list what is waiting to be resent (default: PENDING). */
adminTaskRouter.get(
  '/queue',
  authenticate,
  requireRole(...ADMIN_ONLY),
  adminTaskController.listQueue,
);

/** Resend the whole bucket through Watcher -> Boss -> Assignment. */
adminTaskRouter.post(
  '/queue/resend',
  authenticate,
  requireRole(...ADMIN_ONLY),
  adminTaskController.resendQueue,
);

adminTaskRouter.get(
  '/:taskId',
  authenticate,
  requireRole(...ADMIN_ONLY),
  adminTaskController.getTask,
);

export default adminTaskRouter;
