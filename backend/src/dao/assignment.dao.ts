import type { PoolClient } from 'pg';
import { query } from '../config/db.js';
import type { CreateAuthorityTaskData } from '../types/assignment.types.js';
import { ACTIVE_ASSIGNMENT_STATUSES, INITIAL_ASSIGNMENT_TASK_STATUS } from '../types/assignment.types.js';

/**
 * Database access for `authority_tasks`. SQL and row mapping only - the
 * orchestration (Boss, eligibility, round robin) lives in the service.
 */

export interface ActiveAssignmentRow {
  taskId: string;
  issueId: string;
  authorityApplicationId: string;
  status: string;
}

const TASK_COLUMNS = 'id, issue_id, authority_application_id, status';

/** The active (ASSIGNED/IN_PROGRESS) task of an issue, if one exists. */
export const findActiveAssignmentByIssueId = async (
  issueId: string,
): Promise<ActiveAssignmentRow | null> => {
  const { rows } = await query<ActiveAssignmentRow>(
    `SELECT ${TASK_COLUMNS}
     FROM authority_tasks
     WHERE issue_id = $1
       AND status = ANY($2::text[])
     LIMIT 1`,
    [issueId, [...ACTIVE_ASSIGNMENT_STATUSES]],
  );

  return rows[0] ?? null;
};

/**
 * Inserts the task inside the caller's transaction.
 *
 * The partial unique index `authority_tasks_active_issue_uidx` is the real
 * duplicate guard: if another transaction already created an active task for
 * this issue, ON CONFLICT DO NOTHING makes this insert a no-op and null is
 * returned so the caller can report ALREADY_ASSIGNED and roll back.
 */
export const createAuthorityTask = async (
  client: PoolClient,
  data: CreateAuthorityTaskData,
): Promise<string | null> => {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO authority_tasks (
       issue_id,
       authority_application_id,
       assignment_group,
       required_skill,
       required_jurisdiction,
       estimated_duration_minutes,
       complexity,
       status
     )
     VALUES ($1, $2, $3, $4::authority_skill, $5, $6, $7, $8)
     ON CONFLICT (issue_id)
        WHERE status IN ('ASSIGNED', 'IN_PROGRESS')
        DO NOTHING
     RETURNING id`,
    [
      data.issueId,
      data.authorityApplicationId,
      data.assignmentGroup,
      data.requiredSkill,
      data.requiredJurisdiction,
      data.estimatedDurationMinutes,
      data.complexity,
      INITIAL_ASSIGNMENT_TASK_STATUS,
    ],
  );

  return rows[0]?.id ?? null;
};

/**
 * One row of the Authority "My Tasks" list: the assignment fields plus the
 * issue data the dashboard displays. Issue location is read in its raw form
 * (coordinates XOR address, enforced by a CHECK constraint in 002) so the
 * caller decides how to present it.
 */
export interface AuthorityTaskWithIssueRow {
  id: string;
  issue_id: string;
  status: string;
  required_skill: string;
  required_jurisdiction: string | null;
  estimated_duration_minutes: number;
  complexity: string;
  created_at: Date;
  issue_type: string;
  description: string;
  image_url: string | null;
  location_type: string;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
}

/**
 * All tasks of one authority with their issue, newest first.
 *
 * The join guarantees the authority only ever sees its own rows: the WHERE
 * clause is on `authority_application_id`, which comes from the authenticated
 * user via `findAuthorityApplicationByUserId`, never from a request field. No
 * citizen identity and no other authority's data is selected.
 */
export const findTasksByAuthorityApplicationId = async (
  authorityApplicationId: string,
  status: string | null,
): Promise<AuthorityTaskWithIssueRow[]> => {
  const { rows } = await query<AuthorityTaskWithIssueRow>(
    `SELECT
       t.id,
       t.issue_id,
       t.status,
       t.required_skill,
       t.required_jurisdiction,
       t.estimated_duration_minutes,
       t.complexity,
       t.created_at,
       i.issue_type,
       i.description,
       i.image_url,
       i.location_type,
       i.latitude,
       i.longitude,
       i.address
     FROM authority_tasks t
     JOIN issues i ON i.id = t.issue_id
     WHERE t.authority_application_id = $1
       AND ($2::text IS NULL OR t.status = $2)
     ORDER BY t.created_at DESC
     LIMIT 200`,
    [authorityApplicationId, status],
  );

  return rows;
};
