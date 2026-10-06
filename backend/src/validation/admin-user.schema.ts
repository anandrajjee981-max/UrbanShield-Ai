import { z } from 'zod';
import { USER_ROLES } from '../types/auth.types.js';

/**
 * Request schema for `POST /api/admin/users` — an authenticated ADMIN creating
 * any account type (CITIZEN, AUTHORITY or ADMIN).
 *
 * This is deliberately separate from the public `registerSchema`
 * (src/validation/auth.schema.ts), which only accepts CITIZEN / AUTHORITY:
 * letting the public endpoint accept ADMIN would open self-promotion to
 * anyone. The field rules (name/email/password) mirror registration exactly
 * so both doors enforce the same credential quality, and `.strict()` rejects
 * anything else the client tries to smuggle in.
 */

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name must be at most 120 characters');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email('A valid email address is required')
      .max(320, 'Email must be at most 320 characters'),
  );

/**
 * At least 8 characters plus a letter and a digit — the same rule as public
 * registration. The length cap keeps the input inside bcrypt's 72 byte limit.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

export const adminCreateUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(USER_ROLES, {
      error: `Role must be one of: ${USER_ROLES.join(', ')}`,
    }),
  })
  .strict();

export type AdminCreateUserRequest = z.infer<typeof adminCreateUserSchema>;
