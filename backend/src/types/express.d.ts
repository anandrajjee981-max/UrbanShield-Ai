import type { AuthenticatedUser } from './auth.types.js';

/**
 * Express request augmentation.
 *
 * `user` is set by `authenticate` in src/middleware/auth.middleware.ts and stays
 * optional because public routes never run that middleware.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
