import { query } from '../config/db.js';
import type { AdminWorkItem, CreateAdminWorkItemData } from '../types/admin-task.types.js';
import { INITIAL_ADMIN_WORK_ITEM_STATUS } from '../types/admin-task.types.js';

/**
 * Database access for `admin_work_items`. SQL and row mapping only - the
 * failure normalisation and wording live in the service.
 */

const WORK_ITEM_COLUMNS =
  'id, issue_id, failure_stage, failure_code, type, title, description, status, priority, created_at, updated_at';

interface AdminWorkItemRow {
  id: string;
  issue_id: string;
  failure_stage: AdminWorkItem['failureStage'];
  failure_code: string | null;
  type: AdminWorkItem['type'];
  title: string;
  description: string;
  status: AdminWorkItem['status'];
  priority: AdminWorkItem['priority'];
  created_at: Date;
  updated_at: Date;
}

const toAdminWorkItem = (row: AdminWorkItemRow): AdminWorkItem => ({
  id: row.id,
  issueId: row.issue_id,
  failureStage: row.failure_stage,
  failureCode: row.failure_code,
  type: row.type,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Creates an OPEN work item idempotently.
 *
 * The partial unique index `admin_work_items_active_stage_uidx` allows one
 * ACTIVE item per issue + stage; ON CONFLICT DO NOTHING turns a repeated
 * workflow failure into a no-op that returns the existing behaviour (null),
 * so retries can never spam the Admin queue with duplicates. A RESOLVED item
 * no longer occupies the slot, so a genuinely new failure is recorded again.
 */
export const createAdminWorkItem = async (data: CreateAdminWorkItemData): Promise<string | null> => {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO admin_work_items (
       issue_id, failure_stage, failure_code, type, title, description, status, priority
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (issue_id, failure_stage)
       WHERE status IN ('OPEN', 'IN_PROGRESS')
       DO NOTHING
     RETURNING id`,
    [
      data.issueId,
      data.failureStage,
      data.failureCode,
      data.type,
      data.title,
      data.description,
      INITIAL_ADMIN_WORK_ITEM_STATUS,
      data.priority,
    ],
  );

  return rows[0]?.id ?? null;
};

/** Admin My Tasks listing: newest first, optional status filter. */
export const findAdminWorkItems = async (status: string | null): Promise<AdminWorkItem[]> => {
  const { rows } = await query<AdminWorkItemRow>(
    `SELECT ${WORK_ITEM_COLUMNS}
     FROM admin_work_items
     WHERE ($1::text IS NULL OR status = $1)
     ORDER BY created_at DESC
     LIMIT 200`,
    [status],
  );

  return rows.map(toAdminWorkItem);
};

/** One work item, or null. */
export const findAdminWorkItemById = async (id: string): Promise<AdminWorkItem | null> => {
  const { rows } = await query<AdminWorkItemRow>(
    `SELECT ${WORK_ITEM_COLUMNS}
     FROM admin_work_items
     WHERE id = $1`,
    [id],
  );

  const row = rows[0];
  return row ? toAdminWorkItem(row) : null;
};

/**
 * Closes the OPEN/IN_PROGRESS work item of one issue + stage, if any.
 *
 * Called when a retry-bucket resend finally succeeds: the work item existed
 * only because the pipeline could not process that issue, so leaving it open
 * after a successful resend would show the Admin a task that is already done.
 * Returns the number of rows updated (0 = nothing to close).
 */
export const resolveActiveWorkItem = async (issueId: string, stage: string): Promise<number> => {
  const { rowCount } = await query(
    `UPDATE admin_work_items
        SET status = 'RESOLVED'
      WHERE issue_id = $1
        AND failure_stage = $2
        AND status IN ('OPEN', 'IN_PROGRESS')`,
    [issueId, stage],
  );

  return rowCount ?? 0;
};
