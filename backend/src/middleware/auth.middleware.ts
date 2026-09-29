import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the decoded
 * identity to `req.user`. Any missing, malformed, expired or tampered token is
 * rejected with 401.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    next(new UnauthorizedError('Authentication required. Provide a Bearer token', 'MISSING_TOKEN'));
    return;
  }

  const [scheme, token, ...extra] = authorizationHeader.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token || extra.length > 0) {
    next(new UnauthorizedError('Invalid authorization header. Expected: Bearer <token>', 'INVALID_AUTH_HEADER'));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED'));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      // The raw error (which may contain the token) is intentionally not logged.
      logger.warn('Rejected access token', { reason: error.message, path: req.originalUrl });
      next(new UnauthorizedError('Invalid access token', 'INVALID_TOKEN'));
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
