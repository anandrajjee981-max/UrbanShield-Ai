import type { Request, RequestHandler, Response } from 'express';
import * as authorityIssueService from '../service/authority-issue.service.js';
import type { RejectIssueRequest, VerifyIssueRequest } from '../validation/issue-review.schema.js';
import { ForbiddenError, UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the authority issue review endpoints.
 *
 * Responsibilities, and nothing else:
 *  - read the authenticated authority from `req.user` (set by `authenticate`)
 *  - read `:issueId`, the query string and the optional rejection reason
 *  - call the service
 *  - return the response envelope
 *
 * There is no SQL, no status comparison and no ImageKit access here. In
 * particular the reviewer id is always `req.user.userId`: nothing in the request
 * body or query string can influence who the recorded authority is.
 *
 * The route mounts these handlers behind `authenticate` + `requireRole('AUTHORITY')`,
 * so a CITIZEN or ADMIN is turned away before reaching this file. Authority
 * application verification is not required for issue review. The role check is
 * repeated here as a fail-closed assertion, mirroring controller/authority.controller.ts.
 */

/**
 * The authenticated authority, or a 401/403 if a guard was ever skipped.
 *
 * `authenticate` guarantees `req.user` and the route guarantees the role; the
 * assertion is kept so the service can never be handed a citizen's or an admin's
 * id if the router is ever re-mounted without those guards.
 */
const requireAuthority = (req: Request): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  if (req.user.role !== 'AUTHORITY') {
    throw new ForbiddenError('You do not have permission to perform this action');
  }

  return req.user.userId;
};

/** GET /api/authority/issues - the reported issues waiting for review. */
const listIssuesHandler = async (req: Request, res: Response): Promise<void> => {
  requireAuthority(req);

  const issues = await authorityIssueService.listIssuesForReview(req.query);

  sendSuccess(res, 200, 'Issues retrieved', { issues });
};

/**
 * GET /api/authority/issues/:issueId - one issue in full, so the authority can
 * read the description, look at the photo and check the location before deciding.
 */
const getIssueHandler = async (req: Request<{ issueId: string }>, res: Response): Promise<void> => {
  requireAuthority(req);

  const issue = await authorityIssueService.getIssueForReview(req.params.issueId);

  sendSuccess(res, 200, 'Issue retrieved', { issue });
};

/** PATCH /api/authority/issues/:issueId/verify - REPORTED -> VERIFIED. */
const verifyIssueHandler: RequestHandler<{ issueId: string }, unknown, VerifyIssueRequest> = async (req, res) => {
  const authorityId = requireAuthority(req);

  const issue = await authorityIssueService.verifyIssue({
    issueId: req.params.issueId,
    authorityId,
  });

  sendSuccess(res, 200, 'Issue verified successfully', { issue });
};

/** PATCH /api/authority/issues/:issueId/reject - REPORTED -> REJECTED. */
const rejectIssueHandler: RequestHandler<{ issueId: string }, unknown, RejectIssueRequest> = async (req, res) => {
  const authorityId = requireAuthority(req);

  const issue = await authorityIssueService.rejectIssue({
    issueId: req.params.issueId,
    authorityId,
    body: req.body,
  });

  sendSuccess(res, 200, 'Issue rejected successfully', { issue });
};

export const listIssues = asyncHandler(listIssuesHandler);
export const getIssue = asyncHandler(getIssueHandler);
export const verifyIssue = asyncHandler(verifyIssueHandler);
export const rejectIssue = asyncHandler(rejectIssueHandler);