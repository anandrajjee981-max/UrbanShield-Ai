import { z } from 'zod';
import { env } from '../config/env.js';
import { AI_CHAT_INTENTS, AI_FORECAST_CONFIDENCES } from '../types/ai-assistant.types.js';

/**
 * Request + model-output schemas for the AI assistant.
 *
 * Two very different contracts live here on purpose:
 *
 *  - `aiChatSchema` validates what the browser sends. It is `.strict()`: an
 *    unknown field is a 400, and nothing about the caller's role, identity or
 *    the civic data is accepted from the client at all.
 *  - `aiModelResponseSchema` validates what the model returns. It is lenient
 *    (`.catch()` / defaults) because a model is not a trusted client - a
 *    slightly malformed answer degrades to a safe one instead of becoming a
 *    500 for the user.
 */

/** One prior conversation turn. Bounded so a client cannot use history to bloat the prompt. */
export const aiChatHistoryTurnSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z
      .string({ error: 'History content must be a string' })
      .trim()
      .min(1, 'History content cannot be blank')
      .max(2000, 'History content is too long'),
  })
  .strict();

/**
 * `POST /api/ai/chat` body.
 *
 * `location` is optional: the assistant asks for a city/area when it needs one
 * for a forecast instead of failing. `history` is optional and capped.
 */
export const aiChatSchema = z
  .object({
    message: z
      .string({ error: 'Message must be a string' })
      .trim()
      .min(1, 'Message cannot be blank')
      .max(
        env.AI_CHAT_MESSAGE_MAX_LENGTH,
        `Message must be at most ${env.AI_CHAT_MESSAGE_MAX_LENGTH} characters`,
      ),
    location: z
      .object({
        city: z
          .string({ error: 'City must be a string' })
          .trim()
          .min(1, 'City cannot be blank')
          .max(120, 'City is too long'),
        area: z
          .string({ error: 'Area must be a string' })
          .trim()
          .min(1, 'Area cannot be blank')
          .max(120, 'Area is too long')
          .optional(),
      })
      .strict()
      .optional(),
    history: z
      .array(aiChatHistoryTurnSchema)
      .max(env.AI_CHAT_HISTORY_MAX_TURNS * 2, 'Too many history turns')
      .optional(),
  })
  .strict();

/**
 * The model's structured answer.
 *
 * `intent`/`confidence` use `.catch()` and the arrays default to empty, so an
 * unexpected enum or a missing list becomes a safe value rather than a failure.
 * `message` is the only field that must be present and non-empty.
 */
export const aiModelResponseSchema = z.object({
  message: z
    .string({ error: 'Model message must be a string' })
    .trim()
    .min(1, 'Model message cannot be blank')
    .max(4000, 'Model message is too long'),
  intent: z.enum(AI_CHAT_INTENTS).catch('GENERAL_HELP'),
  days: z
    .array(
      z.object({
        date: z.string({ error: 'Forecast date must be a string' }).trim().min(1, 'Forecast date cannot be blank').max(20),
        summary: z.string().trim().max(600).default(''),
        risks: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
        precautions: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
        confidence: z.enum(AI_FORECAST_CONFIDENCES).catch('MEDIUM'),
        dataQuality: z.string().trim().max(300).default(''),
      }),
    )
    .max(7)
    .default([]),
  limitations: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
});

export type AiChatRequestBody = z.infer<typeof aiChatSchema>;
export type AiModelResponse = z.infer<typeof aiModelResponseSchema>;
