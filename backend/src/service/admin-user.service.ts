import * as userDao from '../dao/user.dao.js';
import { toSafeUser, type SafeUser } from '../models/user.model.js';
import { ConflictError } from '../utils/api-error.js';
import { hashPassword } from '../utils/password.js';
import { adminCreateUserSchema, type AdminCreateUserRequest } from '../validation/admin-user.schema.js';

/**
 * Governed user provisioning for `POST /api/admin/users` (ADMIN only).
 *
 * Unlike public registration this accepts every role including ADMIN — the
 * route guards (`authenticate` + `requireRole('ADMIN')`) are what keep it
 * governed. Emails are lower-cased so `Admin@X` and `admin@x` stay one account.
 */
export const createUserAsAdmin = async (input: AdminCreateUserRequest): Promise<SafeUser> => {
  const { name, email, password, role } = adminCreateUserSchema.parse(input);
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await userDao.findUserByEmail(normalizedEmail);
  if (existing) {
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
