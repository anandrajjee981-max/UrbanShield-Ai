import type { AuthoritySkill, AuthorityJurisdictionType } from './authority.types.js';

export interface EligibleAuthority {
  authorityId: string;
  userId: string;
  skills: AuthoritySkill[];
  jurisdictionType: AuthorityJurisdictionType | null;
  jurisdictionName: string | null;
  availability: string | null;
  status: string | null;
}

export interface AuthorityEligibilityInput {
  requiredSkill: AuthoritySkill;
  requiredJurisdiction: string | null;
  estimatedDurationMinutes: number;
}
