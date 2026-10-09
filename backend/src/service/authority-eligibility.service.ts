import { logger } from '../utils/logger.js';
import * as eligibilityDao from '../dao/authority-eligibility.dao.js';
import type { EligibleAuthority, AuthorityEligibilityInput } from '../types/authority-eligibility.types.js';

const jurisdictionMatches = (
  requiredJurisdiction: string | null,
  authority: EligibleAuthority,
): boolean => {
  if (requiredJurisdiction === null) return true;
  if (authority.jurisdictionName === null) return false;
  return authority.jurisdictionName.trim().toLowerCase() === requiredJurisdiction.trim().toLowerCase();
};

const isAvailable = (authority: EligibleAuthority): boolean => {
  if (authority.availability === null) return true;
  if (authority.availability === 'UNAVAILABLE') return false;
  return true;
};

/**
 * Deterministic eligibility: returns list of authorities eligible for Boss result.
 * Does NOT select/assign; does NOT call AI.
 */
export const getEligibleAuthorities = async (
  input: AuthorityEligibilityInput,
): Promise<EligibleAuthority[]> => {
  const { requiredSkill, requiredJurisdiction } = input;
  const candidates = await eligibilityDao.findVerifiedAuthoritiesWithSkill(requiredSkill);

  const eligible: EligibleAuthority[] = [];
  for (const candidate of candidates) {
    if (!jurisdictionMatches(requiredJurisdiction, candidate)) continue;
    if (!isAvailable(candidate)) continue;
    eligible.push(candidate);
  }

  logger.debug('Authority eligibility computed', {
    requiredSkill,
    requiredJurisdiction,
    candidates: candidates.length,
    eligible: eligible.length,
  });

  return eligible;
};
