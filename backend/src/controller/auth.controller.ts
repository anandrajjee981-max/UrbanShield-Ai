import type { Request, RequestHandler, Response } from 'express';
import type { AuthResult } from '../service/auth.service.js';
import * as authService from '../service/auth.service.js';
import type { LoginRequest, RegisterRequest } from '../validation/auth.schema.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer only: read the request, call the service, format the response.
 * No business rules, no SQL, no bcrypt/JWT calls here.
 */

const registerHandler: RequestHandler<Record<string, string>, unknown, RegisterRequest> = async (req, res) => {
  const result: AuthResult = await authService.register(req.body);

  sendSuccess<AuthResult>(res, 201, 'Registration successful', result);
};

const loginHandler: RequestHandler<Record<string, string>, unknown, LoginRequest> = async (req, res) => {
  const result: AuthResult = await authService.login(req.body);

  sendSuccess<AuthResult>(res, 200, 'Login successful', result);
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
   * Stateless JWT logout: the client simply discards the token, because nothing
   * is stored on the server and there is no session to destroy.
   *
   * Real server-side revocation can be added later without changing this API
   * contract, e.g. by storing the token id (jti) in Redis with the remaining
   * ttl, or by moving to a session store, and checking it inside `authenticate`.
   */
  sendSuccess(res, 200, 'Logout successful', { loggedOut: true });
};

export const register = asyncHandler(registerHandler);
export const login = asyncHandler(loginHandler);
export const getMe = asyncHandler(getMeHandler);
export const logout = logoutHandler;
