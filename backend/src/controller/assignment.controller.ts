import type { Request, Response } from 'express';
import * as assignmentService from '../service/assignment.service.js';
import type { AssignIssueRequest } from '../validation/workflow.schema.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the admin assignment workflow:
 *
 *   POST /api/admin/issues/:issueId/analyze        - run AI analysis
 *   GET  /api/admin/issues/:issueId/recommendation - analysis + workforce ranking
 *   POST /api/admin/issues/:issueId/assign         - VERIFIED -> ASSIGNED
 *   GET  /api/admin/issues/workforce               - authority availability
 *
 * Mounted behind `authenticate` + `requireRole('ADMIN')`, so only admins
 * reach these handlers. Thin by design: identity from `req.user`, the issue
 * from the path, the assignee from the validated body - then delegate.
 */

const requireAdmin = (req: Request): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  return req.user.userId;
};

const analyzeHandler = async (req: Request<{ issueId: string }>, res: Response): Promise<void> => {
  requireAdmin(req);

  const issue = await assignmentService.analyzeIssue(req.params.issueId);

  sendSuccess(res, 200, 'Issue analysed successfully', { issue });
};

const recommendationHandler = async (
  req: Request<{ issueId: string }>,
  res: Response,
): Promise<void> => {
  requireAdmin(req);

  const recommendation = await assignmentService.recommendAssignment(req.params.issueId);

  sendSuccess(res, 200, 'Assignment recommendation ready', { recommendation });
};

const assignHandler = async (
  req: Request<{ issueId: string }, unknown, AssignIssueRequest>,
  res: Response,
): Promise<void> => {
  const adminId = requireAdmin(req);

  const issue = await assignmentService.assignIssue({
    issueId: req.params.issueId,
    adminId,
    authorityId: req.body.authorityId,
  });

  sendSuccess(res, 200, 'Issue assigned successfully', { issue });
};

const workforceHandler = async (_req: Request, res: Response): Promise<void> => {
  const workforce = await assignmentService.getWorkforce();

  sendSuccess(res, 200, 'Workforce retrieved', { workforce });
};

export const analyze = asyncHandler(analyzeHandler);
export const recommendation = asyncHandler(recommendationHandler);
export const assign = asyncHandler(assignHandler);
export const workforce = asyncHandler(workforceHandler);
