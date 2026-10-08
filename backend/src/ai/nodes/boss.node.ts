import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { env, OPENROUTER_BASE_URL } from '../../config/env.js';
import { AUTHORITY_SKILLS } from '../../types/authority.types.js';
import type { BossState } from '../graph/boss.state.js';
import { BOSS_REASON_MAX_LENGTH, bossDecisionSchema, BossInvalidOutputError } from '../types/boss.types.js';
import type { BossDecision } from '../types/boss.types.js';

export const BOSS_NODE_NAME = 'boss';

const ALLOWED_SKILLS_LIST = AUTHORITY_SKILLS.join(', ');

const BOSS_SYSTEM_PROMPT = `You are Boss, the AI layer that profiles a VERIFIED civic issue to determine what work is required.

You do NOT assign authorities. You do NOT query a database. You return a strict structured result.

Constraints:
- Choose exactly ONE primary requiredSkill from this controlled vocabulary: ${ALLOWED_SKILLS_LIST}
- If multiple skills seem relevant, pick the single most appropriate primary skill (the one that would do the main fix). Do not invent new skill names.
- requiredJurisdiction: return the most plausible jurisdiction level/area hinted by the issue, or null if there is not enough concrete information (no ward/zone/district/city name). Do NOT hallucinate a specific ward number unless it is explicitly stated in the description or address.
- estimatedDurationMinutes: realistic integer estimate > 0 and sensible (e.g., 15 up to ~480 for typical civic work). Do not return 0 or extremely large values.
- complexity: LOW / MEDIUM / HIGH based on the nature and likely effort.
- reason: short factual explanation, at most ${BOSS_REASON_MAX_LENGTH} characters. Do not explain assignment logic.

Output format: the schema provided. Nothing else.`;

const buildReport = (state: BossState): string =>
  JSON.stringify(
    {
      issueId: state.issueId,
      issueType: state.issueType,
      description: state.description,
      location: {
        locationType: state.locationType,
        latitude: state.latitude,
        longitude: state.longitude,
        address: state.address,
      },
      imageUrl: state.imageUrl,
    },
    null,
    2,
  );

export type BossNodeOutput = BossDecision;

export const bossNode = async (state: BossState): Promise<BossNodeOutput> => {
  const model = new ChatOpenAI({
    model: env.OPENROUTER_MODEL,
    apiKey: env.OPENROUTER_API_KEY,
    temperature: 0,
    // OpenRouter mirrors OpenAI's error codes: transient upstream 5xx/429s
    // are retried by the SDK with exponential backoff so a spike does not
    // surface as BOSS_UNAVAILABLE, while the graph's run timeout still caps
    // the total wait.
    maxRetries: 4,
    configuration: { baseURL: OPENROUTER_BASE_URL },
  });

  const structuredModel = model.withStructuredOutput(bossDecisionSchema);
  const raw = await structuredModel.invoke([new SystemMessage(BOSS_SYSTEM_PROMPT), new HumanMessage(buildReport(state))]);

  const parsed = bossDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BossInvalidOutputError();
  }

  const reason = parsed.data.reason.trim();
  if (reason.length === 0) {
    throw new BossInvalidOutputError('Boss reason was blank after trimming');
  }

  return {
    requiredSkill: parsed.data.requiredSkill,
    requiredJurisdiction: parsed.data.requiredJurisdiction?.trim() ?? null,
    estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
    complexity: parsed.data.complexity,
    reason,
  };
};
