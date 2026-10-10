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
  title: string | null;
  priority: string;
  due_date: Date | null;
  assigned_by: string | null;
  completed_at: Date | null;
  rejection_reason: string | null;
  work_notes: string | null;
  proof_image_url: string | null;
  required_skill: string;
  required_jurisdiction: string | null;
  estimated_duration_minutes: number;
  complexity: string;
  created_at: Date;
  updated_at: Date;
  issue_type: string;
  description: string;
  image_url: string | null;
  location_type: string;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  assigned_by_name: string | null;
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
  opts?: { priority?: string | null; search?: string | null; limit?: number; offset?: number },
): Promise<AuthorityTaskWithIssueRow[]> => {
  const { rows } = await query<AuthorityTaskWithIssueRow>(
    `SELECT
       t.id,
       t.issue_id,
       t.status,
       t.title,
       t.priority,
       t.due_date,
       t.assigned_by,
       t.completed_at,
       t.rejection_reason,
       t.work_notes,
       t.proof_image_url,
       t.required_skill,
       t.required_jurisdiction,
       t.estimated_duration_minutes,
       t.complexity,
       t.created_at,
       t.updated_at,
       i.issue_type,
       i.description,
       i.image_url,
       i.location_type,
       i.latitude,
       i.longitude,
       i.address,
       ab.name AS assigned_by_name
     FROM authority_tasks t
     JOIN issues i ON i.id = t.issue_id
     LEFT JOIN users ab ON ab.id = t.assigned_by
     WHERE t.authority_application_id = $1
       AND ($2::text IS NULL OR t.status = $2)
       AND ($3::text IS NULL OR t.priority = $3)
       AND ($4::text IS NULL OR i.description ILIKE '%' || $4 || '%' OR COALESCE(t.title,'') ILIKE '%' || $4 || '%')
     ORDER BY
       CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
       t.due_date ASC NULLS LAST,
       t.created_at DESC
     LIMIT $5 OFFSET $6`,
    [
      authorityApplicationId,
      status,
      opts?.priority ?? null,
      opts?.search ?? null,
      opts?.limit ?? 200,
      opts?.offset ?? 0,
    ],
  );

  return rows;
};

export const countTasksByAuthorityApplicationId = async (
  authorityApplicationId: string,
): Promise<{ status: string; count: number }[]> => {
  const { rows } = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM authority_tasks
     WHERE authority_application_id = $1
     GROUP BY status`,
    [authorityApplicationId],
  );
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
};

/** One task owned by this authority (authority + admin use different guards). */
export const findTaskWithIssueById = async (
  taskId: string,
): Promise<AuthorityTaskWithIssueRow | null> => {
  const { rows } = await query<AuthorityTaskWithIssueRow>(
    `SELECT
       t.id, t.issue_id, t.status, t.title, t.priority, t.due_date,
       t.assigned_by, t.completed_at, t.rejection_reason, t.work_notes,
       t.proof_image_url, t.required_skill, t.required_jurisdiction,
       t.estimated_duration_minutes, t.complexity, t.created_at, t.updated_at,
       i.issue_type, i.description, i.image_url, i.location_type,
       i.latitude, i.longitude, i.address,
       ab.name AS assigned_by_name
     FROM authority_tasks t
     JOIN issues i ON i.id = t.issue_id
     LEFT JOIN users ab ON ab.id = t.assigned_by
     WHERE t.id = $1
     LIMIT 1`,
    [taskId],
  );
  return rows[0] ?? null;
};

export const findTaskAuthorityId = async (taskId: string): Promise<string | null> => {
  const { rows } = await query<{ authority_application_id: string }>(
    'SELECT authority_application_id FROM authority_tasks WHERE id = $1 LIMIT 1',
    [taskId],
  );
  return rows[0]?.authority_application_id ?? null;
};

/**
 * Forward-only status transition, guarded by the current status in WHERE
 * so two concurrent updates cannot both win.
 */
export const transitionTaskStatus = async (
  taskId: string,
  from: readonly string[],
  to: string,
  opts?: { note?: string | null; reason?: string | null },
): Promise<boolean> => {
  const { rowCount } = await query(
    `UPDATE authority_tasks
        SET status = $2,
            work_notes = COALESCE($3, work_notes),
            rejection_reason = CASE WHEN $2 = 'CANCELLED' THEN $4 ELSE rejection_reason END,
            completed_at = CASE WHEN $2 = 'COMPLETED' THEN NOW() ELSE completed_at END
      WHERE id = $1
        AND status = ANY($5::text[])`,
    [taskId, to, opts?.note ?? null, opts?.reason ?? null, [...from]],
  );
  return (rowCount ?? 0) > 0;
};

/** Manual task creation by an admin (issue must be VERIFIED, checked in service). */
export const createManualAuthorityTask = async (
  client: PoolClient,
  data: CreateAuthorityTaskData & {
    title?: string | null;
    priority?: string | null;
    dueDate?: Date | null;
    assignedBy?: string | null;
  },
): Promise<string | null> => {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO authority_tasks (
       issue_id, authority_application_id, assignment_group,
       required_skill, required_jurisdiction, estimated_duration_minutes,
       complexity, status, title, priority, due_date, assigned_by
     )
     VALUES ($1, $2, $3, $4::authority_skill, $5, $6, $7, 'ASSIGNED', $8, COALESCE($9,'MEDIUM'), $10, $11)
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
      data.title ?? null,
      data.priority ?? 'MEDIUM',
      data.dueDate ?? null,
      data.assignedBy ?? null,
    ],
  );
  return rows[0]?.id ?? null;
};

/** Every assignment in the system (admin view), newest first. */
export const listAllTasksWithIssue = async (limit = 200): Promise<AuthorityTaskWithIssueRow[]> => {
  const { rows } = await query<AuthorityTaskWithIssueRow>(
    `SELECT
       t.id, t.issue_id, t.status, t.title, t.priority, t.due_date,
       t.assigned_by, t.completed_at, t.rejection_reason, t.work_notes,
       t.proof_image_url, t.required_skill, t.required_jurisdiction,
       t.estimated_duration_minutes, t.complexity, t.created_at, t.updated_at,
       i.issue_type, i.description, i.image_url, i.location_type,
       i.latitude, i.longitude, i.address,
       ab.name AS assigned_by_name
     FROM authority_tasks t
     JOIN issues i ON i.id = t.issue_id
     LEFT JOIN users ab ON ab.id = t.assigned_by
     ORDER BY t.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
};

export interface TaskCommentRow {
  id: string;
  task_id: string;
  author_id: string;
  author_role: string;
  body: string;
  created_at: Date;
  author_name: string | null;
}

export const listTaskComments = async (taskId: string): Promise<TaskCommentRow[]> => {
  const { rows } = await query<TaskCommentRow>(
    `SELECT c.id, c.task_id, c.author_id, c.author_role, c.body, c.created_at, u.name AS author_name
     FROM authority_task_comments c
     LEFT JOIN users u ON u.id = c.author_id
     WHERE c.task_id = $1
     ORDER BY c.created_at ASC
     LIMIT 100`,
    [taskId],
  );
  return rows;
};

export const addTaskComment = async (
  taskId: string,
  authorId: string,
  authorRole: string,
  body: string,
): Promise<TaskCommentRow> => {
  const { rows } = await query<TaskCommentRow>(
    `INSERT INTO authority_task_comments (task_id, author_id, author_role, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id, task_id, author_id, author_role, body, created_at`,
    [taskId, authorId, authorRole, body],
  );
  const row = rows[0];
  if (!row) throw new Error('Comment could not be created');
  return { ...row, author_name: null };
};
