import { withTransaction } from '../config/db.js';
import * as assignmentDao from '../dao/assignment.dao.js';
import * as authorityDao from '../dao/authority.dao.js';
import * as issueDao from '../dao/issue.dao.js';
import { runBoss } from '../ai/services/boss.service.js';
import type { BossDecision, BossErrorCode } from '../ai/types/boss.types.js';
import { getEligibleAuthorities } from './authority-eligibility.service.js';
import { selectNextAuthority } from './round-robin.service.js';
import type { AssignmentErrorCode, AssignmentResult } from '../types/assignment.types.js';
import { ASSIGNMENT_TASK_STATUSES } from '../types/assignment.types.js';
import { logger } from '../utils/logger.js';

/**
 * Internal assignment orchestrator (no public endpoint).
 *
 *   VERIFIED issue -> Boss -> Eligibility -> Round Robin -> task row
 *
 * The AI (Boss) only describes what is needed; eligibility filters; round robin
 * selects; this service executes the database mutation. It never invents an
 * authority, never trusts client input and never changes issue status - the
 * `authority_tasks` row IS the assignment (issue stays VERIFIED, see migration
 * 006 for why).
 *
 * Duplicate protection has two layers:
 *   1. an early read (cheap rejection before paying for an AI call), and
 *   2. the partial unique index `authority_tasks_active_issue_uidx`, consulted
 *      with ON CONFLICT inside one transaction - the database is the final
 *      authority, so two concurrent requests can never both create a task.
 *
 * Known limitation (documented per Prompt 6): Round Robin commits its pointer
 * in its own transaction BEFORE the task insert. If task creation then fails,
 * the pointer has already advanced - selection is treated as a committed
 * scheduling decision, so the next issue simply gets the following authority.
 * The Prompt 5 service is intentionally not rewritten to avoid duplicated
 * transaction management.
 */

const fail = (issueId: string, error: AssignmentErrorCode): AssignmentResult => ({
  success: false,
  error,
  issueId,
});

const BOSS_ERROR_MAP: Partial<Record<BossErrorCode, AssignmentErrorCode>> = {
  BOSS_UNAVAILABLE: 'BOSS_UNAVAILABLE',
  BOSS_RATE_LIMITED: 'BOSS_RATE_LIMITED',
  BOSS_TIMEOUT: 'BOSS_TIMEOUT',
  BOSS_INVALID_OUTPUT: 'BOSS_INVALID_OUTPUT',
};

/**
 * Deterministic assignment group: same skill + same jurisdiction always resolve
 * to the same group. No random values, no timestamps. Normalised (trimmed,
 * uppercased) so "ward 12" and "WARD_12"-style variants from the same source
 * stay stable; the caller owns the actual jurisdiction semantics.
 */
const buildAssignmentGroup = (requiredSkill: string, requiredJurisdiction: string | null): string => {
  const skill = requiredSkill.trim().toUpperCase();
  const jurisdiction = (requiredJurisdiction ?? 'ANY').trim().toUpperCase().replace(/\s+/g, '_');
  return `SKILL:${skill}|JURISDICTION:${jurisdiction}`.slice(0, 200);
};

