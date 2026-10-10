import { Router } from 'express';
import * as adminUserController from '../controller/admin-user.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { adminCreateUserSchema } from '../validation/admin-user.schema.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Admin user-provisioning routes (`/api/admin/users`).
 *
 * Same guard pair as every admin router: `authenticate` (JWT cookie) then
 * `requireRole('ADMIN')`. This is the only endpoint that can create ADMIN
 * accounts — the public register schema rejects that role.
 */
const adminUserRouter = Router();

const ADMIN_ONLY: UserRole[] = ['ADMIN'];

adminUserRouter.post(
  '/',
  authenticate,
  requireRole(...ADMIN_ONLY),
  validateBody(adminCreateUserSchema),
  adminUserController.createUser,
);

export default adminUserRouter;
