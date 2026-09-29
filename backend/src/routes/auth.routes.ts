import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controller/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { TooManyRequestsError } from '../utils/api-error.js';
import { loginSchema, registerSchema } from '../validation/auth.schema.js';

/**
 * Authentication routes. Each route only wires middleware to a controller
 * function - no business logic lives here.
 */
const authRouter = Router();

/** Basic brute force protection on the credential endpoints. */
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many attempts. Please try again in a few minutes'));
  },
});

authRouter.post('/register', credentialsLimiter, validateBody(registerSchema), authController.register);

authRouter.post('/login', credentialsLimiter, validateBody(loginSchema), authController.login);

authRouter.get('/me', authenticate, authController.getMe);

authRouter.post('/logout', authenticate, authController.logout);

export default authRouter;
