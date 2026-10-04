import { z } from 'zod';
import { ADMIN_FILTERABLE_ISSUE_STATUSES } from '../types/issue.types.js';

/**
 * Request schemas for the admin issue review endpoints
 * (`/api/admin/issues/...`).
 *
 * Two ideas run through all of them:
 *
 *  - The client never chooses the status. Each transition is its own endpoint and
 *    the resulting status is a server side constant
 *    (ISSUE_STATUS_AFTER_ADMIN_ACTION), so `status`, `verifiedBy`, `rejectedBy`
 *    and `adminId` are rejected by the `.strict()` objects below rather than
 *    silently ignored.
 *  - The reviewer identity is never part of a request. It comes from
 *    `req.user.userId`, set by `authenticate` from the JWT cookie.
 */

/** Matches the width of `issues.rejection_reason` (VARCHAR(500)). */
export const ISSUE_REJECTION_REASON_MAX_LENGTH = 500;

/** Ceiling for one admin dashboard page, mirroring "My Reports". */
export const ADMIN_ISSUE_LIST_MAX_LIMIT = 100;

/**
 * `:issueId` path parameter.
 *
 * Checked here as well as in the service so a malformed id is a clean 400
 * instead of a PostgreSQL `invalid_text_representation` driver error (which the
 * central error middleware would report as a 500).
 */
export const issueIdSchema = z.uuid('Issue id must be a valid UUID');

/**
 * `GET /api/admin/issues` query string.
 *
 * `status` is optional; without it the dashboard lists every issue, newest
 * first. The enum covers the whole lifecycle (REPORTED queue, VERIFIED
 * assignment queue, ASSIGNED / IN_PROGRESS active work, REJECTED / RESOLVED
 * outcomes), so an arbitrary value is a 400.
 *
 * `.strict()` means an unknown query parameter is a validation error too, so a
 * typo such as `?states=REPORTED` cannot silently return the unfiltered list.
 */
export const adminIssueListQuerySchema = z
  .object({
    status: z
      .enum(ADMIN_FILTERABLE_ISSUE_STATUSES, {
        error: `Status must be one of: ${ADMIN_FILTERABLE_ISSUE_STATUSES.join(', ')}`,
      })
      .optional(),
    limit: z.coerce
      .number({ error: 'Limit must be a number' })
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(ADMIN_ISSUE_LIST_MAX_LIMIT, `Limit must be at most ${ADMIN_ISSUE_LIST_MAX_LIMIT}`)
      .optional(),
  })
  .strict();

/**
 * `PATCH /api/admin/issues/:issueId/verify` body.
 *
 * An empty, strict object: the endpoint decides that a REPORTED issue becomes
 * VERIFIED, so `{}` and no body at all are both accepted, while anything the
 * client tries to dictate (`status`, `verifiedBy`, `verifiedAt`, `adminId`) is a
 * 400 instead of a silently ignored field.
 *
 * `express.json()` leaves `req.body` undefined for a request without a JSON
 * body, so the preprocessor normalises that to `{}` first.
 */
export const verifyIssueSchema = z.preprocess(
  (value) => (value === undefined || value === null ? {} : value),
  z.object({}).strict(),
);

/**
 * `PATCH /api/admin/issues/:issueId/reject` body.
 *
 * `reason` is optional - rejecting without an explanation is allowed - but a
 * reason that is present must be real text: it is trimmed first, so a
 * whitespace-only value becomes an empty string and is rejected instead of
 * being stored as a blank message for the citizen.
 *
 * As with `verifyIssueSchema`, the object is strict: the status and the reviewer
 * ids are server owned.
 */
export const rejectIssueSchema = z.preprocess(
  (value) => (value === undefined || value === null ? {} : value),
  z
    .object({
      reason: z
        .string({ error: 'Reason must be a string' })
        .trim()
        .min(1, 'Reason cannot be blank')
        .max(
          ISSUE_REJECTION_REASON_MAX_LENGTH,
          `Reason must be at most ${ISSUE_REJECTION_REASON_MAX_LENGTH} characters`,
        )
        .optional(),
    })
    .strict(),
);

export type AdminIssueListQuery = z.infer<typeof adminIssueListQuerySchema>;
export type VerifyIssueRequest = z.infer<typeof verifyIssueSchema>;
export type RejectIssueRequest = z.infer<typeof rejectIssueSchema>;
