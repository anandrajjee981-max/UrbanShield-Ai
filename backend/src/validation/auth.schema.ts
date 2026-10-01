import { z } from 'zod';

/**
 * Request schemas. Validation runs in the `validateBody` middleware so the
 * controller receives data that already matches these types, and the service
 * layer parses again so it stays safe when called from anywhere else.
 */

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name must be at most 120 characters');

const emailSchema = z
  .email('A valid email address is required')
  .max(320, 'Email must be at most 320 characters');

/**
 * At least 8 characters plus a letter and a digit. The length cap keeps the
 * input inside bcrypt's 72 byte limit.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(['CITIZEN', 'AUTHORITY']).default('CITIZEN'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required').max(72, 'Password must be at most 72 characters'),
  })
  .strict();

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
