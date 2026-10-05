import * as authorityDao from '../dao/authority.dao.js';
import type { AdminAuthorityApplication, AuthorityAuditEntry } from '../models/authority.model.js';
import { REVIEWABLE_AUTHORITY_STATUS } from '../types/authority.types.js';
import type { RejectAuthorityApplicationRequest } from '../validation/authority.schema.js';
import {
  ADMIN_AUTHORITY_LIST_MAX_LIMIT,
  adminAuthorityListQuerySchema,
  authorityApplicationIdSchema,
  rejectAuthorityApplicationSchema,
} from '../validation/authority.schema.js';
import { ConflictError, InternalServerError, NotFoundError } from '../utils/api-error.js';

/**
 * Business layer for the admin side of authority verification.
 *
 *   PENDING --(verify)--> VERIFIED
 *   PENDING --(reject)--> REJECTED
 *
 * Everything a client cannot decide is decided here:
 *
 *  - Which transitions exist. Only a PENDING application can be reviewed; VERIFIED
 *    and REJECTED are terminal at this stage. There is no endpoint that writes an
 *    arbitrary status, and no revocation endpoint, so an admin cannot move a
 *    verified authority back - that is a separate future workflow.
 *  - Who acted. Every function takes `adminId`, which the controller reads from
 *    `req.user.userId` (the JWT cookie). No admin id is ever accepted from a
 *    request body or query string, so a caller cannot forge a reviewer.
 *  - What is reported back. 404 when the application does not exist, 409 when it
 *    has already been processed.
 *
 * Authorisation itself is enforced at the route (`authenticate` +
 * `requireRole('ADMIN')`), before this file runs. Nothing else belongs here: no SQL
 * (that is the DAO), no HTTP concerns (that is the controller) and deliberately no
 * AI analysis, document recognition, task assignment or workload logic - that
 * module comes later and starts from the VERIFIED status this service produces.
 */

/** Ceiling for one admin queue page. */
const MAX_LIST_LIMIT = ADMIN_AUTHORITY_LIST_MAX_LIMIT;

/**
 * The raw query object as Express hands it over (`ParsedQs`), so this service can
 * re-parse it with `adminAuthorityListQuerySchema`.
 *
 * The values stay `unknown` on purpose: the schema, not the type, decides what a
 * valid `status` or `limit` is.
 */
export interface AdminAuthorityListQuery {
  status?: unknown;
  limit?: unknown;
}

export interface ReviewAuthorityApplicationParams {
  applicationId: string;
  /** Authenticated admin id from `req.user.userId`. Never from the body. */
  adminId: string;
}

export interface RejectAuthorityApplicationParams extends ReviewAuthorityApplicationParams {
  body: RejectAuthorityApplicationRequest;
}

/**
 * Message used for every attempt to review an application that is no longer
 * PENDING. It deliberately does not distinguish "verified" from "rejected", so the
 * error cannot be used to probe an application's outcome.
 */
const ALREADY_PROCESSED_MESSAGE = 'Application has already been processed.';

/**
 * Reads an application for review, or reports that it does not exist.
 *
 * The lookup is unfiltered by status on purpose: a reviewed application must
 * still be openable and readable, only the *transition* is restricted. The id is
 * validated here so a malformed value is a clean 400 instead of a PostgreSQL uuid
 * error.
 */
const requireApplication = async (applicationId: string): Promise<AdminAuthorityApplication> => {
  // Throws a ZodError, which the error middleware maps to a 400 with details.
  const parsedApplicationId = authorityApplicationIdSchema.parse(applicationId);
  const application = await authorityDao.findAuthorityApplicationForAdminById(parsedApplicationId);

  if (!application) {
    throw new NotFoundError('Authority application not found', 'APPLICATION_NOT_FOUND');
  }

  return application;
};

/**
 * Applications for the admin queue, newest submission first.
 *
 * The status filter and the page size come from `adminAuthorityListQuerySchema`, so
 * an unknown status, a non numeric limit or an unknown query parameter is a 400
 * rather than a silently ignored filter - which matters here, because the
 * unfiltered list still contains every candidate's personal data.
 */
export const listAuthorityApplicationsForReview = async (
  query: AdminAuthorityListQuery,
): Promise<AdminAuthorityApplication[]> => {
  // Throws a ZodError -> 400 naming the rejected field.
  const { status, limit } = adminAuthorityListQuerySchema.parse(query);

  return authorityDao.findAuthorityApplicationsForAdmin(status ?? null, limit ?? MAX_LIST_LIMIT);
};

