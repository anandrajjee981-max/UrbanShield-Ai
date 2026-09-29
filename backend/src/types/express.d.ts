import type { AuthenticatedUser } from './auth.types.js';

/**
 * Express request augmentation.
 *
 * `user` is set by `authenticate` in src/middleware/auth.middleware.ts (from the
 * `access_token` cookie, see src/config/auth-cookie.ts) and stays optional
 * because public routes never run that middleware.
 *
 * `cookies` is declared by @types/cookie-parser and is populated by the
 * `cookieParser()` middleware in src/app.ts.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
