import { query } from '../config/db.js';
import type { CreateIssueData, Issue, IssueRow } from '../models/issue.model.js';
import { toIssue } from '../models/issue.model.js';
import { InternalServerError } from '../utils/api-error.js';

/**
 * Database access for the `issues` table.
 *
 * This layer performs SQL and row mapping only - no business rules, no status
 * transitions, no JWT handling and no ImageKit calls. Every query is
 * parameterised, so user input can never be interpolated into SQL text.
 *
 * Note what is *not* insertable from here: `id`, `status`, `created_at` and
 * `updated_at` are left to the column defaults, so a report is always created
 * as REPORTED and never with a caller supplied status.
 */

const ISSUE_COLUMNS =
  'id, user_id, issue_type, description, image_url, image_file_id, location_type, latitude, longitude, address, status, created_at, updated_at';

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
