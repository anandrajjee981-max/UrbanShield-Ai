import type { Request, Response } from 'express';
import * as adminTaskService from '../service/admin-task.service.js';
import * as aiQueueService from '../service/ai-queue.service.js';
import { resendRetryBucket } from '../ai/services/workflow.service.js';
import { NotFoundError, UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the Admin "My Tasks" endpoints (work items + AI retry bucket).
 *
 * Work items are created exclusively by the background workflow (server-side),
 * so there is no endpoint from which a client could fabricate an
 * AI_SERVICE_FAILURE or change a status - GET only. The retry bucket adds the
 * one Admin action the product needs: POST /queue/resend, which re-runs already
 * stuck material through the pipeline; it creates nothing new. Behind
 * `authenticate` + `requireRole('ADMIN')` at the route.
 */

const requireAdmin = (req: Request): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  return req.user.userId;
};

/** GET /api/admin/tasks?status=OPEN - the Admin My Tasks queue. */
const listTasksHandler = async (req: Request, res: Response): Promise<void> => {
  requireAdmin(req);

  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const tasks = await adminTaskService.listWorkItems(status);

  sendSuccess(res, 200, 'Tasks retrieved', { tasks });
};

/** GET /api/admin/tasks/:taskId - one work item. */
const getTaskHandler = async (req: Request<{ taskId: string }>, res: Response): Promise<void> => {
  requireAdmin(req);

  const task = await adminTaskService.getWorkItem(req.params.taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  sendSuccess(res, 200, 'Task retrieved', { task });
};

export const listTasks = asyncHandler(listTasksHandler);
export const getTask = asyncHandler(getTaskHandler);

/**
 * GET /api/admin/tasks/queue?status=PENDING - the AI retry bucket: the issue
 * material the pipeline could not decide on (AI unavailable/timeout/quota),
 * waiting to be resent. Default view is PENDING, i.e. what a resend would send.
 */
const listQueueHandler = async (req: Request, res: Response): Promise<void> => {
  requireAdmin(req);

  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const entries = await aiQueueService.listQueue(status);

  sendSuccess(res, 200, 'Retry queue retrieved', { entries });
};

/**
 * POST /api/admin/tasks/queue/resend - drains the bucket back through
 * Watcher -> Boss -> Assignment. Sequential by design: one Gemini call at a
 * time, so a resend cannot trip the provider's rate limit, and it returns a
 * count summary rather than per-entry output. Admin-triggered only.
 */
const resendQueueHandler = async (_req: Request, res: Response): Promise<void> => {
  const result = await resendRetryBucket();

  sendSuccess(res, 200, 'Retry queue resend completed', { ...result });
};

export const listQueue = asyncHandler(listQueueHandler);
export const resendQueue = asyncHandler(resendQueueHandler);
