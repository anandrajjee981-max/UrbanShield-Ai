import { NodeTimeoutError } from '@langchain/langgraph';
import { env } from '../../config/env.js';
import * as issueDao from '../../dao/issue.dao.js';
import type { Issue } from '../../models/issue.model.js';
import { logger } from '../../utils/logger.js';
import { bossGraph } from '../graph/boss.graph.js';
import type { BossState } from '../graph/boss.state.js';
import { BossInvalidOutputError, bossDecisionSchema } from '../types/boss.types.js';
import type { BossDecision, BossErrorCode } from '../types/boss.types.js';

const REDACT_KEY = env.OPENROUTER_API_KEY;

const redact = (error: unknown): string => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (!REDACT_KEY) return message;
  return message.split(REDACT_KEY).join('[redacted]');
};

const isTimeoutError = (error: unknown, depth = 0): boolean => {
  if (depth > 5 || !(error instanceof Error)) return false;
  if (error instanceof NodeTimeoutError || error.name === 'NodeTimeoutError') return true;
  return isTimeoutError(error.cause, depth + 1);
};

/**
 * OpenRouter reports an exhausted rate limit as a 429 with "quota"/"limit"
 * in the message, but that text sits on the error LangChain wraps - walk the
 * cause chain so a rate limit is reported as its own code instead of a
 * generic provider failure (the admin work item then reads
 * AI_SERVICE_RATE_LIMITED).
 */
const isRateLimitError = (error: unknown, depth = 0): boolean => {
  if (depth > 5 || !(error instanceof Error)) return false;
  const message = error.message.toUpperCase();
  if (
    error.message.includes('429') ||
    message.includes('QUOTA') ||
    message.includes('RATE LIMIT') ||
    message.includes('EXCEEDED YOUR CURRENT QUOTA')
  ) {
    return true;
  }
  return isRateLimitError(error.cause, depth + 1);
};

const classify = (error: unknown): BossErrorCode => {
  if (error instanceof BossInvalidOutputError) return 'BOSS_INVALID_OUTPUT';
  if (isTimeoutError(error)) return 'BOSS_TIMEOUT';
  if (isRateLimitError(error)) return 'BOSS_RATE_LIMITED';
  return 'BOSS_UNAVAILABLE';
};

export interface BossRunResult {
  success: boolean;
  issueId: string;
  error?: BossErrorCode;
  decision?: BossDecision;
}

const toState = (issue: Issue): BossState => ({
  issueId: issue.id,
  issueType: issue.issueType,
  description: issue.description,
  locationType: issue.locationType,
  latitude: issue.latitude,
  longitude: issue.longitude,
  address: issue.address,
  imageUrl: issue.imageUrl,
  requiredSkill: null,
  requiredJurisdiction: null,
  estimatedDurationMinutes: null,
  complexity: null,
  reason: null,
});

/**
 * Run Boss for a VERIFIED issue. Boss does not change issue status; it only
 * produces a structured work profile. Does NOT call the DB to mutate anything.
 */
export const runBoss = async (issueId: string): Promise<BossRunResult> => {
  try {
    if (!env.OPENROUTER_API_KEY) {
      logger.warn('Boss unavailable: no AI API key configured', { issueId });
      return { success: false, issueId, error: 'BOSS_UNAVAILABLE' };
    }

    logger.info('Boss started', { issueId });
    const issue = await issueDao.findIssueById(issueId);
    if (!issue) {
      return { success: false, issueId, error: 'ISSUE_NOT_FOUND' };
    }
    if (issue.status !== 'VERIFIED') {
      logger.info('Boss skipped: issue not VERIFIED', { issueId, status: issue.status });
      return { success: false, issueId, error: 'BOSS_REQUIRES_VERIFIED_ISSUE' };
    }

    let final: BossState;
    try {
      final = await bossGraph.invoke(toState(issue));
    } catch (error) {
      const code = classify(error);
      logger.error('Boss AI run failed', { issueId, error: code, detail: redact(error) });
      return { success: false, issueId, error: code };
    }

    const out = bossDecisionSchema.safeParse(final);
    if (!out.success) {
      logger.error('Boss graph produced invalid state', { issueId });
      return { success: false, issueId, error: 'BOSS_INVALID_OUTPUT' };
    }

    const decision = out.data;
    logger.info('Boss decided', {
      issueId,
      requiredSkill: decision.requiredSkill,
      complexity: decision.complexity,
      estimatedDurationMinutes: decision.estimatedDurationMinutes,
      hasJurisdiction: decision.requiredJurisdiction !== null,
    });
    return { success: true, issueId, decision };
  } catch (error) {
    logger.error('Boss execution failed', { issueId, detail: redact(error) });
    return { success: false, issueId, error: 'BOSS_UNAVAILABLE' };
  }
};

export const triggerBoss = (issueId: string): void => {
  void runBoss(issueId)
    .then((res) => {
      if (!res.success) {
        logger.warn('Boss produced no decision', { issueId, error: res.error });
      }
    })
    .catch((error: unknown) => {
      logger.error('Boss trigger failed', { issueId, detail: redact(error) });
    });
};
