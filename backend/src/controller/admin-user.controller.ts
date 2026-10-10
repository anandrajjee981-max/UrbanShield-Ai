import type { RequestHandler } from 'express';
import * as adminUserService from '../service/admin-user.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import type { AdminCreateUserRequest } from '../validation/admin-user.schema.js';

/**
 * HTTP layer for `POST /api/admin/users`.
 * Reads the validated body, provisions the account, returns the safe user.
 * Never sets a cookie — the new user logs in separately.
 */
const createUserHandler: RequestHandler<Record<string, string>, unknown, AdminCreateUserRequest> = async (
  req,
  res,
) => {
  const user = await adminUserService.createUserAsAdmin(req.body);
  sendSuccess(res, 201, 'User created successfully', { user });
};

export const createUser = asyncHandler(createUserHandler);
