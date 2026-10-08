import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { env, OPENROUTER_BASE_URL } from '../../config/env.js';
import type { WatcherState } from '../graph/watcher.state.js';
import {
  WATCHER_REASON_MAX_LENGTH,
  WatcherInvalidOutputError,
  watcherDecisionSchema,
} from '../types/watcher.types.js';
import type { WatcherDecision } from '../types/watcher.types.js';

/**
 * The Watcher node: the single step of the first AI layer.
 *
 * It receives the civic content of one issue and returns a structured answer -
 * `{ decision, confidence, reason }` - validated against `watcherDecisionSchema`
 * through the model's structured output. It does not call the database, does
 * not know about authorities, workload, roles or assignment, and does not
 * decide anything beyond ACCEPT / REJECT.
 */

export const WATCHER_NODE_NAME = 'watcher';

/**
 * Instructions for the model.
 *
 * The important decisions encoded here:
 *  - short or badly written is fine, only the meaning is judged, so
 *    "Street light not working." is a perfectly valid submission
 *  - reject only clearly non civic content (spam, abuse, gibberish, ads)
 *  - when unsure, accept: a false rejection hides a real problem, a false
 *    accept is still reviewed by a human authority later
 *  - triage only: no assignment, no prioritisation, no effort estimation
 */
const WATCHER_SYSTEM_PROMPT = `You are Watcher, the first triage step of UrbanShield AI, a civic issue reporting platform for a city.

You receive one issue reported by a citizen and you must decide whether it is a plausible, genuine civic issue.

What counts as a civic issue:
- roads and infrastructure damage (potholes, broken footpaths, damaged signage)
- street lights and public lighting
- water supply, leaks and water quality
- drainage, overflowing sewers, flooding after rain
- garbage and sanitation, uncollected waste
- extreme heat and other public weather hazards
- any other municipal problem affecting residents

How to judge:
- Judge the meaning of the submission, never the writing quality. Short descriptions are normal and perfectly acceptable: "Street light not working." or "Garbage has not been collected for 3 days." are valid submissions. Do not reject something just because the description is brief or informal.
- ACCEPT if the submission describes a plausible civic problem, even a vague one.
- REJECT only clearly non civic content: spam, advertising, jokes, gibberish, text aimed at abusing a person, or something that is not a civic issue at all.
- When you are unsure, prefer ACCEPT. A wrongly rejected issue disappears from the city's view, while a wrongly accepted one is still reviewed by a human authority later.
- A photo reference may be a URL you cannot open. Judge from the text and location anyway; a missing photo is never a reason to reject.

This is triage only. Do not assign, prioritise, estimate effort, contact anyone or take any action. You only record the decision.

Answer with the provided structured output:
- decision: "ACCEPT" or "REJECT" exactly
- confidence: a number between 0 and 1
- reason: one short factual sentence, at most ${WATCHER_REASON_MAX_LENGTH} characters`;

/** What the model is shown about the issue - civic content only, no user data. */
const buildIssueReport = (state: WatcherState): string =>
  JSON.stringify(
    {
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

export type WatcherNodeOutput = {
  decision: WatcherDecision;
  confidence: number;
  reason: string;
};

/**
 * Runs one Watcher analysis.
 *
 * Errors are not swallowed here: a provider failure propagates so the service
 * can turn it into `WATCHER_UNAVAILABLE`, and output that fails the schema
 * becomes `WatcherInvalidOutputError` -> `WATCHER_INVALID_OUTPUT`. No decision
 * is ever invented when validation fails.
 */
export const watcherNode = async (state: WatcherState): Promise<WatcherNodeOutput> => {
  const model = new ChatOpenAI({
    model: env.OPENROUTER_MODEL,
    apiKey: env.OPENROUTER_API_KEY,
    temperature: 0,
    // OpenRouter mirrors OpenAI's error codes: transient upstream 5xx/429s are
    // retried by the SDK with exponential backoff, so a provider spike does not
    // surface as WATCHER_UNAVAILABLE, while the graph's run timeout still caps
    // the total wait.
    maxRetries: 4,
    configuration: { baseURL: OPENROUTER_BASE_URL },
  });

  const structuredModel = model.withStructuredOutput(watcherDecisionSchema, {
    name: 'record_watcher_decision',
  });

  const raw = await structuredModel.invoke([
    new SystemMessage(WATCHER_SYSTEM_PROMPT),
    new HumanMessage(buildIssueReport(state)),
  ]);

  const parsed = watcherDecisionSchema.safeParse(raw);

  if (!parsed.success) {
    throw new WatcherInvalidOutputError();
  }

  const reason = parsed.data.reason.trim();

  if (reason.length === 0) {
    throw new WatcherInvalidOutputError('Watcher reason was blank after trimming');
  }

  return {
    decision: parsed.data.decision,
    confidence: parsed.data.confidence,
    reason,
  };
};
