import type { Request, RequestHandler, Response } from 'express';
import type { AuthResult } from '../service/auth.service.js';
import * as authService from '../service/auth.service.js';
import type { LoginRequest, RegisterRequest } from '../validation/auth.schema.js';
import { AUTH_COOKIE_NAME, authCookieOptions, clearAuthCookieOptions } from '../config/auth-cookie.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer only: read the request, call the service, format the response.
 * No business rules, no SQL, no bcrypt/JWT calls here.
 */

/**
 * Writes the signed JWT to the HTTP-only `access_token` cookie. The browser
 * stores and replays it automatically, so the client never handles the token.
 */
const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
};

const registerHandler: RequestHandler<Record<string, string>, unknown, RegisterRequest> = async (req, res) => {
  const result: AuthResult = await authService.register(req.body);

  setAuthCookie(res, result.token);

  // Only safe user data is returned - the token lives in the cookie alone.
  sendSuccess(res, 201, 'Registration successful', { user: result.user });
};

const loginHandler: RequestHandler<Record<string, string>, unknown, LoginRequest> = async (req, res) => {
  const result: AuthResult = await authService.login(req.body);

  setAuthCookie(res, result.token);

  sendSuccess(res, 200, 'Login successful', { user: result.user });
};

const getMeHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    // Unreachable while the route is mounted behind `authenticate`; kept as a guard.
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  const user = await authService.getAuthenticatedUser(req.user.userId);

  sendSuccess(res, 200, 'Authenticated user retrieved', { user });
};

const logoutHandler: RequestHandler = (_req, res) => {
  /**
   * Cookie logout: the access token is removed from the browser, which is the
   * only place it exists. The same name and options used by `setAuthCookie` are
   * repeated here so the browser matches the cookie to delete.
   *
   * Real server-side revocation can be added later without changing this API
   * contract, e.g. by storing the token id (jti) in Redis with the remaining
   * ttl, or by moving to a session store, and checking it inside `authenticate`.
   */
  res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions);

  sendSuccess(res, 200, 'Logout successful', { loggedOut: true });
};

export const register = asyncHandler(registerHandler);
export const login = asyncHandler(loginHandler);
export const getMe = asyncHandler(getMeHandler);
export const logout = logoutHandler;
