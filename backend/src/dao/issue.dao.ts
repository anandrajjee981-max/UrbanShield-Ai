import { query } from '../config/db.js';
import type {
  AdminIssue,
  AdminIssueRow,
  CreateIssueData,
  Issue,
  IssueRow,
} from '../models/issue.model.js';
import { toAdminIssue, toIssue } from '../models/issue.model.js';
import { ISSUE_STATUS_AFTER_ADMIN_ACTION, REVIEWABLE_ISSUE_STATUS } from '../types/issue.types.js';
import type { IssueStatus } from '../types/issue.types.js';
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
 */

const ISSUE_COLUMNS =
  'id, user_id, issue_type, description, image_url, image_file_id, location_type, latitude, longitude, address, status, created_at, updated_at';

/**
 * Columns needed by the admin review screen. The reviewer and citizen identities
 * stay as ids and are resolved through the `users` table; no name, email or
 * password hash is copied into `issues`.
 */
const ISSUE_ADMIN_COLUMNS =
  'id, user_id, issue_type, description, image_url, image_file_id, location_type, latitude, longitude, address, status, verified_by, verified_at, rejected_by, rejected_at, rejection_reason, created_at, updated_at';

/**
 * Every column the admin payload needs, including the joined citizen name and
 * email. `password_hash` is deliberately absent from the select list.
 */
const ADMIN_ISSUE_SELECT = `
  SELECT i.id, i.user_id, i.issue_type, i.description, i.image_url, i.image_file_id,
         i.location_type, i.latitude, i.longitude, i.address, i.status,
         i.verified_by, i.verified_at, i.rejected_by, i.rejected_at, i.rejection_reason,
         i.created_at, i.updated_at,
         u.name AS citizen_name, u.email AS citizen_email
  FROM issues i
  JOIN users u ON u.id = i.user_id`;

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
 * Every reported issue for the admin dashboard, newest first, optionally narrowed
 * to one status.
 *
 * The optional status filter is a parameter, never concatenated SQL text, so the
 * caller cannot inject a condition. An absent filter lists every status.
 */
export const findAllIssues = async (status: IssueStatus | null, limit: number): Promise<AdminIssue[]> => {
  const { rows } = await query<AdminIssueRow>(
    `${ADMIN_ISSUE_SELECT}
     WHERE $1::text IS NULL OR i.status = $1::text
     ORDER BY i.created_at DESC
     LIMIT $2`,
    [status, limit],
  );

  return rows.map(toAdminIssue);
};

/**
 * One issue with the joined citizen, for the admin review screen. Returns null
 * when the id does not exist so the service can turn that into a 404.
 */
export const findAdminIssueById = async (id: string): Promise<AdminIssue | null> => {
  const { rows } = await query<AdminIssueRow>(
    `${ADMIN_ISSUE_SELECT}
     WHERE i.id = $1
     LIMIT 1`,
    [id],
  );

  const row = rows[0];

  return row ? toAdminIssue(row) : null;
};

/**
 * Moves a REPORTED issue to VERIFIED and records who did it and when.
 *
 * Two things are enforced here, both in SQL:
 *  - `status = $3` in the WHERE clause. The transition target is supplied as a
 *    parameter and the source status is the single REVIEWABLE_ISSUE_STATUS
 *    constant, so an already reviewed issue can never be overwritten - even if
 *    two admins press the button at the same moment. The service turns "no row
 *    updated" into a 409.
 *  - `verified_by` / `verified_at` come from the caller, which is the
 *    authenticated admin id. They are never read from the request body.
 *
 * The update and the citizen join run in one statement through a CTE, so the
 * returned row is the reviewed issue with its new status and cannot be a stale
 * read from between the two queries.
 */
export const verifyIssue = async (id: string, adminId: string): Promise<AdminIssue | null> => {
  const { rows } = await query<AdminIssueRow>(
    `WITH reviewed AS (
       UPDATE issues
          SET status = $3,
              verified_by = $2,
              verified_at = NOW()
        WHERE id = $1
          AND status = $4
        RETURNING ${ISSUE_ADMIN_COLUMNS}
     )
     SELECT reviewed.*, u.name AS citizen_name, u.email AS citizen_email
     FROM reviewed
     JOIN users u ON u.id = reviewed.user_id`,
    [id, adminId, ISSUE_STATUS_AFTER_ADMIN_ACTION.VERIFY, REVIEWABLE_ISSUE_STATUS],
  );

  const row = rows[0];

  return row ? toAdminIssue(row) : null;
};

/**
 * Moves a REPORTED issue to REJECTED, storing the optional reason in its own
 * column (never appended to `description`) plus the rejecting admin and the
 * timestamp.
 *
 * `rejection_reason = COALESCE($5, rejection_reason)` leaves the column null when
 * no reason is sent, and the same `status = $4` guard as `verifyIssue` keeps the
 * transition one-way.
 */
export const rejectIssue = async (id: string, adminId: string, reason: string | null): Promise<AdminIssue | null> => {
  const { rows } = await query<AdminIssueRow>(
    `WITH reviewed AS (
       UPDATE issues
          SET status = $3,
              rejected_by = $2,
              rejected_at = NOW(),
              rejection_reason = COALESCE($5, rejection_reason)
        WHERE id = $1
          AND status = $4
        RETURNING ${ISSUE_ADMIN_COLUMNS}
     )
     SELECT reviewed.*, u.name AS citizen_name, u.email AS citizen_email
     FROM reviewed
     JOIN users u ON u.id = reviewed.user_id`,
    [id, adminId, ISSUE_STATUS_AFTER_ADMIN_ACTION.REJECT, REVIEWABLE_ISSUE_STATUS, reason],
  );

  const row = rows[0];

  return row ? toAdminIssue(row) : null;
};
