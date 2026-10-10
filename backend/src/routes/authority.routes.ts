import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';
import * as authorityController from '../controller/authority.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { requireVerifiedAuthority } from '../middleware/authority.middleware.js';
import { uploadAuthorityDocument } from '../middleware/authority-upload.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { submitAuthorityApplicationSchema } from '../validation/authority.schema.js';
import { taskCommentSchema, updateTaskStatusSchema } from '../validation/task.schema.js';
import { TooManyRequestsError } from '../utils/api-error.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Authority candidate routes (`/api/authority/...`).
 *
 * Every route runs these guards, in this order:
 *
 *   1. `authenticate`      - reads the JWT from the HTTP-only cookie and sets
 *                            `req.user`. No cookie is a 401, and the role is taken
 *                            from the verified token, never from a header or a body
 *                            field.
 *   2. `requireRole(AUTHORITY)` - a CITIZEN or an ADMIN gets a 403 here and never
 *                            reaches a controller. Registering as AUTHORITY is
 *                            what makes someone a *candidate*; it grants nothing
 *                            on its own.
 *
 * `requireVerifiedAuthority` is a separate, stronger guard used only on
 * `/profile`: it additionally reads the verification status from the database, so
 * a PENDING or REJECTED candidate is refused authority-only operations while still
 * being able to see their own application and its outcome.
 */
const authorityRouter = Router();

/** The only role that may act on an authority application. */
const CANDIDATE_ONLY: UserRole[] = ['AUTHORITY'];

/**
 * Anti spam ceiling on submissions. Keyed by user id, so one noisy candidate
 * cannot exhaust the budget of everyone behind the same NAT, and an unauthenticated
 * caller falls back to its IP.
 */
const authorityApplicationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.AUTHORITY_APPLICATION_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? 'anonymous'),
  handler: (_req, _res, next) => {
    next(
      new TooManyRequestsError('Too many authority applications submitted. Please try again in a minute'),
    );
  },
});

/**
 * GET /api/authority/application/options
 *
 * Declared before the other GET routes purely for readability - it takes no path
 * parameter, so there is nothing for it to shadow.
 */
authorityRouter.get(
  '/application/options',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  authorityController.getApplicationOptions,
);

/** GET /api/authority/application - the caller's own application, or null. */
authorityRouter.get(
  '/application',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  authorityController.getMyApplication,
);

/**
 * POST /api/authority/application - submit a first application, or re-submit a
 * rejected one. Always lands in PENDING; the client cannot choose a status.
 *
 * The upload middleware runs after `authenticate`, so an unauthenticated caller can
 * never make the server buffer a document, and before `validateBody`, so the body
 * fields are parsed as strings by multer and then validated together.
 */
authorityRouter.post(
  '/application',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  authorityApplicationLimiter,
  uploadAuthorityDocument,
  validateBody(submitAuthorityApplicationSchema),
  authorityController.submitApplication,
);

/**
 * GET /api/authority/profile - authority-only.
 *
 * Behind `requireVerifiedAuthority`, which is the practical difference between a
 * candidate and a verified authority: a PENDING or REJECTED applicant gets a 403
 * with AUTHORITY_NOT_VERIFIED.
 */
authorityRouter.get(
  '/profile',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  requireVerifiedAuthority(),
  authorityController.getAuthorityProfile,
);

/**
 * GET /api/authority/tasks?status=ASSIGNED - the authority's own assignments.
 *
 * Behind `requireVerifiedAuthority`: a PENDING or REJECTED candidate gets a 403
 * with AUTHORITY_NOT_VERIFIED, so unverified candidates can never see task data.
 * Supports ?status=&priority=&search=&page=&limit=. Unknown filters are ignored.
 */
authorityRouter.get(
  '/tasks',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  requireVerifiedAuthority(),
  authorityController.listMyTasks,
);

/** GET /api/authority/tasks/:taskId - details (owner only). */
authorityRouter.get(
  '/tasks/:taskId',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  requireVerifiedAuthority(),
  authorityController.getMyTask,
);

/** PATCH /api/authority/tasks/:taskId/status - start / complete / reject. */
authorityRouter.patch(
  '/tasks/:taskId/status',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  requireVerifiedAuthority(),
  validateBody(updateTaskStatusSchema),
  authorityController.updateMyTaskStatus,
);

/** GET|POST /api/authority/tasks/:taskId/comments - notes on the task. */
authorityRouter.get(
  '/tasks/:taskId/comments',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  requireVerifiedAuthority(),
  authorityController.listMyTaskComments,
);

authorityRouter.post(
  '/tasks/:taskId/comments',
  authenticate,
  requireRole(...CANDIDATE_ONLY),
  requireVerifiedAuthority(),
  validateBody(taskCommentSchema),
  authorityController.addMyTaskComment,
);

export default authorityRouter;