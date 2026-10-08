import type { AuthoritySkill } from './authority.types.js';
import type { BossComplexity } from '../ai/types/boss.types.js';

export const ASSIGNMENT_TASK_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export type AssignmentTaskStatus = (typeof ASSIGNMENT_TASK_STATUSES)[number];

export const INITIAL_ASSIGNMENT_TASK_STATUS = 'ASSIGNED' satisfies AssignmentTaskStatus;

/** Statuses that count as an active assignment of an issue. */
export const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'IN_PROGRESS'] as const;

export const ASSIGNMENT_ERROR_CODES = [
  'ISSUE_NOT_FOUND',
  'ISSUE_NOT_VERIFIED',
  'ALREADY_ASSIGNED',
  'BOSS_UNAVAILABLE',
  'BOSS_RATE_LIMITED',
  'BOSS_TIMEOUT',
  'BOSS_INVALID_OUTPUT',
  'NO_ELIGIBLE_AUTHORITY',
  'ROUND_ROBIN_ERROR',
  'TASK_CREATION_FAILED',
  'ASSIGNMENT_DB_ERROR',
] as const;

export type AssignmentErrorCode = (typeof ASSIGNMENT_ERROR_CODES)[number];

export interface AssignmentSuccess {
  success: true;
  assignmentId: string;
  issueId: string;
  authorityId: string;
  taskStatus: AssignmentTaskStatus;
  assignmentGroup: string;
}

export interface AssignmentFailure {
  success: false;
  error: AssignmentErrorCode;
  issueId: string;
}

export type AssignmentResult = AssignmentSuccess | AssignmentFailure;

export interface CreateAuthorityTaskData {
  issueId: string;
  authorityApplicationId: string;
  assignmentGroup: string;
  requiredSkill: AuthoritySkill;
  requiredJurisdiction: string | null;
  estimatedDurationMinutes: number;
  complexity: BossComplexity;
}
