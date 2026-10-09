import type { PoolClient } from 'pg';

/**
 * Persistent round-robin state (`round_robin_state` table).
 *
 * SQL and row mapping only - no selection logic, no business rules. Every
 * function here takes an open `PoolClient` so the caller owns the transaction:
 * the lock and the write must happen inside the SAME transaction, otherwise the
 * concurrency guarantee is lost.
 */

export interface RoundRobinStateRow {
  assignmentGroup: string;
  lastAssignedAuthorityId: string | null;
}

/**
 * Locks the state row for the assignment group until the caller's transaction
 * ends. Two concurrent requests for the same group serialise here: the second
 * waits at FOR UPDATE, then reads the pointer written by the first.
 *
 * Returns null when the group has never been assigned.
 */
export const lockStateForUpdate = async (
  client: PoolClient,
  assignmentGroup: string,
): Promise<RoundRobinStateRow | null> => {
  const { rows } = await client.query<{
    assignment_group: string;
    last_assigned_authority_id: string | null;
  }>(
    `SELECT assignment_group, last_assigned_authority_id
     FROM round_robin_state
     WHERE assignment_group = $1
     FOR UPDATE`,
    [assignmentGroup],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    assignmentGroup: row.assignment_group,
    lastAssignedAuthorityId: row.last_assigned_authority_id,
  };
};

/**
 * Creates the initial state row when none exists. ON CONFLICT DO NOTHING makes
 * this safe when two transactions race on a brand-new group: the loser of the
 * insert race simply re-reads (and locks) the winner's row.
 */
export const insertStateIfMissing = async (
  client: PoolClient,
  assignmentGroup: string,
): Promise<void> => {
  await client.query(
    `INSERT INTO round_robin_state (assignment_group, last_assigned_authority_id)
     VALUES ($1, NULL)
     ON CONFLICT (assignment_group) DO NOTHING`,
    [assignmentGroup],
  );
};

/** Persists the newly selected authority as the group's pointer. */
export const updateLastAssigned = async (
  client: PoolClient,
  assignmentGroup: string,
  authorityApplicationId: string,
): Promise<void> => {
  await client.query(
    `UPDATE round_robin_state
     SET last_assigned_authority_id = $2
     WHERE assignment_group = $1`,
    [assignmentGroup, authorityApplicationId],
  );
};
