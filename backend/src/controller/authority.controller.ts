import type { Request, RequestHandler, Response } from 'express';
import type { UploadedAuthorityDocument } from '../models/authority.model.js';
import * as authorityService from '../service/authority.service.js';
import * as assignmentService from '../service/assignment.service.js';
import type { SubmitAuthorityApplicationRequest } from '../validation/authority.schema.js';
import { ForbiddenError, UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the authority candidate's own endpoints.
 *
 * Responsibilities, and nothing else:
 *  - read the authenticated candidate from `req.user` (set by `authenticate`)
 *  - map the optional multipart identity document onto the shape the service wants
 *  - call the service
 *  - return the response envelope
 *
 * There is no SQL, no status comparison and no ImageKit access here. In particular
 * the applicant id is always `req.user.userId`: nothing in the request body or
 * query string can influence whose application is read or written.
 *
 * The route mounts these handlers behind `authenticate` + `requireRole('AUTHORITY')`,
 * so a CITIZEN or ADMIN is turned away with a 403 before reaching this file.
 */

/**
 * The authenticated candidate, or a 401 if the guard was ever skipped.
 *
 * `authenticate` guarantees `req.user` on these routes; the check is kept as a
 * fail-closed guard so a future re-mount cannot silently lose the identity.
 */
const requireCandidate = (req: Request): string => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  // Re-checked here as well as on the route. The route's `requireRole` is the
  // boundary that produces the 403; this is the assertion that keeps the service
  // from ever being handed a citizen's id if the route is ever re-mounted without it.
  if (req.user.role !== 'AUTHORITY') {
    throw new ForbiddenError('Only authority candidates can submit an authority application');
  }

  return req.user.userId;
};

/**
 * The in-memory document multer buffered, or null when none was sent.
 *
 * The service decides that a document is mandatory (it is identity proof, not an
 * optional attachment), so the absence is reported here as null rather than as a
 * 400 - that keeps the rule in one place.
 */
const toDocumentFile = (req: Request): UploadedAuthorityDocument | null => {
  if (!req.file) return null;

  return {
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  };
};

/**
 * GET /api/authority/application - the caller's own application, or null when they
 * have not applied yet.
 */
const getMyApplicationHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = requireCandidate(req);

  const application = await authorityService.getMyAuthorityApplication(userId);

  sendSuccess(res, 200, 'Authority application retrieved', { application });
};

/**
 * POST /api/authority/application - submit a first application, or re-submit a
 * rejected one. Lands in PENDING either way.
 */
const submitApplicationHandler: RequestHandler<
  Record<string, string>,
  unknown,
  SubmitAuthorityApplicationRequest
> = async (req, res) => {
  const userId = requireCandidate(req);

  const application = await authorityService.submitAuthorityApplication({
    userId,
    body: req.body,
    documentFile: toDocumentFile(req),
  });

  sendSuccess(res, 201, 'Authority application submitted successfully', { application });
};

/**
 * GET /api/authority/application/options - the closed vocabularies the application
 * form is built from, so the frontend never offers a value the API would reject.
 *
 * Mounted before `/:applicationId` style paths would matter; it takes no
 * parameters, so there is no shadowing concern.
 */
const getApplicationOptionsHandler = async (_req: Request, res: Response): Promise<void> => {
  const options = authorityService.getAuthorityApplicationOptions();

  sendSuccess(res, 200, 'Authority application options retrieved', { options });
};

/**
 * GET /api/authority/profile - the verified-authority view.
 *
 * The one route in this module behind `requireVerifiedAuthority`, which is what
 * makes that guard real rather than aspirational: a PENDING or REJECTED candidate
 * gets a 403 here, while `GET /api/authority/application` stays open to them so
 * they can see where they stand.
 *
 * It returns the profile fields the future assignment engine will read - skills,
 * department, designation, jurisdiction, availability - and nothing about workload,
 * tasks or performance: those are the next module, and inventing them here would
 * mean the frontend rendered numbers no code produces.
 */
const getAuthorityProfileHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = requireCandidate(req);

  const application = await authorityService.getMyAuthorityApplication(userId);

  sendSuccess(res, 200, 'Authority profile retrieved', {
    profile: application
      ? {
          fullName: application.fullName,
          email: application.email,
          phone: application.phone,
          department: application.department,
          designation: application.designation,
          skills: application.skills,
          jurisdictionType: application.jurisdictionType,
          jurisdictionName: application.jurisdictionName,
          availability: application.availability,
          verificationStatus: application.verificationStatus,
          verifiedAt: application.verifiedAt,
        }
      : null,
  });
};

export const getMyApplication = asyncHandler(getMyApplicationHandler);
export const submitApplication = asyncHandler(submitApplicationHandler);
export const getApplicationOptions = asyncHandler(getApplicationOptionsHandler);
export const getAuthorityProfile = asyncHandler(getAuthorityProfileHandler);

/**
 * GET /api/authority/tasks - the verified authority's assigned tasks.
 *
 * Read-only. The authority id is resolved from the authenticated user inside
 * the service, so an authority can only ever see its own assignments; admin
 * work items live in a separate table and can never appear in this list.
 * `?status=` accepts only known task statuses (ASSIGNED, IN_PROGRESS,
 * COMPLETED, CANCELLED) - anything else is ignored rather than rejected, so
 * the dashboard can refresh without a hard failure on a stale filter.
 */
const listMyTasksHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = requireCandidate(req);

  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const tasks = await assignmentService.listMyTasks(userId, status);

  sendSuccess(res, 200, 'Tasks retrieved', { tasks });
};

export const listMyTasks = asyncHandler(listMyTasksHandler);