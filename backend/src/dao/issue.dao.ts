import { query } from '../config/db.js';
import type {
  AuthorityReviewIssue,
  CreateIssueData,
  Issue,
  IssueRow,
  MonitoredIssue,
  MonitoredIssueRow,
} from '../models/issue.model.js';
import { toAuthorityReviewIssue, toIssue, toMonitoredIssue } from '../models/issue.model.js';
import { ISSUE_STATUS_AFTER_AUTHORITY_ACTION, REVIEWABLE_ISSUE_STATUS } from '../types/issue.types.js';
import type { IssueStatus, ReviewedIssueStatus } from '../types/issue.types.js';
import { InternalServerError } from '../utils/api-error.js';

/**
 * Database access for the `issues` table.
 *
 * This layer performs SQL and row mapping only - no business rules, no status
 * transition decisions, no JWT handling and no ImageKit calls. Every query is
 * parameterised, so user input can never be interpolated into SQL text.
 *
 * Note what is *not* insertable from here: `id`, `status`, `created_at` and
 * `updated_at` are left to the column defaults, so a report is always created
 * as REPORTED and never with a caller supplied status.
 *
 * The review reads and the monitoring reads are separate statements on purpose.
 * A verified authority sees the civic problem and nothing about the person who
 * filed it (`ISSUE_REVIEW_COLUMNS`), while the admin monitoring view joins the
 * reporter (`ISSUE_MONITORING_SELECT`) - it reads but never writes.
 */

const ISSUE_COLUMNS =
  'id, user_id, issue_type, description, image_url, image_file_id, location_type, latitude, longitude, address, status, created_at, updated_at';

/**
 * Every column of an issue including the authority review metadata, which is what
 * the review writes must return.
 *
 * Note the absence of `user_id`: an authority never needs the reporter's account,
 * so the review payload cannot leak it even if a mapping forgets to strip it. The
 * citizen's own "My Reports" read uses `ISSUE_COLUMNS`, which does include it,
 * because that query is filtered by it.
 */
const ISSUE_REVIEW_COLUMNS =
  'id, issue_type, description, image_url, location_type, latitude, longitude, address, status, verified_by, verified_at, rejected_by, rejected_at, rejection_reason, created_at, updated_at';

/**
 * The admin monitoring read, joined to `users` for the account that filed the
 * report and to the issue's current assignment.
 *
 * `password_hash` is deliberately absent from the select list, and the mapping
 * (`toMonitoredIssue`) has no field that could carry it.
 *
 * The assignment join is a LATERAL sub-select for the newest non-cancelled
 * `authority_tasks` row of the issue - whichever created it, the AI (Boss) or an
 * admin. Without it the dashboard could never show who is handling an issue and
 * rendered every AI-assigned issue as "Unassigned". A cancelled task is skipped
 * so a revoked assignment does not keep the authority on screen.
 */
const ISSUE_MONITORING_SELECT = `
  SELECT i.id, i.issue_type, i.description, i.image_url, i.location_type,
         i.latitude, i.longitude, i.address, i.status,
         i.verified_by, i.verified_at, i.rejected_by, i.rejected_at, i.rejection_reason,
         i.created_at, i.updated_at,
         u.name AS citizen_name, u.email AS citizen_email,
         t.authority_application_id AS assigned_to,
         t.created_at AS assigned_at,
         COALESCE(aa.full_name, au.name) AS assignee_name,
         COALESCE(aa.email, au.email) AS assignee_email
  FROM issues i
  JOIN users u ON u.id = i.user_id
  LEFT JOIN LATERAL (
    SELECT at.authority_application_id, at.created_at
    FROM authority_tasks at
    WHERE at.issue_id = i.id
      AND at.status <> 'CANCELLED'
    ORDER BY at.created_at DESC
    LIMIT 1
  ) t ON TRUE
  LEFT JOIN authority_applications aa ON aa.id = t.authority_application_id
  LEFT JOIN users au ON au.id = aa.user_id`;

