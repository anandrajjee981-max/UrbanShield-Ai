import * as userDao from '../dao/user.dao.js';
import type { SafeUser } from '../models/user.model.js';
import { toSafeUser } from '../models/user.model.js';
import type { AdminCreateUserRequest } from '../validation/admin-user.schema.js';
import { adminCreateUserSchema } from '../validation/admin-user.schema.js';
import { ConflictError } from '../utils/api-error.js';
import { hashPassword } from '../utils/password.js';

/**
 * Business layer for `POST /api/admin/users` — an ADMIN creating any account
 * type, including another ADMIN.
 *
 * Only the credential quality and the duplicate-email rule live here. Who may
 * call it (`requireRole('ADMIN')`) is settled at the route, and the creator's
 * identity is intentionally NOT recorded: user creation is not an audited
 * transition in this module (unlike authority verify/reject, which write
 * audit rows).
 */

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const createUserAsAdmin = async (input: AdminCreateUserRequest): Promise<SafeUser> => {
  const { name, email, password, role } = adminCreateUserSchema.parse(input);
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await userDao.findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new ConflictError('An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await hashPassword(password);

  const user = await userDao.createUser({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
  });

  return toSafeUser(user);
};
