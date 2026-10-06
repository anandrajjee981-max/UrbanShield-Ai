import { Router } from 'express';
import * as adminUserController from '../controller/admin-user.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { adminCreateUserSchema } from '../validation/admin-user.schema.js';
import type { UserRole } from '../types/auth.types.js';

/**
 * Admin user-provisioning route (`/api/admin/users`).
 *
 * `POST /` creates any account type (CITIZEN, AUTHORITY or ADMIN). This is
 * the only way an ADMIN account comes into existence besides the seed
 * script: the public POST /api/auth/register accepts only CITIZEN /
 * AUTHORITY, so self-promotion through the public door is impossible.
 *
 * Guards, in order:
 *   1. `authenticate` - JWT from the HTTP-only cookie (`req.user`).
 *   2. `requireRole('ADMIN')` - CITIZEN / AUTHORITY get a 403 here.
 *   3. `validateBody(adminCreateUserSchema)` - `.strict()`; unknown fields
 *      (and weak credentials) are a 400.
 */
const adminUserRouter = Router();

/** The only role allowed to provision accounts. */
const ADMIN_ONLY: UserRole[] = ['ADMIN'];

adminUserRouter.post(
  '/',
  authenticate,
  requireRole(...ADMIN_ONLY),
  validateBody(adminCreateUserSchema),
  adminUserController.createUser,
);

export default adminUserRouter;
