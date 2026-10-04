import type { Request, Response } from 'express';
import * as authorityService from '../service/authority.service.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the AUTHORITY field workflow:
 *
 *   GET   /api/authority/issues             - my tasks (assigned_to = me)
 *   PATCH /api/authority/issues/:issueId/start   - ASSIGNED -> IN_PROGRESS
 *   PATCH /api/authority/issues/:issueId/resolve - IN_PROGRESS -> RESOLVED
 *
 * Mounted behind `authenticate` + `requireRole('AUTHORITY')`. Thin by design:
 * the owner id is always `req.user.userId`, so an authority can only ever
 * move their own tasks.
 */

const requireAuthority = (req: Request): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  return req.user.userId;
};

const listTasksHandler = async (req: Request, res: Response): Promise<void> => {
  const authorityId = requireAuthority(req);

  const issues = await authorityService.listMyTasks(authorityId);

  sendSuccess(res, 200, 'Tasks retrieved', { issues });
};

/**
 * GET /api/authority/issues/browse - every citizen report on the city,
 * newest first, optionally filtered by `?status=`. Read-only: any issue a
 * citizen reports is visible here from REPORTED onwards.
 */
const browseReportsHandler = async (req: Request, res: Response): Promise<void> => {
  requireAuthority(req);

  const issues = await authorityService.browseAllReports(req.query);

  sendSuccess(res, 200, 'Reports retrieved', { issues });
};

const startTaskHandler = async (req: Request<{ issueId: string }>, res: Response): Promise<void> => {
  const authorityId = requireAuthority(req);

  const issue = await authorityService.startTask({ issueId: req.params.issueId, authorityId });

  sendSuccess(res, 200, 'Task started', { issue });
};

const resolveTaskHandler = async (req: Request<{ issueId: string }>, res: Response): Promise<void> => {
  const authorityId = requireAuthority(req);

  const issue = await authorityService.resolveTask({
    issueId: req.params.issueId,
    authorityId,
    body: req.body,
  });

  sendSuccess(res, 200, 'Task resolved', { issue });
};

export const listTasks = asyncHandler(listTasksHandler);
export const browseReports = asyncHandler(browseReportsHandler);
export const startTask = asyncHandler(startTaskHandler);
export const resolveTask = asyncHandler(resolveTaskHandler);
