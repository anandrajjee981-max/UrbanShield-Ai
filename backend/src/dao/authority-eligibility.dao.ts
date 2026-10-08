import { query } from '../config/db.js';
import type { EligibleAuthority } from '../types/authority-eligibility.types.js';
import type { AuthoritySkill, AuthorityJurisdictionType } from '../types/authority.types.js';

/**
 * Reads VERIFIED authority applications that have the required skill.
 * Joins `authority_application_skills` for deterministic skill matching (no fuzzy AI).
 */
export const findVerifiedAuthoritiesWithSkill = async (
  requiredSkill: AuthoritySkill,
): Promise<EligibleAuthority[]> => {
  const { rows } = await query<{
    authority_id: string;
    user_id: string;
    jurisdiction_type: AuthorityJurisdictionType;
    jurisdiction_name: string;
    availability: string;
    status: string;
  }>(
    `SELECT
       a.id AS authority_id,
       a.user_id,
       a.jurisdiction_type,
       a.jurisdiction_name,
       a.availability,
       a.verification_status AS status
     FROM authority_applications a
     INNER JOIN authority_application_skills s ON s.application_id = a.id
     WHERE a.verification_status = 'VERIFIED'
       AND s.skill = $1::authority_skill
     ORDER BY a.id`,
    [requiredSkill],
  );

  // Fetch skills for all matched authorities in one query (avoids N+1).
  const ids = rows.map((r) => r.authority_id);
  const skillsMap = new Map<string, AuthoritySkill[]>();

  if (ids.length > 0) {
    const { rows: skillRows } = await query<{ application_id: string; skill: AuthoritySkill }>(
      `SELECT application_id, skill
       FROM authority_application_skills
       WHERE application_id = ANY($1::uuid[])
       ORDER BY skill`,
      [ids],
    );

    for (const row of skillRows) {
      const existing = skillsMap.get(row.application_id);
      if (existing) existing.push(row.skill);
      else skillsMap.set(row.application_id, [row.skill]);
    }
  }

  return rows.map((r) => ({
    authorityId: r.authority_id,
    userId: r.user_id,
    skills: skillsMap.get(r.authority_id) ?? [],
    jurisdictionType: r.jurisdiction_type,
    jurisdictionName: r.jurisdiction_name,
    availability: r.availability,
    status: r.status,
  }));
};
