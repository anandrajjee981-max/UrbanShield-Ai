import { z } from 'zod';
import { ISSUE_REVIEW_STATUSES } from '../types/issue.types.js';

/**
 * Request schemas for every endpoint that reads or reviews a citizen issue:
 *
 *   /api/authority/issues[...]   the authority queue, detail, verify and reject
 *   /api/admin/issues[...]       the admin monitoring view (reads only)
 *
 * They live in one file because the shapes are identical for both roles, and
 * having them in two places is how an endpoint ends up accepting a field the other
 * one rejects.
 *
 * The ownership split is enforced here too: only the two *action* schemas below
 * can change an issue, and they exist for the authority routes alone. The admin
 * router mounts reads only, so there is no admin schema that could describe a
 * verification request at all.
 *
 * Two ideas run through all of them:
 *
 *  - The client never chooses the status. Each transition is its own endpoint and
 *    the resulting status is a server side constant
 *    (ISSUE_STATUS_AFTER_AUTHORITY_ACTION), so `status`, `verifiedBy`, `rejectedBy`
 *    and `authorityId` are rejected by the `.strict()` objects below rather than
 *    silently ignored.
 *  - The reviewer identity is never part of a request. It comes from
 *    `req.user.userId`, set by `authenticate` from the JWT cookie.
 */

/** Matches the width of `issues.rejection_reason` (VARCHAR(500)). */
export const ISSUE_REJECTION_REASON_MAX_LENGTH = 500;

/** Ceiling for one issue queue page, mirroring "My Reports". */
export const ISSUE_LIST_MAX_LIMIT = 100;

/**
 * `:issueId` path parameter.
 *
 * Checked here as well as in the service so a malformed id is a clean 400
 * instead of a PostgreSQL `invalid_text_representation` driver error (which the
 * central error middleware would report as a 500).
 */
export const issueIdSchema = z.uuid('Issue id must be a valid UUID');

/**
 * `GET /api/authority/issues` and `GET /api/admin/issues` query string.
 *
 * `status` is optional; without it the list shows every issue in the review stage,
 * newest first. The enum is deliberately narrower than ISSUE_STATUSES - only the
 * pending queue and the two review outcomes - so an arbitrary value (or a
 * `?status=IN_PROGRESS` probe for a stage that has no API yet) is a 400.
 *
 * `.strict()` means an unknown query parameter is a validation error too, so a
 * typo such as `?states=REPORTED` cannot silently return the unfiltered list.
 */
export const issueListQuerySchema = z
  .object({
    status: z
      .preprocess(
        (value) => {
          if (typeof value !== 'string') return value;
          const trimmed = value.trim();
          return trimmed === '' ? undefined : trimmed;
        },
        z.enum(ISSUE_REVIEW_STATUSES, {
          error: `Status must be one of: ${ISSUE_REVIEW_STATUSES.join(', ')}`,
        }),
      )
      .optional(),
    limit: z
      .preprocess(
        (value) => {
          if (typeof value === 'string' && value.trim() === '') return undefined;
          return value;
        },
        z.coerce
          .number({ error: 'Limit must be a number' })
          .int('Limit must be a whole number')
          .min(1, 'Limit must be at least 1')
          .max(ISSUE_LIST_MAX_LIMIT, `Limit must be at most ${ISSUE_LIST_MAX_LIMIT}`),
      )
      .optional(),
  })
  .strict();

/**
 * `PATCH /api/authority/issues/:issueId/verify` body.
 *
 * An empty, strict object: the endpoint decides that a REPORTED issue becomes
 * VERIFIED, so `{}` and no body at all are both accepted, while anything the
 * client tries to dictate (`status`, `verifiedBy`, `verifiedAt`, `authorityId`) is a
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
 * `PATCH /api/authority/issues/:issueId/reject` body.
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

export type IssueListQuery = z.infer<typeof issueListQuerySchema>;
export type VerifyIssueRequest = z.infer<typeof verifyIssueSchema>;
export type RejectIssueRequest = z.infer<typeof rejectIssueSchema>;