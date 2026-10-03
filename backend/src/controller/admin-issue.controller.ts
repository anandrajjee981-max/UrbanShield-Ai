import type { Request, RequestHandler, Response } from 'express';
import * as adminIssueService from '../service/admin-issue.service.js';
import type { RejectIssueRequest, VerifyIssueRequest } from '../validation/admin-issue.schema.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the admin issue review endpoints.
 *
 * Responsibilities, and nothing else:
 *  - read the authenticated admin from `req.user` (set by `authenticate`)
 *  - read `:issueId`, the query string and the optional rejection reason
 *  - call the service
 *  - return the response envelope
 *
 * There is no SQL, no status comparison and no ImageKit access here. In
 * particular the reviewer id is always `req.user.userId`: nothing in the request
 * body or query string can influence who the recorded admin is.
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

  const issues = await adminIssueService.listIssuesForReview(req.query);

  sendSuccess(res, 200, 'Issues retrieved', { issues });
};

/** GET /api/admin/issues/:issueId - one issue for the review screen. */
const getIssueHandler = async (req: Request<{ issueId: string }>, res: Response): Promise<void> => {
  requireAdmin(req);

  const issue = await adminIssueService.getIssueForReview(req.params.issueId);

  sendSuccess(res, 200, 'Issue retrieved', { issue });
};

/** PATCH /api/admin/issues/:issueId/verify - REPORTED -> VERIFIED. */
const verifyIssueHandler: RequestHandler<{ issueId: string }, unknown, VerifyIssueRequest> = async (req, res) => {
  const adminId = requireAdmin(req);

  const issue = await adminIssueService.verifyIssue({
    issueId: req.params.issueId,
    adminId,
  });

  sendSuccess(res, 200, 'Issue verified successfully', { issue });
};

/** PATCH /api/admin/issues/:issueId/reject - REPORTED -> REJECTED. */
const rejectIssueHandler: RequestHandler<{ issueId: string }, unknown, RejectIssueRequest> = async (req, res) => {
  const adminId = requireAdmin(req);

  const issue = await adminIssueService.rejectIssue({
    issueId: req.params.issueId,
    adminId,
    body: req.body,
  });

  sendSuccess(res, 200, 'Issue rejected successfully', { issue });
};

export const listIssues = asyncHandler(listIssuesHandler);
export const getIssue = asyncHandler(getIssueHandler);
export const verifyIssue = asyncHandler(verifyIssueHandler);
export const rejectIssue = asyncHandler(rejectIssueHandler);
