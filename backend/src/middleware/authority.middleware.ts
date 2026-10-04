import type { NextFunction, Request, RequestHandler, Response } from 'express';
import * as authorityDao from '../dao/authority.dao.js';
import { AUTHORITY_STATUS_AFTER_ADMIN_ACTION } from '../types/authority.types.js';
import { ForbiddenError, UnauthorizedError } from '../utils/api-error.js';

/**
 * Authorisation guard for authority-only operations.
 *
 * This is the middleware that implements the distinction the whole module exists
 * for:
 *
 *     role = AUTHORITY, status = PENDING   ->  candidate, no authority access
 *     role = AUTHORITY, status = VERIFIED  ->  verified authority
 *
 * `requireRole('AUTHORITY')` (src/middleware/auth.middleware.ts) is deliberately
 * not enough: it passes every registered AUTHORITY, verified or not. This guard
 * adds the second condition.
 *
 * Why the status is read from the database rather than from the JWT: the token is
 * minted at login and carries only `userId` and `role`. A verification that
 * happens after the cookie was issued would otherwise not take effect until the
 * candidate logged in again, and - worse - a token issued *before* an admin
 * downgraded somebody would keep working until it expired. One indexed lookup per
 * guarded request is the price of never trusting a stale claim.
 *
 * `authenticate` must run first: the guard reads `req.user.userId`.
 */
export const requireVerifiedAuthority =
  (): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required', 'MISSING_TOKEN'));
      return;
    }

    if (req.user.role !== 'AUTHORITY') {
      // Reported as a permission failure rather than "not an authority candidate":
      // the request must not reveal whether a given account has an application.
      next(new ForbiddenError('You do not have permission to perform this action'));
      return;
    }

    void authorityDao
      .findAuthorityStandingByUserId(req.user.userId)
      .then((standing) => {
        if (!standing) {
          // The account was deleted after the token was issued.
          next(new UnauthorizedError('This account no longer exists', 'USER_NOT_FOUND'));
          return;
        }

        if (standing.role !== 'AUTHORITY' || standing.verificationStatus !== AUTHORITY_STATUS_AFTER_ADMIN_ACTION.VERIFY) {
          next(
            new ForbiddenError(
              'Your authority account has not been verified by an administrator yet',
              'AUTHORITY_NOT_VERIFIED',
            ),
          );
          return;
        }

        next();
      })
      .catch(next);
  };