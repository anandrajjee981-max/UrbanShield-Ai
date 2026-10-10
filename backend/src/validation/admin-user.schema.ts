import { z } from 'zod';
import { USER_ROLES } from '../types/auth.types.js';

/**
 * Body for `POST /api/admin/users` — governed provisioning of any account
 * type, including ADMIN. The public `/api/auth/register` schema deliberately
 * only allows CITIZEN / AUTHORITY; this is the only door that can mint ADMINs.
 */
export const adminCreateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(120, 'Name must be at most 120 characters'),
    email: z.email('A valid email address is required').max(320, 'Email must be at most 320 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    role: z.enum(USER_ROLES, {
      error: `Role must be one of: ${USER_ROLES.join(', ')}`,
    }),
  })
  .strict();

export type AdminCreateUserRequest = z.infer<typeof adminCreateUserSchema>;
