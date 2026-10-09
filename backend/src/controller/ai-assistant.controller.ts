import type { Request, Response } from 'express';
import * as aiAssistantService from '../service/ai-assistant.service.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import type { AiChatRequestBody } from '../validation/ai-assistant.schema.js';

/**
 * HTTP layer for the dashboard AI assistant (`POST /api/ai/chat`).
 *
 * Responsibilities, and nothing else:
 *  - read the authenticated caller from `req.user` (set by `authenticate`) and
 *    take the role from there, never from the body;
 *  - call the service;
 *  - return the response envelope.
 */

const requireUser = (req: Request): NonNullable<Request['user']> => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }
  return req.user;
};

const chatHandler = async (
  req: Request<Record<string, string>, unknown, AiChatRequestBody>,
  res: Response,
): Promise<void> => {
  const user = requireUser(req);
  const { message, location, history } = req.body;

  const result = await aiAssistantService.chat(user.role, user.userId, {
    message,
    ...(location ? { location } : {}),
    history: history ?? [],
  });

  sendSuccess(res, 200, 'AI response', result);
};

export const chat = asyncHandler(chatHandler);
