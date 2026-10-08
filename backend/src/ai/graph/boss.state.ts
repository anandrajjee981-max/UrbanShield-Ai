import { z } from 'zod';
import { AUTHORITY_SKILLS } from '../../types/authority.types.js';
import { BOSS_COMPLEXITY } from '../types/boss.types.js';
import { ISSUE_TYPES, LOCATION_TYPES } from '../../types/issue.types.js';

/**
 * Boss state: only verified issue content + final AI output.
 * No user identity, no authority lists, no DB IDs of authorities.
 */
export const bossStateSchema = z.object({
  issueId: z.string(),
  issueType: z.enum(ISSUE_TYPES),
  description: z.string(),
  locationType: z.enum(LOCATION_TYPES),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  address: z.string().nullable(),
  imageUrl: z.string().nullable(),
  requiredSkill: z.enum(AUTHORITY_SKILLS).nullable(),
  requiredJurisdiction: z.string().nullable(),
  estimatedDurationMinutes: z.number().nullable(),
  complexity: z.enum(BOSS_COMPLEXITY).nullable(),
  reason: z.string().nullable(),
});

export type BossState = z.infer<typeof bossStateSchema>;
export type BossStateInput = Omit<BossState, 'requiredSkill' | 'requiredJurisdiction' | 'estimatedDurationMinutes' | 'complexity' | 'reason'>;
