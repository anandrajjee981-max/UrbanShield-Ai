import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Single source of truth for configuration.
 *
 * dotenv is loaded here (instead of server.ts) so that any module importing this
 * file gets validated values regardless of module evaluation order. The process
 * exits immediately when configuration is invalid, so the app never starts with a
 * missing/weak JWT secret or an unreachable database url.
 */
dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().positive().max(65535).default(4000),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DATABASE_URL must be a PostgreSQL connection string',
    ),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long')
    .refine((value) => !value.includes(' '), 'JWT_SECRET must not contain spaces'),

  JWT_EXPIRES_IN: z
    .string()
    .min(1, 'JWT_EXPIRES_IN is required (e.g. 15m, 1h, 7d)')
    .regex(/^\d+(\.\d+)?\s*(ms|s|m|h|d|w|y)$/i, 'JWT_EXPIRES_IN must be a duration such as 15m, 1h or 7d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  CLIENT_ORIGIN: z.string().url('CLIENT_ORIGIN must be a valid origin').default('http://localhost:5173'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Only field names and validation messages are printed - never the values.
  const details = parsedEnv.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  process.stderr.write(`Invalid environment configuration:\n${details}\n\nCopy .env.example to .env and fill in the missing values.\n`);
  process.exit(1);
}

export const env = parsedEnv.data;

export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
