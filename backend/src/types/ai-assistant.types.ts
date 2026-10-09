import type { UserRole } from './auth.types.js';

/**
 * Domain types for the dashboard AI assistant (`POST /api/ai/chat`).
 *
 * The assistant is a *read-only advisor*: it never mutates an issue, a task or
 * an assignment. It receives a bounded, role-scoped summary of the civic data
 * the caller is already allowed to read and answers questions about it, like a
 * conversational view over the existing dashboards.
 *
 * The role the model is told about is always taken from the authenticated JWT
 * (`req.user.role`) and never from the request body, so a CITIZEN cannot talk
 * the assistant into admin data.
 */

/** What the caller appears to be asking about. Decided by the model, echoed back. */
export const AI_CHAT_INTENTS = [
  'THREE_DAY_FORECAST',
  'ISSUE_OVERVIEW',
  'STATUS_EXPLANATION',
  'GENERAL_HELP',
] as const;

export type AiChatIntent = (typeof AI_CHAT_INTENTS)[number];

/**
 * How much to trust a forecast day.
 *
 * `UNAVAILABLE` is the honest default when no weather source could be reached -
 * the assistant must say so rather than invent numbers.
 */
export const AI_FORECAST_CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW', 'UNAVAILABLE'] as const;

export type AiForecastConfidence = (typeof AI_FORECAST_CONFIDENCES)[number];

/** Real weather observations for one forecast day, taken verbatim from the provider. */
export interface AiForecastWeather {
  condition: string | null;
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  precipitationChance: number | null;
  windMaxKph: number | null;
}

/**
 * One day of the assistant's civic forecast.
 *
 * `weather` is populated by the backend from the provider, never by the model:
 * the model only adds the risk reading (`summary`, `risks`, `precautions`) on
 * top of the numbers it was given. `dataQuality` is a short human note about
 * where the numbers came from.
 */
export interface AiForecastDay {
  date: string;
  summary: string;
  weather: AiForecastWeather | null;
  risks: string[];
  precautions: string[];
  confidence: AiForecastConfidence;
  dataQuality: string;
}

/** The place a forecast was produced for. */
export interface AiChatLocation {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

/** The exact payload returned inside the `data` envelope of the endpoint. */
export interface AiChatResult {
  message: string;
  intent: AiChatIntent;
  role: UserRole;
  forecast: AiForecastDay[];
  dataSources: string[];
  limitations: string[];
  location: AiChatLocation | null;
}

/** One prior conversation turn sent back to the model for context. */
export interface AiChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Normalised assistant input, produced from the validated request body. */
export interface AiChatInput {
  message: string;
  location?: { city: string; area?: string };
  history: AiChatHistoryTurn[];
}

/** A single civic record summarised into the model's context. */
export interface AiChatContextRecord {
  kind: 'issue' | 'task';
  title: string;
  status: string;
  category: string;
  location: string;
  /** Creation date (YYYY-MM-DD) of the record - never a schedule. */
  createdOn: string;
  /** Server-computed relative label ("today", "yesterday", "3 days ago"). */
  createdLabel: string;
}

/**
 * The role-scoped data block the service builds before calling the model.
 *
 * `limitations` records what could NOT be gathered (e.g. an authority whose
 * application is not verified yet) so the assistant can be upfront instead of
 * guessing.
 */
export interface AiRoleContext {
  role: UserRole;
  summary: string;
  records: AiChatContextRecord[];
  counts: Record<string, number>;
  sources: string[];
  limitations: string[];
}
