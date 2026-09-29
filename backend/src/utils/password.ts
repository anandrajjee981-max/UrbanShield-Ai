import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

/**
 * A bcrypt hash of a random throwaway string. Comparing a login attempt against
 * it when no user exists keeps the response time of "unknown email" and "wrong
 * password" roughly equal, which prevents user enumeration by timing.
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO.3Zx1Jd1wZ4F1nGm9kZ1NqQ0X1v6h4Ha';

/** Hashes a plain text password. The plain text is never stored or logged. */
export const hashPassword = (plainPassword: string): Promise<string> =>
  bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);

/** Constant time comparison of a plain text password against a stored hash. */
export const verifyPassword = (plainPassword: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(plainPassword, passwordHash);

/** Burns the same amount of CPU as a real comparison (unknown user path). */
export const simulatePasswordComparison = (plainPassword: string): Promise<boolean> =>
  bcrypt.compare(plainPassword, DUMMY_HASH);