export const assignIssue = async (issueId: string): Promise<AssignmentResult> => {
  const trimmedIssueId = issueId?.trim() ?? '';
  if (!trimmedIssueId) {
    return fail(trimmedIssueId, 'ISSUE_NOT_FOUND');
  }

  try {
    // Fast duplicate rejection before the (expensive) Boss call.
    const existing = await assignmentDao.findActiveAssignmentByIssueId(trimmedIssueId);
    if (existing) {
      logger.info('Assignment skipped: already assigned', { issueId: trimmedIssueId });
      return fail(trimmedIssueId, 'ALREADY_ASSIGNED');
    }

    // Boss.
    const bossResult = await runBoss(trimmedIssueId);
    if (!bossResult.success || !bossResult.decision) {
      const mapped = bossResult.error ? BOSS_ERROR_MAP[bossResult.error] : undefined;
      return fail(trimmedIssueId, mapped ?? 'BOSS_INVALID_OUTPUT');
    }

    return assignIssueWithDecision(trimmedIssueId, bossResult.decision);
  } catch (error) {
    // Raw PostgreSQL errors never reach the caller.
    logger.error('Assignment orchestration failed', {
      issueId: trimmedIssueId,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return fail(trimmedIssueId, 'ASSIGNMENT_DB_ERROR');
  }
};

/**
 * Assignment pipeline for an ALREADY COMPUTED Boss decision.
 *
 * The workflow orchestrator (workflow.service.ts) runs Boss once and hands the
 * result here, so Gemini is never called twice for the same issue. `assignIssue`
 * above keeps the standalone contract (it runs Boss itself) for callers that
 * only have an issue id.
 */
export const assignIssueWithDecision = async (
  issueId: string,
  decision: BossDecision,
): Promise<AssignmentResult> => {
  const trimmedIssueId = issueId?.trim() ?? '';
  if (!trimmedIssueId) {
    return fail(trimmedIssueId, 'ISSUE_NOT_FOUND');
  }

  try {
    // Issue exists and is VERIFIED.
    const issue = await issueDao.findIssueById(trimmedIssueId);
    if (!issue) {
      return fail(trimmedIssueId, 'ISSUE_NOT_FOUND');
    }
    if (issue.status !== 'VERIFIED') {
      return fail(trimmedIssueId, 'ISSUE_NOT_VERIFIED');
    }

    // Duplicate guard (the partial unique index is the final authority below).
    const existing = await assignmentDao.findActiveAssignmentByIssueId(trimmedIssueId);
    if (existing) {
      return fail(trimmedIssueId, 'ALREADY_ASSIGNED');
    }

    // Eligibility (existing service, no duplicated filtering logic).
    const eligibleAuthorities = await getEligibleAuthorities({
      requiredSkill: decision.requiredSkill,
      requiredJurisdiction: decision.requiredJurisdiction,
      estimatedDurationMinutes: decision.estimatedDurationMinutes,
    });

    // 9. No match: clean business result, nothing is written.
    if (eligibleAuthorities.length === 0) {
      logger.info('Assignment aborted: no eligible authority', {
        issueId: trimmedIssueId,
        requiredSkill: decision.requiredSkill,
      });
      return fail(trimmedIssueId, 'NO_ELIGIBLE_AUTHORITY');
    }

    // 10-11. Round Robin selects (existing service, own transaction).
    const assignmentGroup = buildAssignmentGroup(
      decision.requiredSkill,
      decision.requiredJurisdiction,
    );
    const selection = await selectNextAuthority({
      assignmentGroup,
      eligibleAuthorities,
    });
    if (!selection.success) {
      return fail(trimmedIssueId, 'ROUND_ROBIN_ERROR');
    }

    // 12-14. Create the task; the partial unique index is the final guard.
    let assignmentId: string;
    try {
      const createdId = await withTransaction((client) =>
        assignmentDao.createAuthorityTask(client, {
          issueId: trimmedIssueId,
          authorityApplicationId: selection.selectedAuthority.authorityId,
          assignmentGroup,
          requiredSkill: decision.requiredSkill,
          requiredJurisdiction: decision.requiredJurisdiction,
          estimatedDurationMinutes: decision.estimatedDurationMinutes,
          complexity: decision.complexity,
        }),
      );
      if (!createdId) {
        // Concurrent request won the insert race - not a system error.
        return fail(trimmedIssueId, 'ALREADY_ASSIGNED');
      }
      assignmentId = createdId;
    } catch (error) {
      logger.error('Task creation failed', {
        issueId: trimmedIssueId,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      return fail(trimmedIssueId, 'TASK_CREATION_FAILED');
    }

    logger.info('Issue assigned', {
      issueId: trimmedIssueId,
      assignmentId,
      authorityId: selection.selectedAuthority.authorityId,
      assignmentGroup,
      taskStatus: 'ASSIGNED',
    });

    // 16. Issue status intentionally unchanged (stays VERIFIED).
    return {
      success: true,
      assignmentId,
      issueId: trimmedIssueId,
      authorityId: selection.selectedAuthority.authorityId,
      taskStatus: 'ASSIGNED',
      assignmentGroup,
    };
  } catch (error) {
    // Raw PostgreSQL errors never reach the caller.
    logger.error('Assignment orchestration failed', {
      issueId: trimmedIssueId,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return fail(trimmedIssueId, 'ASSIGNMENT_DB_ERROR');
  }
};

/** One task of the "My Tasks" list, shaped for the authority dashboard. */
export interface AuthorityTaskSummary {
  id: string;
  issueId: string;
  issueType: string;
  description: string;
  imageUrl: string | null;
  location:
    | { type: 'GPS'; latitude: number; longitude: number }
    | { type: 'MANUAL'; address: string };
  requiredSkill: string;
  requiredJurisdiction: string | null;
  estimatedDurationMinutes: number;
  complexity: string;
  status: string;
  createdAt: Date;
}

const VALID_TASK_STATUSES = new Set<string>(ASSIGNMENT_TASK_STATUSES);

/**
 * Authority "My Tasks" read path.
 *
 * Read-only: an authority lists its own assignments and nothing else. The
 * authority id is resolved from the authenticated user (userId -> authority
 * application), never from a request field, and admin work items live in a
 * different table so they can never appear here. Unknown status values are
 * ignored rather than passed into SQL.
 */
export const listMyTasks = async (
  userId: string,
  status?: string,
): Promise<AuthorityTaskSummary[]> => {
  const application = await authorityDao.findAuthorityApplicationByUserId(userId);
  if (!application) {
    return [];
  }

  const trimmedStatus = status?.trim().toUpperCase() ?? '';
  const normalizedStatus =
    trimmedStatus && VALID_TASK_STATUSES.has(trimmedStatus) ? trimmedStatus : null;

  const rows = await assignmentDao.findTasksByAuthorityApplicationId(
    application.id,
    normalizedStatus,
  );

  return rows.map((row) => ({
    id: row.id,
    issueId: row.issue_id,
    issueType: row.issue_type,
    description: row.description,
    imageUrl: row.image_url,
    location:
      row.location_type === 'GPS'
        ? {
            type: 'GPS' as const,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
          }
        : { type: 'MANUAL' as const, address: row.address ?? '' },
    requiredSkill: row.required_skill,
    requiredJurisdiction: row.required_jurisdiction,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    complexity: row.complexity,
    status: row.status,
    createdAt: row.created_at,
  }));
};
