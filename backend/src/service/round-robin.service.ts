import { withTransaction } from '../config/db.js';
import * as roundRobinDao from '../dao/round-robin.dao.js';
import type { EligibleAuthority } from '../types/authority-eligibility.types.js';
import type { RoundRobinInput, RoundRobinResult } from '../types/round-robin.types.js';
import { logger } from '../utils/logger.js';

/**
 * Persistent round-robin selection.
 *
 * Pure backend decision layer: no AI, no issue mutation, no task creation, no
 * endpoint. It only picks WHICH eligible authority comes next for a group and
 * persists that pointer in PostgreSQL so the order survives restarts.
 *
 * Selection contract:
 *   - the eligible list is normalised (deduped) and sorted by authority id ASC,
 *     so the same eligible set always yields the same order;
 *   - the next authority is the one after the stored pointer in that order;
 *   - if the stored pointer is no longer eligible (or null), pick the first
 *     authority of the current list - never fail because of a stale pointer;
 *   - the caller (Prompt 4 eligibility) has already filtered for VERIFIED /
 *     skill / jurisdiction / availability - this layer trusts that list.
 *
 * Concurrency: the state row is locked with SELECT ... FOR UPDATE inside one
 * transaction, so two simultaneous requests for the same group serialise and
 * receive different authorities.
 */

const fail = (
  assignmentGroup: string,
  error: 'NO_ELIGIBLE_AUTHORITY' | 'ROUND_ROBIN_INVALID_INPUT' | 'ROUND_ROBIN_DB_ERROR',
): RoundRobinResult => ({ success: false, error, assignmentGroup });

/** Deterministic order: authority id ascending, independent of input order. */
const normalizeEligible = (eligible: readonly EligibleAuthority[]): EligibleAuthority[] => {
  const byId = new Map<string, EligibleAuthority>();
  for (const authority of eligible) {
    const id = authority?.authorityId?.trim();
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, authority);
  }
  return [...byId.values()].sort((a, b) => (a.authorityId < b.authorityId ? -1 : a.authorityId > b.authorityId ? 1 : 0));
};

/** Index of the stored pointer in the current list; -1 when absent/stale. */
const indexOfPointer = (sorted: readonly EligibleAuthority[], pointer: string | null): number => {
  if (!pointer) return -1;
  return sorted.findIndex((a) => a.authorityId === pointer);
};

export const selectNextAuthority = async (input: RoundRobinInput): Promise<RoundRobinResult> => {
  const assignmentGroup = input.assignmentGroup?.trim() ?? '';
  if (assignmentGroup.length === 0 || assignmentGroup.length > 200) {
    return fail(assignmentGroup, 'ROUND_ROBIN_INVALID_INPUT');
  }

  const sorted = normalizeEligible(input.eligibleAuthorities ?? []);
  if (sorted.length === 0) {
    // Valid business result, not a system error. State is NOT touched.
    logger.info('Round robin: no eligible authority', { assignmentGroup });
    return fail(assignmentGroup, 'NO_ELIGIBLE_AUTHORITY');
  }

  try {
    const selected = await withTransaction(async (client) => {
      let state = await roundRobinDao.lockStateForUpdate(client, assignmentGroup);

      if (!state) {
        // First selection for this group. ON CONFLICT DO NOTHING makes the
        // insert race-safe; the re-read below acquires the row lock.
        await roundRobinDao.insertStateIfMissing(client, assignmentGroup);
        state = await roundRobinDao.lockStateForUpdate(client, assignmentGroup);
        if (!state) {
          throw new Error('round-robin state row unavailable after insert');
        }
      }

      const pointerIndex = indexOfPointer(sorted, state.lastAssignedAuthorityId);
      const next =
        pointerIndex === -1 ? sorted[0] : sorted[(pointerIndex + 1) % sorted.length];
      if (!next) {
        throw new Error('round-robin produced no candidate from a non-empty list');
      }

      await roundRobinDao.updateLastAssigned(client, assignmentGroup, next.authorityId);

      return { selected: next, previous: state.lastAssignedAuthorityId };
    });

    const selectedAuthority = selected.selected;
    logger.debug('Round robin selected authority', {
      assignmentGroup,
      authorityId: selectedAuthority.authorityId,
      previousAuthorityId: selected.previous,
      eligibleCount: sorted.length,
    });

    return {
      success: true,
      selectedAuthority,
      assignmentGroup,
      previousAuthorityId: selected.previous,
    };
  } catch (error) {
    // Never leak raw PostgreSQL errors to callers.
    logger.error('Round robin database failure', {
      assignmentGroup,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return fail(assignmentGroup, 'ROUND_ROBIN_DB_ERROR');
  }
};
