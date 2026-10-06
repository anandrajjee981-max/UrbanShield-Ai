import * as issueDao from '../dao/issue.dao.js';
import type { AuthorityReviewIssue } from '../models/issue.model.js';
import {
  ISSUE_STATUS_AFTER_AUTHORITY_ACTION,
  REVIEWABLE_ISSUE_STATUS,
} from '../types/issue.types.js';
import type { AuthorityIssueAction } from '../types/issue.types.js';
import type { RejectIssueRequest } from '../validation/issue-review.schema.js';
import {
  ISSUE_LIST_MAX_LIMIT,
  issueIdSchema,
  issueListQuerySchema,
  rejectIssueSchema,
} from '../validation/issue-review.schema.js';
import { ConflictError, InternalServerError, NotFoundError } from '../utils/api-error.js';

/**
 * Business layer for the authority issue review workflow:
 *
 *   REPORTED --(verify)--> VERIFIED
 *   REPORTED --(reject)--> REJECTED
 *
 * This is the *only* place in the backend where an issue status is written after
 * it is created. It used to be the admin's job; it is now an authority's, which
 * is why the service takes an `authorityId` and never an `adminId`.
 *
 * Everything a client cannot decide is decided here:
 *
 *  - Which transitions exist. Only a REPORTED issue can be reviewed; VERIFIED and
 *    REJECTED are terminal at this stage, and there is no endpoint that writes an
 *    arbitrary status. Further stages (assignment, progress, resolution) belong to
 *    the later task-assignment workflow and start from the VERIFIED status this
 *    service produces.
 *  - Who acted. Every function takes `authorityId`, which the controller reads from
 *    `req.user.userId` (the JWT cookie). No authority id is ever accepted from a
 *    request body or query string, so a caller cannot forge a reviewer.
 *  - What is reported back. 404 when the issue does not exist, 409 when it has
 *    already been processed.
 *
 * Route authentication and role checks enforce that only AUTHORITY accounts can
 * review issues. Application verification is not required for this workflow.
 * Nothing here reads a status from a request, so a client cannot forge an issue
 * transition.
 *
 * Nothing else belongs here: no SQL (that is the DAO), no HTTP concerns (that is
 * the controller) and deliberately no AI analysis, effort estimation, authority
 * selection or workforce logic - that module comes later.
 */

/** Ceiling for one authority queue page. */
const MAX_LIST_LIMIT = ISSUE_LIST_MAX_LIMIT;

/**
 * The raw query object as Express hands it over (`ParsedQs`), so this service can
 * re-parse it with `issueListQuerySchema`.
 *
 * The values stay `unknown` on purpose: the schema, not the type, decides what a
 * valid `status` or `limit` is.
 */
export interface AuthorityIssueListQuery {
  status?: unknown;
  limit?: unknown;
}

export interface VerifyIssueParams {
  issueId: string;
  /** Authenticated authority id from `req.user.userId`. Never from the body. */
  authorityId: string;
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
const requireReviewableIssue = async (issueId: string): Promise<AuthorityReviewIssue> => {
  // Throws a ZodError, which the error middleware maps to a 400 with details.
  const parsedIssueId = issueIdSchema.parse(issueId);
  const issue = await issueDao.findAuthorityReviewIssueById(parsedIssueId);

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
 * two authorities review the same issue at the same moment. "No row updated" then
 * means the issue was processed in between, and is reported the same way.
 */
const reviewIssue = async (
  action: AuthorityIssueAction,
  params: VerifyIssueParams,
  rejectionReason: string | null = null,
): Promise<AuthorityReviewIssue> => {
  const { authorityId } = params;

  const issue = await requireReviewableIssue(params.issueId);

  if (issue.status !== REVIEWABLE_ISSUE_STATUS) {
    throw new ConflictError(ALREADY_PROCESSED_MESSAGE, 'ISSUE_ALREADY_PROCESSED');
  }

  const reviewed =
    action === 'VERIFY'
      ? await issueDao.verifyIssue(issue.id, authorityId)
      : await issueDao.rejectIssue(issue.id, authorityId, rejectionReason);

  if (!reviewed) {
    // The row was reviewed by somebody else between the read and the update.
    throw new ConflictError(ALREADY_PROCESSED_MESSAGE, 'ISSUE_ALREADY_PROCESSED');
  }

  if (reviewed.status !== ISSUE_STATUS_AFTER_AUTHORITY_ACTION[action]) {
    // Unreachable: the DAO writes the status that belongs to the action it was
    // given. Reported as a 500 because it would be our bug, not the caller's.
    throw new InternalServerError('Issue was reviewed with an unexpected status', 'UNEXPECTED_ISSUE_STATUS');
  }

  return reviewed;
};

/**
 * The authority issue queue, newest first.
 *
 * Without a `status` filter this lists every issue in the review stage
 * (REPORTED, VERIFIED, REJECTED), with nobody assigned in particular.
 * Assignment is a later module, so there is no `assignedTo` column, no
 * per-authority filter and no claim step here - an authority reviews whatever
 * is reported and the outcome is what moves the issue on. Pass
 * `?status=REPORTED` for the "Pending Issues" view.
 *
 * The status filter and the page size come from `issueListQuerySchema`, so an
 * unknown status, a non numeric limit or an unknown query parameter is a 400
 * rather than a silently ignored filter.
 */
export const listIssuesForReview = async (query: AuthorityIssueListQuery): Promise<AuthorityReviewIssue[]> => {
  // Throws a ZodError -> 400 naming the rejected field.
  const { status, limit } = issueListQuerySchema.parse(query);

  return issueDao.findIssuesForAuthorityReview(status ?? null, limit ?? MAX_LIST_LIMIT);
};

/**
 * One issue with everything the review screen needs to understand the problem
 * before deciding: type, the citizen's own description, the photo, the location
 * (GPS coordinates or the typed address), when it arrived and what its current
 * status is - plus any review already recorded against it.
 *
 * It carries nothing about the reporting citizen: their account is not selected
 * here, so no name or email can reach the response even if this function is
 * called from somewhere else later.
 *
 * 404 when the id does not exist.
 */
export const getIssueForReview = async (issueId: string): Promise<AuthorityReviewIssue> =>
  requireReviewableIssue(issueId);

/**
 * REPORTED -> VERIFIED.
 *
 * The request body is not used for anything: the endpoint itself decides the
 * transition and the reviewer, and the caller must already have the AUTHORITY role
 * (see the route guards). 409 when the issue is already VERIFIED, already
 * REJECTED or in any later stage.
 */
export const verifyIssue = async (params: VerifyIssueParams): Promise<AuthorityReviewIssue> =>
  reviewIssue('VERIFY', params);

/**
 * REPORTED -> REJECTED, with an optional reason stored in its own column (never
 * appended to `description`).
 *
 * The body is re-parsed here, as the issue service does on create, so the reason
 * is trimmed and length checked even when this is called from outside the HTTP
 * boundary. 409 when the issue has already been processed.
 */
export const rejectIssue = async (params: RejectIssueParams): Promise<AuthorityReviewIssue> => {
  const { reason } = rejectIssueSchema.parse(params.body);

  return reviewIssue('REJECT', params, reason ?? null);
};