import * as userDao from '../dao/user.dao.js';
import type { SafeUser, User } from '../models/user.model.js';
import { toSafeUser } from '../models/user.model.js';
import type { LoginRequest, RegisterRequest } from '../validation/auth.schema.js';
import { loginSchema, registerSchema } from '../validation/auth.schema.js';
import { ConflictError, UnauthorizedError } from '../utils/api-error.js';
import { signAccessToken } from '../utils/jwt.js';
import { hashPassword, simulatePasswordComparison, verifyPassword } from '../utils/password.js';

/**
 * Internal result of a successful register/login.
 *
 * `token` is returned to the controller so it can be written to the HTTP-only
 * cookie; it is never serialised into an API response body.
 */
export interface AuthResult {
  user: SafeUser;
  token: string;
}

/**
 * Emails are stored and compared in lower case so that
 * `Anand@Example.com` and `anand@example.com` are the same account.
 */
const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Builds the safe user payload plus a signed access token for the cookie. */
const issueSession = (user: User): AuthResult => ({
  user: toSafeUser(user),
  token: signAccessToken({ userId: user.id, role: user.role }),
});

/**
 * Registers a new account.
 *
 * Business rules: validate the payload, reject duplicate emails, hash the
 * password with bcrypt, persist through the DAO and return a JWT.
 */
export const register = async (input: RegisterRequest): Promise<AuthResult> => {
  const { name, email, password, role } = registerSchema.parse(input);
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

  return issueSession(user);
};

/**
 * Authenticates an existing account.
 *
 * The same generic error is returned for an unknown email and a wrong password
 * so the endpoint cannot be used to discover which emails are registered.
 */
export const login = async (input: LoginRequest): Promise<AuthResult> => {
  const { email, password } = loginSchema.parse(input);
  const normalizedEmail = normalizeEmail(email);

  const user = await userDao.findUserByEmail(normalizedEmail);

  if (!user) {
    await simulatePasswordComparison(password);
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  return issueSession(user);
};

/** Loads the profile of the currently authenticated user. */
export const getAuthenticatedUser = async (userId: string): Promise<SafeUser> => {
  const user = await userDao.findUserById(userId);

  if (!user) {
    // The account was deleted after the token was issued.
    throw new UnauthorizedError('This account no longer exists', 'USER_NOT_FOUND');
  }

  return toSafeUser(user);
};
