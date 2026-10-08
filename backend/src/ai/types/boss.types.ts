import { z } from 'zod';
import { AUTHORITY_SKILLS } from '../../types/authority.types.js';

/**
 * Boss AI structured output contract.
 *
 * Boss only determines what the verified issue requires. It does NOT select
 * which authority to assign. That is a later deterministic step.
 *
 * The requirement must match the existing authority skill vocabulary exactly,
 * so that a future eligibility filter can compare against VERIFIED authorities.
 */
export const BOSS_COMPLEXITY = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type BossComplexity = (typeof BOSS_COMPLEXITY)[number];

export const BOSS_REASON_MAX_LENGTH = 500;

export const bossDecisionSchema = z.object({
  requiredSkill: z.enum(AUTHORITY_SKILLS, {
    error: `requiredSkill must be one of: ${AUTHORITY_SKILLS.join(', ')}`,
  }),
  requiredJurisdiction: z
    .string()
    .trim()
    .min(1, 'requiredJurisdiction cannot be blank when provided')
    .max(200, 'requiredJurisdiction is too long')
    .nullable(),
  estimatedDurationMinutes: z
    .number({ error: 'estimatedDurationMinutes must be a number' })
    .int('estimatedDurationMinutes must be an integer')
    // NOTE: `.positive()` compiles to `exclusiveMinimum: 0`, which the Gemini
    // response_schema rejects with a 400 ("Unknown name exclusiveMinimum").
    // `.min(1)` produces the supported `minimum` keyword and is equivalent for
    // integers (> 0 and >= 1 are the same set).
    .min(1, 'estimatedDurationMinutes must be a reasonable positive number')
    .max(8 * 60 * 60, 'estimatedDurationMinutes must be a reasonable positive number'),
  complexity: z.enum(BOSS_COMPLEXITY, {
    error: `complexity must be one of: ${BOSS_COMPLEXITY.join(', ')}`,
  }),
  reason: z
    .string({ error: 'reason is required' })
    .min(1, 'reason must not be empty')
    .max(BOSS_REASON_MAX_LENGTH, `reason must be at most ${BOSS_REASON_MAX_LENGTH} characters`),
});

export type BossDecision = z.infer<typeof bossDecisionSchema>;

export const BOSS_ERROR_CODES = [
  'BOSS_UNAVAILABLE',
  'BOSS_RATE_LIMITED',
  'BOSS_TIMEOUT',
  'BOSS_INVALID_OUTPUT',
  'BOSS_REQUIRES_VERIFIED_ISSUE',
  'ISSUE_NOT_FOUND',
] as const;

export type BossErrorCode = (typeof BOSS_ERROR_CODES)[number];

export class BossInvalidOutputError extends Error {
  constructor(message = 'Boss model output failed validation') {
    super(message);
    this.name = 'BossInvalidOutputError';
  }
}
