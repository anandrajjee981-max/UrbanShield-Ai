import { z } from 'zod';
import { ISSUE_TYPES, LOCATION_TYPES } from '../../types/issue.types.js';
import { WATCHER_DECISIONS } from '../types/watcher.types.js';

/**
 * State of the Watcher workflow. Deliberately small: START -> WATCHER -> END
 * reads it once and the node fills in `decision`, `confidence` and `reason`.
 *
 * The workflow is isolated from the rest of the backend, so this schema also
 * acts as the security boundary of what the LLM may see:
 *
 *   issue type, the citizen's own description, the location, the photo URL.
 *
 * What is deliberately absent: `userId`, name, email, tokens, cookies and any
 * other account data. Judging whether a pothole is a real civic problem never
 * requires knowing who filed the report, so none of it is ever built into
 * state and therefore never reaches the provider.
 *
 * Later prompts will add BOSS / ASSIGNMENT nodes on top of this state; nothing
 * here needs to change for that.
 */
export const watcherStateSchema = z.object({
  issueId: z.string(),
  issueType: z.enum(ISSUE_TYPES),
  description: z.string(),
  locationType: z.enum(LOCATION_TYPES),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  address: z.string().nullable(),
  imageUrl: z.string().nullable(),
  /** Filled in by the Watcher node. Null until it has run. */
  decision: z.enum(WATCHER_DECISIONS).nullable(),
  confidence: z.number().nullable(),
  reason: z.string().nullable(),
});

export type WatcherState = z.infer<typeof watcherStateSchema>;

/** The part of the state the service builds from an issue; the rest is output. */
export type WatcherStateInput = Omit<WatcherState, 'decision' | 'confidence' | 'reason'>;
