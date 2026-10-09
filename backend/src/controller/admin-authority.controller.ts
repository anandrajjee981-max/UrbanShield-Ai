import type { Request, RequestHandler, Response } from 'express';
import * as adminAuthorityService from '../service/admin-authority.service.js';
import type {
  RejectAuthorityApplicationRequest,
  VerifyAuthorityApplicationRequest,
} from '../validation/authority.schema.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the admin authority verification endpoints.
 *
 * Responsibilities, and nothing else:
 *  - read the authenticated admin from `req.user` (set by `authenticate`)
 *  - read `:applicationId`, the query string and the optional rejection reason
 *  - call the service
 *  - return the response envelope
 *
 * There is no SQL, no status comparison and no ImageKit access here. In particular
 * the reviewer id is always `req.user.userId`: nothing in the request body or
 * query string can influence who the recorded admin is.
 *
 * The route mounts these handlers behind `authenticate` + `requireRole('ADMIN')`,
 * so a CITIZEN or an unverified AUTHORITY is turned away with a 403 before reaching
 * this file. That includes the candidate themselves - no authority can review,
 * verify or reject an application, not even their own.
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

/** GET /api/admin/authority-applications - the queue, optionally filtered by status. */
const listApplicationsHandler = async (req: Request, res: Response): Promise<void> => {
  requireAdmin(req);

  const applications = await adminAuthorityService.listAuthorityApplicationsForReview(req.query);

  sendSuccess(res, 200, 'Authority applications retrieved', { applications });
};

/** GET /api/admin/authority-applications/:applicationId - one application for review. */
const getApplicationHandler = async (
  req: Request<{ applicationId: string }>,
  res: Response,
): Promise<void> => {
  requireAdmin(req);

  const application = await adminAuthorityService.getAuthorityApplicationForReview(
    req.params.applicationId,
  );

  sendSuccess(res, 200, 'Authority application retrieved', { application });
};

/** GET /api/admin/authority-applications/:applicationId/audit - the decision history. */
const getAuditTrailHandler = async (
  req: Request<{ applicationId: string }>,
  res: Response,
): Promise<void> => {
  requireAdmin(req);

  const entries = await adminAuthorityService.getAuthorityAuditTrail(req.params.applicationId);

  sendSuccess(res, 200, 'Authority verification history retrieved', { entries });
};

/**
 * PATCH /api/admin/authority-applications/:applicationId/verify
 *
 * PENDING -> VERIFIED. The request body is not used for anything: the endpoint
 * itself decides the transition and the reviewer.
 */
const verifyApplicationHandler: RequestHandler<
  { applicationId: string },
  unknown,
  VerifyAuthorityApplicationRequest
> = async (req, res) => {
  const adminId = requireAdmin(req);

  const application = await adminAuthorityService.verifyAuthorityApplication({
    applicationId: req.params.applicationId,
    adminId,
  });

  sendSuccess(res, 200, 'Authority application verified successfully', { application });
};

/**
 * PATCH /api/admin/authority-applications/:applicationId/reject
 *
 * PENDING -> REJECTED, with an optional reason the candidate can read back.
 */
const rejectApplicationHandler: RequestHandler<
  { applicationId: string },
  unknown,
  RejectAuthorityApplicationRequest
> = async (req, res) => {
  const adminId = requireAdmin(req);

  const application = await adminAuthorityService.rejectAuthorityApplication({
    applicationId: req.params.applicationId,
    adminId,
    body: req.body,
  });

  sendSuccess(res, 200, 'Authority application rejected successfully', { application });
};

export const listApplications = asyncHandler(listApplicationsHandler);
export const getApplication = asyncHandler(getApplicationHandler);
export const getAuditTrail = asyncHandler(getAuditTrailHandler);
export const verifyApplication = asyncHandler(verifyApplicationHandler);
export const rejectApplication = asyncHandler(rejectApplicationHandler);