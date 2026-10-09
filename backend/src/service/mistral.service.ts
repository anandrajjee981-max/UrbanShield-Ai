import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Minimal Mistral chat-completions client.
 *
 * The backend already speaks the OpenAI-compatible chat API through OpenRouter
 * for the Watcher/Boss nodes, so the assistant reuses the same shape rather than
 * pulling in a vendor SDK: one `POST /chat/completions` with
 * `response_format: { type: 'json_object' }`.
 *
 * Hard rules kept here so no caller can forget them:
 *  - the API key is read from the server environment and never returned/logged;
 *  - a single call is bounded by `AI_CHAT_TIMEOUT_MS`;
 *  - provider failures are classified into a small enum the service maps to HTTP.
 */

export type MistralErrorCode =
  | 'MISTRAL_NOT_CONFIGURED'
  | 'MISTRAL_UNAVAILABLE'
  | 'MISTRAL_RATE_LIMITED'
  | 'MISTRAL_TIMEOUT'
  | 'MISTRAL_INVALID_RESPONSE';

export class MistralError extends Error {
  readonly code: MistralErrorCode;
  readonly status?: number;

  constructor(code: MistralErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'MistralError';
    this.code = code;
    this.status = status;
  }
}

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** True when the assistant has a key to call the provider with. */
export const isMistralConfigured = (): boolean => Boolean(env.MISTRAL_API_KEY);

interface MistralChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

/**
 * Runs one JSON-mode completion and returns the raw content string.
 *
 * Throws `MistralError` for every expected failure (not configured, rate
 * limited, timeout, provider error, empty/unparseable payload) so the service
 * layer can translate it into a friendly HTTP response.
 */
export const completeJson = async (messages: MistralMessage[]): Promise<string> => {
  const apiKey = env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new MistralError('MISTRAL_NOT_CONFIGURED', 'The AI assistant is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_CHAT_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.MISTRAL_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: env.MISTRAL_MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Only the status is logged - never the body, which can echo the prompt.
      logger.warn('Mistral request failed', { status: response.status, model: env.MISTRAL_MODEL });

      if (response.status === 429) {
        throw new MistralError('MISTRAL_RATE_LIMITED', 'The AI assistant is busy right now', response.status);
      }
      if (response.status === 401 || response.status === 403 || response.status === 402) {
        throw new MistralError('MISTRAL_UNAVAILABLE', 'The AI assistant is not available', response.status);
      }

      throw new MistralError(
        'MISTRAL_UNAVAILABLE',
        `The AI assistant provider returned HTTP ${response.status}`,
        response.status,
      );
    }

    const body = (await response.json()) as MistralChatResponse;
    const content = body.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim() === '') {
      throw new MistralError('MISTRAL_INVALID_RESPONSE', 'The AI assistant returned an empty response');
    }

    return content;
  } catch (error) {
    if (error instanceof MistralError) throw error;

    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      throw new MistralError('MISTRAL_TIMEOUT', 'The AI assistant timed out');
    }

    throw new MistralError('MISTRAL_UNAVAILABLE', 'The AI assistant could not be reached');
  } finally {
    clearTimeout(timeout);
  }
};
