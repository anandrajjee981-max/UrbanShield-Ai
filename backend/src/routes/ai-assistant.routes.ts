import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';
import * as aiAssistantController from '../controller/ai-assistant.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { TooManyRequestsError } from '../utils/api-error.js';
import { aiChatSchema } from '../validation/ai-assistant.schema.js';

/**
 * AI assistant routes (`/api/ai/...`).
 *
 * `authenticate` runs first so the limiter can key on the real, verified user id
 * (and the service can take the role from the JWT, not the body). The limiter is
 * per account, not per IP, so one shared office network cannot starve another
 * caller.
 */
const aiAssistantRouter = Router();

const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.AI_CHAT_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? 'anonymous'),
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many AI requests. Please slow down and try again shortly.'));
  },
});

/** POST /api/ai/chat */
aiAssistantRouter.post('/chat', authenticate, aiChatLimiter, validateBody(aiChatSchema), aiAssistantController.chat);

export default aiAssistantRouter;
