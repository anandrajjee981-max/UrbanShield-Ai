import * as issueDao from '../dao/issue.dao.js';
import type { AdminIssue } from '../models/issue.model.js';
import { ISSUE_STATUS_AFTER_ADMIN_ACTION, REVIEWABLE_ISSUE_STATUS } from '../types/issue.types.js';
import type { AdminIssueAction } from '../types/issue.types.js';
import type { RejectIssueRequest } from '../validation/admin-issue.schema.js';
import {
  ADMIN_ISSUE_LIST_MAX_LIMIT,
  adminIssueListQuerySchema,
  issueIdSchema,
  rejectIssueSchema,
} from '../validation/admin-issue.schema.js';
import { ConflictError, InternalServerError, NotFoundError } from '../utils/api-error.js';

/**
 * Business layer for the admin issue review workflow.
 *
 *   REPORTED --(verify)--> VERIFIED
 *   REPORTED --(reject)--> REJECTED
 *
 * Everything a client cannot decide is decided here:
 *
 *  - Which transitions exist. Only a REPORTED issue can be reviewed; VERIFIED and
 *    REJECTED are terminal at this stage, and there is no endpoint that writes an
 *    arbitrary status. Further stages (assignment, progress, resolution) belong
 *    to the later authority workflow.
 *  - Who acted. Every function takes `adminId`, which the controller reads from
 *    `req.user.userId` (the JWT cookie). No admin id is ever accepted from a
 *    request body or query string, so a caller cannot forge a reviewer.
 *  - What is reported back. 404 when the issue does not exist, 409 when it has
 *    already been processed.
 *
 * Nothing else belongs here: no SQL (that is the DAO), no HTTP concerns (that is
 * the controller) and deliberately no AI analysis, effort estimation or
 * workforce logic - that module comes later and starts from the VERIFIED status
 * this service produces.
 */

/** Ceiling for one admin dashboard page. */
const MAX_LIST_LIMIT = ADMIN_ISSUE_LIST_MAX_LIMIT;

/**
 * The raw query object as Express hands it over (`ParsedQs`), so this service can
 * re-parse it with `adminIssueListQuerySchema`.
 *
 * The values stay `unknown` on purpose: the schema, not the type, decides what a
 * valid `status` or `limit` is.
 */
export interface AdminIssueListQuery {
  status?: unknown;
  limit?: unknown;
}

export interface VerifyIssueParams {
  issueId: string;
  /** Authenticated admin id from `req.user.userId`. Never from the body. */
  adminId: string;
}

export interface RejectIssueParams extends VerifyIssueParams {
  body: RejectIssueRequest;
}

/**
 * Message used for every attempt to review an issue that is no longer REPORTED.
 * It deliberately does not distinguish "verified" from "rejected", so the error
 * cannot be used to probe an issue's outcome.
 */
const ALREADY_PROCESSED_MESSAGE = 'Issue has already been processed.';

/**
 * Reads an issue for review, or reports that it does not exist.
 *
 * The lookup is unfiltered by status on purpose: a reviewed issue must still be
 * openable and readable, only the *transition* is restricted. The id is validated
 * here so a malformed value is a clean 400 instead of a PostgreSQL uuid error.
 */
const requireIssue = async (issueId: string): Promise<AdminIssue> => {
  // Throws a ZodError, which the error middleware maps to a 400 with details.
  const parsedIssueId = issueIdSchema.parse(issueId);
  const issue = await issueDao.findAdminIssueById(parsedIssueId);

  if (!issue) {
    throw new NotFoundError('Issue not found', 'ISSUE_NOT_FOUND');
  }

  return issue;
};

/**
 * Guards the one-way transition and performs it.
 *
 * The status is checked first so the caller gets a clear 409, and the DAO repeats
 * the same guard in its `WHERE` clause, which is what makes the check safe when
 * two admins review the same issue at the same moment. "No row updated" then means
 * the issue was processed in between, and is reported the same way.
 */
const reviewIssue = async (
  action: AdminIssueAction,
  params: VerifyIssueParams,
  rejectionReason: string | null = null,
): Promise<AdminIssue> => {
  const { adminId } = params;

  const issue = await requireIssue(params.issueId);

  if (issue.status !== REVIEWABLE_ISSUE_STATUS) {
    throw new ConflictError(ALREADY_PROCESSED_MESSAGE, 'ISSUE_ALREADY_PROCESSED');
  }

  const reviewed =
    action === 'VERIFY'
      ? await issueDao.verifyIssue(issue.id, adminId)
      : await issueDao.rejectIssue(issue.id, adminId, rejectionReason);

  if (!reviewed) {
    // The row was reviewed by somebody else between the read and the update.
    throw new ConflictError(ALREADY_PROCESSED_MESSAGE, 'ISSUE_ALREADY_PROCESSED');
  }

  if (reviewed.status !== ISSUE_STATUS_AFTER_ADMIN_ACTION[action]) {
    // Unreachable: the DAO writes the status that belongs to the action it was
    // given. Reported as a 500 because it would be our bug, not the caller's.
    throw new InternalServerError('Issue was reviewed with an unexpected status', 'UNEXPECTED_ISSUE_STATUS');
  }

  return reviewed;
};

/**
 * Issues for the admin dashboard, newest first.
 *
 * The status filter and the page size come from `adminIssueListQuerySchema`, so an
 * unknown status, a non numeric limit or an unknown query parameter is a 400
 * rather than a silently ignored filter. Without `status` every reported issue is
 * listed, which is what the dashboard shows by default.
 */
export const listIssuesForReview = async (query: AdminIssueListQuery): Promise<AdminIssue[]> => {
  // Throws a ZodError -> 400 naming the rejected field.
  const { status, limit } = adminIssueListQuerySchema.parse(query);

  return issueDao.findAllIssues(status ?? null, limit ?? MAX_LIST_LIMIT);
};

/**
 * One issue with everything the admin review screen needs: the report, its photo,
 * its location, who reported it and any review metadata already recorded.
 *
 * 404 when the id does not exist.
 */
export const getIssueForReview = async (issueId: string): Promise<AdminIssue> => requireIssue(issueId);

/**
 * REPORTED -> VERIFIED.
 *
 * The request body is not used for anything: the endpoint itself decides the
 * transition and the reviewer. 409 when the issue is already VERIFIED, already
 * REJECTED or in any later stage.
 */
export const verifyIssue = async (params: VerifyIssueParams): Promise<AdminIssue> =>
  reviewIssue('VERIFY', params);

/**
 * REPORTED -> REJECTED, with an optional reason stored in its own column (never
 * appended to `description`).
 *
 * The body is re-parsed here, as the issue service does on create, so the reason
 * is trimmed and length checked even when this is called from outside the HTTP
 * boundary. 409 when the issue has already been processed.
 */
export const rejectIssue = async (params: RejectIssueParams): Promise<AdminIssue> => {
  const { reason } = rejectIssueSchema.parse(params.body);

  return reviewIssue('REJECT', params, reason ?? null);
};
