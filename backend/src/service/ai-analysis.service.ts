import type { Issue } from '../models/issue.model.js';
import type { IssueComplexity, SkillRequired } from '../types/issue.types.js';
import type { IssueAnalysisInput } from '../dao/issue.dao.js';

/**
 * Rule-based AI analysis for a VERIFIED issue.
 *
 * This is deliberately NOT an external model call: it derives the three
 * briefing fields the flow diagram asks for (skill required, complexity,
 * effort estimate) from the report itself with transparent rules, so the
 * workflow runs offline and every recommendation is explainable:
 *
 *  - Skill required: base mapping from `issueType`, overridden by keywords
 *    in the description (e.g. "electric" / "wire" needs ELECTRICAL even on a
 *    drainage report, "garbage" / "waste" needs SANITATION).
 *  - Complexity: description length plus urgency keywords (hospital, school,
 *    burst, collapse, main road, …) plus photo evidence. LOW / MEDIUM / HIGH.
 *  - Effort estimate: base hours per issue type scaled by complexity, in
 *    0.5-hour steps.
 *
 * A future ML model can replace `analyse` without touching callers: the
 * return shape (`IssueAnalysisInput`) is what the DAO persists.
 */

const BASE_SKILL: Record<Issue['issueType'], SkillRequired> = {
  WATER_LEAKAGE: 'PLUMBING',
  WATER_SHORTAGE: 'PLUMBING',
  EXTREME_HEAT: 'HEAT_RESPONSE',
  FLOODING: 'FLOOD_RESPONSE',
  DRAINAGE: 'DRAINAGE_CREW',
  OTHER: 'GENERAL',
};

/** Keyword overrides checked against the lower-cased description, first match wins. */
const SKILL_KEYWORDS: { test: RegExp; skill: SkillRequired }[] = [
  { test: /electr|wire|transformer|short[\s-]?circuit|power/i, skill: 'ELECTRICAL' },
  { test: /garbage|waste|sanitation|sewage smell|dumping/i, skill: 'SANITATION' },
  { test: /burst|pipeline|leak|pump|tap|water/i, skill: 'PLUMBING' },
  { test: /flood|waterlog|stagnant|rain|drain overflow/i, skill: 'FLOOD_RESPONSE' },
  { test: /heat|cooling|shade|drinking water|heatwave/i, skill: 'HEAT_RESPONSE' },
  { test: /drain|clog|manhole|sewer|silt/i, skill: 'DRAINAGE_CREW' },
];

const URGENCY_KEYWORDS =
  /hospital|school|burst|collapse|main road|highway|fire|electr|trapped|elderly|children|drinking/i;

/** Base field hours per issue type before the complexity multiplier. */
const BASE_EFFORT_HOURS: Record<Issue['issueType'], number> = {
  WATER_LEAKAGE: 4,
  WATER_SHORTAGE: 6,
  EXTREME_HEAT: 8,
  FLOODING: 12,
  DRAINAGE: 6,
  OTHER: 3,
};

const COMPLEXITY_MULTIPLIER: Record<IssueComplexity, number> = {
  LOW: 0.75,
  MEDIUM: 1,
  HIGH: 1.75,
};

export interface AnalysisExplanation {
  skillRequired: SkillRequired;
  skillReason: string;
  complexity: IssueComplexity;
  complexityReason: string;
  effortHours: number;
  effortReason: string;
}

const roundToHalfHour = (hours: number): number => Math.min(500, Math.max(0.5, Math.round(hours * 2) / 2));

export const analyseIssue = (issue: Pick<Issue, 'issueType' | 'description' | 'imageUrl'>): IssueAnalysisInput & {
  explanation: AnalysisExplanation;
} => {
  const description = issue.description.trim();

  // -- Skill ---------------------------------------------------------------
  const keywordHit = SKILL_KEYWORDS.find(({ test }) => test.test(description));
  const skillRequired = keywordHit?.skill ?? BASE_SKILL[issue.issueType];
  const skillReason = keywordHit
    ? `Description mentions "${description.match(keywordHit.test)?.[0] ?? 'matching keywords'}" → ${skillRequired} crew.`
    : `Default crew for ${issue.issueType} reports → ${skillRequired}.`;

  // -- Complexity -----------------------------------------------------------
  const urgent = URGENCY_KEYWORDS.test(description);
  const long = description.length >= 400;
  const medium = description.length >= 150;
  const hasPhoto = issue.imageUrl !== null;
  const complexity: IssueComplexity = urgent || (long && hasPhoto) ? 'HIGH' : medium || hasPhoto ? 'MEDIUM' : 'LOW';
  const complexityReason = urgent
    ? 'Urgency keywords found (hospital / burst / collapse / main road …) → HIGH.'
    : long
      ? `Detailed report (${description.length} chars)${hasPhoto ? ' with photo evidence' : ''} → ${complexity}.`
      : hasPhoto
        ? 'Photo evidence attached → MEDIUM.'
        : 'Short report without photo evidence → LOW.';

  // -- Effort ----------------------------------------------------------------
  const base = BASE_EFFORT_HOURS[issue.issueType];
  const effortHours = roundToHalfHour(base * COMPLEXITY_MULTIPLIER[complexity] + (hasPhoto ? 0.5 : 0));
  const effortReason = `Base ${base}h for ${issue.issueType} × ${COMPLEXITY_MULTIPLIER[complexity]} (${complexity})${hasPhoto ? ' + 0.5h photo verification' : ''} → ${effortHours}h.`;

  return {
    skillRequired,
    complexity,
    effortHours,
    explanation: {
      skillRequired,
      skillReason,
      complexity,
      complexityReason,
      effortHours,
      effortReason,
    },
  };
};
