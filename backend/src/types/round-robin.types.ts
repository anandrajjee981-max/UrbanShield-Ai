import type { EligibleAuthority } from './authority-eligibility.types.js';

export const ROUND_ROBIN_ERROR_CODES = [
  'NO_ELIGIBLE_AUTHORITY',
  'ROUND_ROBIN_INVALID_INPUT',
  'ROUND_ROBIN_DB_ERROR',
  'ROUND_ROBIN_CONCURRENCY_ERROR',
] as const;

export type RoundRobinErrorCode = (typeof ROUND_ROBIN_ERROR_CODES)[number];

export interface RoundRobinInput {
  /** Stable group key, e.g. "ROAD_MAINTENANCE|WARD_12". Supplied by the caller. */
  assignmentGroup: string;
  /** Already-filtered eligible authorities (Prompt 4 output). */
  eligibleAuthorities: readonly EligibleAuthority[];
}

export interface RoundRobinSuccess {
  success: true;
  selectedAuthority: EligibleAuthority;
  assignmentGroup: string;
  /** The pointer before this selection; null on first-ever selection. */
  previousAuthorityId: string | null;
}

export interface RoundRobinFailure {
  success: false;
  error: RoundRobinErrorCode;
  assignmentGroup: string;
}

export type RoundRobinResult = RoundRobinSuccess | RoundRobinFailure;
