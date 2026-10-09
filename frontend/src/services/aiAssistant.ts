import { api, type ApiSuccess } from './api';

/**
 * Real backend client for the dashboard AI assistant (GlobalAISearch).
 *
 * Backend contract: `POST /api/ai/chat` (cookie auth, `{ success, message, data }`
 * envelope). The backend takes the caller's role from the JWT and scopes the
 * answer to the data that role may already read. This layer only transports the
 * question and the returned answer; it holds no key and makes no authorization
 * decisions.
 */

export type AiChatRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN';

export type AiChatIntent =
  | 'THREE_DAY_FORECAST'
  | 'ISSUE_OVERVIEW'
  | 'STATUS_EXPLANATION'
  | 'GENERAL_HELP';

export type AiForecastConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';

export interface AiForecastWeather {
  condition: string | null;
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  precipitationChance: number | null;
  windMaxKph: number | null;
}

export interface AiForecastDay {
  date: string;
  summary: string;
  weather: AiForecastWeather | null;
  risks: string[];
  precautions: string[];
  confidence: AiForecastConfidence;
  dataQuality: string;
}

export interface AiChatLocation {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

export interface AiChatData {
  message: string;
  intent: AiChatIntent;
  role: AiChatRole;
  forecast: AiForecastDay[];
  dataSources: string[];
  limitations: string[];
  location: AiChatLocation | null;
}

export interface AiChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  message: string;
  location?: { city: string; area?: string };
  history?: AiChatHistoryTurn[];
}

/** Sends one question and resolves with the assistant's structured answer. */
export async function sendAiChat(input: AiChatRequest): Promise<AiChatData> {
  const res = await api.post<ApiSuccess<AiChatData>>('/ai/chat', input);
  return res.data.data;
}
