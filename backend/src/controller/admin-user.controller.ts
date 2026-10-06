import type { Request } from 'express';
import * as adminUserService from '../service/admin-user.service.js';
import type { AdminCreateUserRequest } from '../validation/admin-user.schema.js';
import { ForbiddenError, UnauthorizedError } from '../utils/api-error.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import type { RequestHandler } from 'express';

/**
 * HTTP layer for `POST /api/admin/users`.
 *
 * Responsibilities, and nothing else: read the parsed body (validated by
 * `validateBody`), call the service, return the response envelope. No SQL,
 * no hashing, no role decisions here.
 *
 * Mounted behind `authenticate` + `requireRole('ADMIN')`. The role is
 * re-checked here as fail-closed defense-in-depth, mirroring the other admin
 * controllers.
 */

const requireAdmin = (req: Request): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'MISSING_TOKEN');
  }

  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('You do not have permission to perform this action', 'FORBIDDEN');
  }
};

const createUserHandler: RequestHandler<Record<string, string>, unknown, AdminCreateUserRequest> = async (
  req,
  res,
) => {
  requireAdmin(req);

  const user = await adminUserService.createUserAsAdmin(req.body);

  sendSuccess(res, 201, 'User account created successfully', { user });
};

export const createUser = asyncHandler(createUserHandler);
