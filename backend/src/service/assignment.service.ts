import * as issueDao from '../dao/issue.dao.js';
import { findUserById } from '../dao/user.dao.js';
import type { AdminIssue } from '../models/issue.model.js';
import { toSafeIssue } from '../models/issue.model.js';
import type {
  AssignmentRecommendation,
  IssueAnalysis,
  WorkforceMember,
} from '../types/issue.types.js';
import { issueIdSchema } from '../validation/admin-issue.schema.js';
import { ConflictError, NotFoundError } from '../utils/api-error.js';
import { analyseIssue } from './ai-analysis.service.js';
import { getIssueForReview } from './admin-issue.service.js';

/**
 * Business layer for the post-verification workflow:
 *
 *   VERIFIED --(AI analysis)--> analysed --(workforce scoring)--> recommendation
 *     --(admin assign)--> ASSIGNED
 *
 * Responsibilities:
 *  - Run the rule-based AI analysis and persist it (`skill_required`,
 *    `complexity`, `effort_hours`, `ai_analyzed_at`). Re-runnable while the
 *    issue is VERIFIED; frozen once ASSIGNED.
 *  - Score the AUTHORITY workforce by availability (fewest active ASSIGNED /
 *    IN_PROGRESS tasks first) and return a ranked recommendation.
 *  - Perform the VERIFIED -> ASSIGNED transition for the admin's chosen
 *    authority, verifying the assignee is really an AUTHORITY.
 *
 * Nothing else belongs here: no SQL (that is the DAO), no HTTP concerns
 * (those are the controllers) and no status a client can choose - every
 * transition is its own function with server-side guards.
 */

export interface AssignIssueParams {
  issueId: string;
  adminId: string;
  authorityId: string;
}

const toWorkforceMember = (row: { id: string; name: string; email: string; active_assignments: string }): WorkforceMember => {
  const activeAssignments = Number(row.active_assignments);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    activeAssignments,
    available: activeAssignments === 0,
  };
};

/**
 * Scores authorities by availability. Fewer active tasks scores higher; a
 * fully free member gets a 100 base while busy members lose 15 points per
 * active task (floored at 10 so nobody is ever "unassignable").
 */
const scoreWorkforce = (workforce: WorkforceMember[]): AssignmentRecommendation['ranking'] =>
  workforce.map((authority) => {
    const score = Math.max(10, 100 - authority.activeAssignments * 15);
    return {
      authority,
      score,
      reason:
        authority.activeAssignments === 0
          ? `${authority.name} has no active tasks — immediately available.`
          : `${authority.name} has ${authority.activeAssignments} active task${authority.activeAssignments === 1 ? '' : 's'}.`,
    };
  });

/**
 * Runs the AI analysis on a VERIFIED issue and stores the outcome.
 * 404 when the issue does not exist, 409 when it is not VERIFIED
 * (already assigned, rejected, resolved, …).
 */
export const analyzeIssue = async (issueId: string): Promise<AdminIssue> => {
  const parsedIssueId = issueIdSchema.parse(issueId);
  const issue = await getIssueForReview(parsedIssueId);

  if (issue.status !== 'VERIFIED') {
    throw new ConflictError('Only a VERIFIED issue can be analysed.', 'ISSUE_NOT_ANALYSABLE');
  }

  const { skillRequired, complexity, effortHours } = analyseIssue({
    issueType: issue.issueType,
    description: issue.description,
    imageUrl: issue.imageUrl,
  });

  const analysed = await issueDao.saveAnalysis(issue.id, { skillRequired, complexity, effortHours });

  if (!analysed) {
    // Status moved between the read and the update (e.g. assigned meanwhile).
    throw new ConflictError('Issue is no longer awaiting analysis.', 'ISSUE_NOT_ANALYSABLE');
  }

  return analysed;
};

/**
 * Workforce snapshot: every AUTHORITY with live workload counts.
 */
export const getWorkforce = async (): Promise<WorkforceMember[]> => {
  const rows = await issueDao.findAuthorityWorkload();
  return rows.map(toWorkforceMember);
};

/**
 * Full assignment recommendation for a VERIFIED issue.
 *
 * Uses the stored analysis when one exists, otherwise analyses first so the
 * recommendation always carries the skill / complexity / effort briefing.
 * 404 when the issue does not exist, 409 when it is not VERIFIED.
 */
export const recommendAssignment = async (issueId: string): Promise<AssignmentRecommendation> => {
  const parsedIssueId = issueIdSchema.parse(issueId);
  let issue = await getIssueForReview(parsedIssueId);

  if (issue.status !== 'VERIFIED') {
    throw new ConflictError('Only a VERIFIED issue can be assigned.', 'ISSUE_NOT_ASSIGNABLE');
  }

  if (issue.skillRequired === null || issue.complexity === null || issue.effortHours === null) {
    issue = await analyzeIssue(issue.id);
  }

  const analysis: IssueAnalysis = {
    skillRequired: issue.skillRequired ?? 'GENERAL',
    complexity: issue.complexity ?? 'MEDIUM',
    effortHours: issue.effortHours ?? 4,
    analyzedAt: issue.aiAnalyzedAt ?? new Date(),
  };

  const workforce = await getWorkforce();
  const ranking = scoreWorkforce(workforce);

  return {
    issueId: issue.id,
    analysis,
    workforce,
    ranking,
    recommendedAuthorityId: ranking[0]?.authority.id ?? null,
  };
};

/**
 * VERIFIED -> ASSIGNED for the admin's chosen authority.
 *
 * 404 when the issue (or the assignee) does not exist, 409 when the issue is
 * not VERIFIED or was assigned concurrently, 400-family when the assignee is
 * not an AUTHORITY.
 */
export const assignIssue = async (params: AssignIssueParams): Promise<AdminIssue> => {
  const parsedIssueId = issueIdSchema.parse(params.issueId);

  const assignee = await findUserById(params.authorityId);

  if (!assignee) {
    throw new NotFoundError('Authority member not found', 'AUTHORITY_NOT_FOUND');
  }

  if (assignee.role !== 'AUTHORITY') {
    throw new ConflictError('Issues can only be assigned to AUTHORITY members.', 'INVALID_ASSIGNEE_ROLE');
  }

  // Ensure the issue exists first so an unknown id is a 404, not a 409.
  const existing = await getIssueForReview(parsedIssueId);

  if (existing.status !== 'VERIFIED') {
    throw new ConflictError('Only a VERIFIED issue can be assigned.', 'ISSUE_NOT_ASSIGNABLE');
  }

  const assigned = await issueDao.assignIssue(existing.id, params.adminId, assignee.id);

  if (!assigned) {
    throw new ConflictError('Issue was assigned or moved concurrently.', 'ISSUE_NOT_ASSIGNABLE');
  }

  return assigned;
};

/** Re-exposes the safe citizen shape for authority task lists. */
export const toSafeIssueExport = toSafeIssue;
