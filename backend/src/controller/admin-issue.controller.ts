import type { Request, Response } from 'express';
import * as adminIssueService from '../service/admin-issue.service.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the admin issue *monitoring* endpoints.
 *
 * Responsibilities, and nothing else:
 *  - read the authenticated admin from `req.user` (set by `authenticate`)
 *  - read `:issueId` and the query string
 *  - call the service
 *  - return the response envelope
 *
 * There is no SQL, no status comparison and no ImageKit access here.
 *
 * There is also no verify handler and no reject handler, and that is the point of
 * this file: issue verification is an authority responsibility
 * (controller/authority-issue.controller.ts). Removing the handlers removed the
 * endpoints, so `PATCH /api/admin/issues/:issueId/verify` is now a 404 rather than
 * something the frontend has to be trusted not to call.
 *
 * The route mounts these handlers behind `authenticate` + `requireRole('ADMIN')`,
 * so a CITIZEN or AUTHORITY is turned away with a 403 before reaching this file.
 */

/**
 * The authenticated admin, or a 401 if the guard was ever skipped.
 *
 * `authenticate` guarantees `req.user` on these routes; the check is kept as a
 * fail-closed guard so a future re-mount cannot silently lose the identity.
 */
const requireAdmin = (req: Request): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  return req.user.userId;
};

/** GET /api/admin/issues - every reported issue, optionally filtered by status. */
const listIssuesHandler = async (req: Request, res: Response): Promise<void> => {
  requireAdmin(req);

  const issues = await adminIssueService.listIssuesForMonitoring(req.query);

  sendSuccess(res, 200, 'Issues retrieved', { issues });
};

/** GET /api/admin/issues/:issueId - one issue for the monitoring screen. */
const getIssueHandler = async (req: Request<{ issueId: string }>, res: Response): Promise<void> => {
  requireAdmin(req);

  const issue = await adminIssueService.getIssueForMonitoring(req.params.issueId);

  sendSuccess(res, 200, 'Issue retrieved', { issue });
};

export const listIssues = asyncHandler(listIssuesHandler);
export const getIssue = asyncHandler(getIssueHandler);