/**
 * One application with everything the review screen needs: the personal, identity
 * and professional details, the masked government ID, the private document
 * reference and any decision already recorded.
 *
 * 404 when the id does not exist.
 */
export const getAuthorityApplicationForReview = async (
  applicationId: string,
): Promise<AdminAuthorityApplication> => requireApplication(applicationId);

/**
 * The full decision history of one application, oldest first.
 *
 * 404 when the id does not exist, so a caller cannot distinguish "no such
 * application" from "application with no history yet" and use the endpoint to
 * confirm that an id exists.
 */
export const getAuthorityAuditTrail = async (applicationId: string): Promise<AuthorityAuditEntry[]> => {
  await requireApplication(applicationId);

  return authorityDao.findAuthorityAuditTrail(applicationId);
};

/**
 * Guards the one-way transition and performs it.
 *
 * The status is checked first so the caller gets a clear 409, and the DAO repeats
 * the same guard in its `WHERE` clause, which is what makes the check safe when
 * two admins review the same application at the same moment. "No row updated" then
 * means it was processed in between, and is reported the same way.
 */
const reviewApplication = async (
  action: 'VERIFY' | 'REJECT',
  params: ReviewAuthorityApplicationParams,
  rejectionReason: string | null = null,
): Promise<AdminAuthorityApplication> => {
  const { adminId } = params;

  const application = await requireApplication(params.applicationId);

  if (application.verificationStatus !== REVIEWABLE_AUTHORITY_STATUS) {
    throw new ConflictError(ALREADY_PROCESSED_MESSAGE, 'APPLICATION_ALREADY_PROCESSED');
  }

  const reviewed =
    action === 'VERIFY'
      ? await authorityDao.verifyAuthorityApplication(application.id, adminId)
      : await authorityDao.rejectAuthorityApplication(application.id, adminId, rejectionReason);

  if (!reviewed) {
    // The row was reviewed by somebody else between the read and the update.
    throw new ConflictError(ALREADY_PROCESSED_MESSAGE, 'APPLICATION_ALREADY_PROCESSED');
  }

  const expectedStatus = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';

  if (reviewed.verificationStatus !== expectedStatus) {
    // Unreachable: the DAO writes the status that belongs to the action it was
    // given. Reported as a 500 because it would be our bug, not the caller's.
    throw new InternalServerError(
      'Application was reviewed with an unexpected status',
      'UNEXPECTED_APPLICATION_STATUS',
    );
  }

  // The write returns the internal entity; the admin view is rebuilt from the same
  // row so the response passes through the same masking as a list read, rather than
  // trusting a separate code path to remember it.
  const adminView = await authorityDao.findAuthorityApplicationForAdminById(reviewed.id);

  if (!adminView) {
    // Unreachable: the row was just updated.
    throw new InternalServerError('Application could not be read back after review', 'APPLICATION_READBACK_FAILED');
  }

  return adminView;
};

/**
 * PENDING -> VERIFIED. This is the transition that grants the verified-authority
 * privilege, and it happens entirely server side: the status is written by the DAO
 * and the privilege is derived from it by `requireVerifiedAuthority`
 * (src/middleware/authority.middleware.ts). Nothing the client sends participates,
 * and the body is unused - the endpoint itself decides the outcome.
 *
 * 409 when the application is already VERIFIED, already REJECTED, or otherwise no
 * longer PENDING.
 */
export const verifyAuthorityApplication = async (
  params: ReviewAuthorityApplicationParams,
): Promise<AdminAuthorityApplication> => reviewApplication('VERIFY', params);

/**
 * PENDING -> REJECTED, with an optional reason stored in its own column (never
 * appended to another field).
 *
 * The body is re-parsed here, as the issue service does on create, so the reason
 * is trimmed and length checked even when this is called from outside the HTTP
 * boundary. 409 when the application has already been processed.
 */
export const rejectAuthorityApplication = async (
  params: RejectAuthorityApplicationParams,
): Promise<AdminAuthorityApplication> => {
  const { reason } = rejectAuthorityApplicationSchema.parse(params.body);

  return reviewApplication('REJECT', params, reason ?? null);
};