export const createIssue = async (data: CreateIssueData): Promise<Issue> => {
  const { rows } = await query<IssueRow>(
    `INSERT INTO issues (user_id, issue_type, description, image_url, image_file_id, location_type, latitude, longitude, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${ISSUE_COLUMNS}`,
    [
      data.userId,
      data.issueType,
      data.description,
      data.imageUrl,
      data.imageFileId,
      data.locationType,
      data.latitude,
      data.longitude,
      data.address,
    ],
  );

  const row = rows[0];

  if (!row) {
    throw new InternalServerError('Issue could not be created');
  }

  return toIssue(row);
};

export const findIssueById = async (id: string): Promise<Issue | null> => {
  const { rows } = await query<IssueRow>(`SELECT ${ISSUE_COLUMNS} FROM issues WHERE id = $1 LIMIT 1`, [id]);
  const row = rows[0];

  return row ? toIssue(row) : null;
};

/**
 * Every issue reported by one citizen, newest first. The `user_id` filter is
 * applied here, in SQL, so a caller cannot widen the result set.
 */
export const findIssuesByUserId = async (userId: string, limit: number): Promise<Issue[]> => {
  const { rows } = await query<IssueRow>(
    `SELECT ${ISSUE_COLUMNS}
     FROM issues
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );

  return rows.map(toIssue);
};

/**
 * Every reported issue for the admin monitoring view, newest first, optionally
 * narrowed to one status.
 *
 * Read-only by construction: no admin-owned write exists in this module. The
 * status filter is a parameter, never concatenated SQL text, so a caller cannot
 * inject a condition. An absent filter lists every status.
 */
export const findIssuesForMonitoring = async (status: IssueStatus | null, limit: number): Promise<MonitoredIssue[]> => {
  const { rows } = await query<MonitoredIssueRow>(
    `${ISSUE_MONITORING_SELECT}
     WHERE $1::text IS NULL OR i.status = $1::text
     ORDER BY i.created_at DESC
     LIMIT $2`,
    [status, limit],
  );

  return rows.map(toMonitoredIssue);
};

/**
 * One issue with the joined reporter, for the admin monitoring view. Returns null
 * when the id does not exist so the service can turn that into a 404.
 */
export const findMonitoredIssueById = async (id: string): Promise<MonitoredIssue | null> => {
  const { rows } = await query<MonitoredIssueRow>(
    `${ISSUE_MONITORING_SELECT}
     WHERE i.id = $1
     LIMIT 1`,
    [id],
  );

  const row = rows[0];

  return row ? toMonitoredIssue(row) : null;
};

/**
 * Issues for the authority review queue, newest first, optionally narrowed to one
 * status. Without a status this is exactly the "Pending Issues" list an authority
 * dashboard shows - every REPORTED issue, with nobody assigned in particular,
 * because assignment is a later module.
 */
export const findIssuesForAuthorityReview = async (
  status: IssueStatus | null,
  limit: number,
): Promise<AuthorityReviewIssue[]> => {
  const { rows } = await query<IssueRow>(
    `SELECT ${ISSUE_REVIEW_COLUMNS}
     FROM issues
     WHERE $1::text IS NULL OR status = $1::text
     ORDER BY created_at DESC
     LIMIT $2`,
    [status, limit],
  );

  return rows.map(toAuthorityReviewIssue);
};

/**
 * One issue for the authority review screen, or null when the id does not exist,
 * so the service can turn that into a 404.
 *
 * Unfiltered by status on purpose: an already reviewed issue must still be
 * openable, only the *transition* is restricted.
 */
export const findAuthorityReviewIssueById = async (id: string): Promise<AuthorityReviewIssue | null> => {
  const { rows } = await query<IssueRow>(
    `SELECT ${ISSUE_REVIEW_COLUMNS}
     FROM issues
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  const row = rows[0];

  return row ? toAuthorityReviewIssue(row) : null;
};

/**
 * Moves a REPORTED issue to VERIFIED and records who did it and when.
 *
 * Two things are enforced here, both in SQL:
 *  - `status = $3` in the WHERE clause. The transition target is supplied as a
 *    parameter and the source status is the single REVIEWABLE_ISSUE_STATUS
 *    constant, so an already reviewed issue can never be overwritten - even if
 *    two authorities press the button at the same moment. The service turns "no
 *    row updated" into a 409.
 *  - `verified_by` / `verified_at` come from the caller, which is the
 *    authenticated authority id. They are never read from the request body.
 *
 * The reviewer is not re-checked for its authority standing here on purpose: that
 * is settled once, at the route (`requireRole('AUTHORITY')` +
 * `requireVerifiedAuthority()`), and a second check in SQL would only be another
 * place to keep in sync.
 */
export const verifyIssue = async (id: string, authorityId: string): Promise<AuthorityReviewIssue | null> => {
  const { rows } = await query<IssueRow>(
    `UPDATE issues
        SET status = $3,
            verified_by = $2,
            verified_at = NOW()
      WHERE id = $1
        AND status = $4
      RETURNING ${ISSUE_REVIEW_COLUMNS}`,
    [id, authorityId, ISSUE_STATUS_AFTER_AUTHORITY_ACTION.VERIFY, REVIEWABLE_ISSUE_STATUS],
  );

  const row = rows[0];

  return row ? toAuthorityReviewIssue(row) : null;
};

/**
 * Moves a REPORTED issue to REJECTED, storing the optional reason in its own
 * column (never appended to `description`) plus the rejecting authority and the
 * timestamp.
 *
 * `rejection_reason = COALESCE($5, rejection_reason)` leaves the column null when
 * no reason is sent, and the same `status = $4` guard as `verifyIssue` keeps the
 * transition one-way.
 */
export const rejectIssue = async (
  id: string,
  authorityId: string,
  reason: string | null,
): Promise<AuthorityReviewIssue | null> => {
  const { rows } = await query<IssueRow>(
    `UPDATE issues
        SET status = $3,
            rejected_by = $2,
            rejected_at = NOW(),
            rejection_reason = COALESCE($5, rejection_reason)
      WHERE id = $1
        AND status = $4
      RETURNING ${ISSUE_REVIEW_COLUMNS}`,
    [id, authorityId, ISSUE_STATUS_AFTER_AUTHORITY_ACTION.REJECT, REVIEWABLE_ISSUE_STATUS, reason],
  );

  const row = rows[0];

  return row ? toAuthorityReviewIssue(row) : null;
};

/**
 * Applies the Watcher AI decision to a REPORTED issue: ACCEPT -> VERIFIED,
 * REJECT -> REJECTED.
 *
 * Same one-way guard as the authority transitions - `AND status = $4` with the
 * single REVIEWABLE_ISSUE_STATUS constant - so the AI can never overwrite a
 * decision an authority has already taken, and a concurrent authority review
 * simply wins (the caller sees null and reports the issue as processed).
 *
 * The difference from `verifyIssue` / `rejectIssue` is who acted: there is no
 * authenticated account behind a Watcher run, so `verified_by` / `rejected_by`
 * stay NULL and only the timestamp and, for a rejection, the reason are
 * written. That is exactly what `issues_verification_state_valid` allows - the
 * constraint requires the timestamps, never the actor id.
 */
export const applyWatcherDecision = async (
  id: string,
  status: ReviewedIssueStatus,
  rejectionReason: string | null,
): Promise<AuthorityReviewIssue | null> => {
  const { rows } = await query<IssueRow>(
    `UPDATE issues
        SET status = $2::varchar,
            verified_at = CASE WHEN $2::varchar = 'VERIFIED' THEN NOW() ELSE NULL END,
            rejected_at = CASE WHEN $2::varchar = 'REJECTED' THEN NOW() ELSE NULL END,
            rejection_reason = CASE WHEN $2::varchar = 'REJECTED' THEN $3 ELSE NULL END
      WHERE id = $1
        AND status = $4
      RETURNING ${ISSUE_REVIEW_COLUMNS}`,
    [id, status, rejectionReason, REVIEWABLE_ISSUE_STATUS],
  );

  const row = rows[0];

  return row ? toAuthorityReviewIssue(row) : null;
};

export const deleteIssue = async (id: string): Promise<void> => {
  await query('DELETE FROM issues WHERE id = $1', [id]);
};


