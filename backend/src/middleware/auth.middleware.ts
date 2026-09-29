import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME } from '../config/auth-cookie.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Cookie-only authentication.
 *
 * The JWT is read from the HTTP-only `access_token` cookie that the browser
 * attaches automatically to every same-site request. There is deliberately no
 * `Authorization: Bearer` fallback: the token is never exposed to JavaScript, so
 * there is nothing for an XSS payload to steal and re-send from a header.
 *
 * A missing cookie is a 401, and so is a cookie that fails verification
 * (bad signature, expired, wrong issuer/audience or a malformed payload).
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const cookie: unknown = req.cookies?.[AUTH_COOKIE_NAME];

  if (typeof cookie !== 'string' || cookie.length === 0) {
    next(new UnauthorizedError('Authentication required', 'MISSING_TOKEN'));
    return;
  }

  try {
    req.user = verifyAccessToken(cookie);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      // The raw error may contain the token itself, so only the reason is logged
      // and the client gets a single generic message.
      logger.warn('Rejected authentication cookie', { reason: error.message, path: req.originalUrl });
      next(new UnauthorizedError('Invalid or expired authentication', 'INVALID_TOKEN'));
      return;
    }

    next(error);
  }
};

/**
 * Authorisation guard: allows the request only for the listed roles (403 for a
 * valid token without the required role). Use after `authenticate`.
 */
export const requireRole =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required', 'MISSING_TOKEN'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to perform this action'));
      return;
    }

    next();
  };
