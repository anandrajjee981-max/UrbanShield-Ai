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

  /**
   * ImageKit credentials for issue photos.
   *
   * Only the private key authenticates the server side upload performed in
   * src/service/image.service.ts. The public key is validated as well because
   * ImageKit issues the two together: requiring it catches a half filled .env
   * at boot instead of failing on the first citizen upload. Neither value is
   * ever sent to the client - see src/config/imagekit.ts.
   */
  IMAGEKIT_PUBLIC_KEY: z.string().min(1, 'IMAGEKIT_PUBLIC_KEY is required').startsWith('public_', 'IMAGEKIT_PUBLIC_KEY must start with "public_"'),

  IMAGEKIT_PRIVATE_KEY: z
    .string()
    .min(1, 'IMAGEKIT_PRIVATE_KEY is required')
    .startsWith('private_', 'IMAGEKIT_PRIVATE_KEY must start with "private_"'),

  IMAGEKIT_URL_ENDPOINT: z
    .string()
    .min(1, 'IMAGEKIT_URL_ENDPOINT is required')
    .url('IMAGEKIT_URL_ENDPOINT must be a valid URL')
    .refine(
      (value) => {
        try {
          const hostname = new URL(value).hostname;
          return hostname.includes('imagekit.io');
        } catch {
          return false;
        }
      },
      'IMAGEKIT_URL_ENDPOINT must point to an ImageKit domain',
    )
    .transform((value) => value.replace(/\/$/, '')),

  /** Upper bound for a single issue photo, enforced before any upload starts. */
  ISSUE_IMAGE_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),

  /**
   * How many issues one authenticated citizen may report per minute. Anti spam
   * only: a burst well above what a real complaint session needs.
   */
  ISSUE_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),

  /**
   * How many issue photos one authenticated citizen may upload per minute.
   * Deliberately lower than the report limit because each upload stores bytes
   * and a citizen attaching evidence needs a handful at most.
   */
  ISSUE_UPLOAD_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),

  /**
   * OpenRouter API key for the Watcher/Boss AI (LangGraph nodes).
   *
   * Optional on purpose, unlike the ImageKit keys: without it the Watcher
   * reports WATCHER_UNAVAILABLE and every new issue simply stays REPORTED, so
   * the rest of the API keeps working instead of refusing to boot. A blank
   * value in .env is treated the same as an absent one. The key is server side
   * only and is never logged or returned.
   */
  OPENROUTER_API_KEY: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === ''
        ? undefined
        : typeof value === 'string'
          ? value.trim()
          : value,
    z.string().min(1, 'OPENROUTER_API_KEY must not be blank').optional(),
  ),

  /** Model the Watcher/Boss node talks to on OpenRouter. */
  OPENROUTER_MODEL: z.string().trim().min(1, 'OPENROUTER_MODEL must not be blank').default('openai/gpt-4o-mini'),

  /** Hard cap in milliseconds for one Watcher run. */
  // Must absorb the node's 4 SDK retries (503 backoff) plus one full model
  // call, otherwise a transient spike is reported as a timeout failure.
  WATCHER_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),

  /** Hard cap in milliseconds for one Boss run. */
  BOSS_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),

  /**
   * Mistral API key for the dashboard AI assistant (`POST /api/ai/chat`).
   *
   * Optional on purpose, matching OPENROUTER_API_KEY: without it the assistant
   * endpoint returns AI_SERVICE_UNAVAILABLE and the rest of the API keeps
   * working. A blank value is treated the same as an absent one. The key is
   * server side only and is never logged or returned.
   */
  MISTRAL_API_KEY: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === ''
        ? undefined
        : typeof value === 'string'
          ? value.trim()
          : value,
    z.string().min(1, 'MISTRAL_API_KEY must not be blank').optional(),
  ),

  /** Model the AI assistant talks to on Mistral. */
  MISTRAL_MODEL: z.string().trim().min(1, 'MISTRAL_MODEL must not be blank').default('open-mistral-nemo'),

  /** Mistral REST base url (openai-compatible chat completions). */
  MISTRAL_BASE_URL: z.string().url('MISTRAL_BASE_URL must be a valid URL').default('https://api.mistral.ai/v1'),

  /** Hard cap in milliseconds for one assistant model call. */
  AI_CHAT_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  /** How many assistant chat requests one account may send per minute. */
  AI_CHAT_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),

  /** Longest single assistant question the API accepts. */
  AI_CHAT_MESSAGE_MAX_LENGTH: z.coerce.number().int().positive().default(1000),

  /** How many prior turns of the conversation are sent back to the model. */
  AI_CHAT_HISTORY_MAX_TURNS: z.coerce.number().int().positive().max(20).default(6),

  /** How many civic records are summarised into the assistant context. */
  AI_CHAT_CONTEXT_LIMIT: z.coerce.number().int().positive().max(100).default(20),

  /**
   * Upper bound for one uploaded government identity document, enforced by multer
   * before any byte is read from the socket.
   *
   * Slightly larger than the issue photo cap because government ID scans are
   * frequently multi-page PDFs or phone photos at full camera resolution. Still
   * small on purpose: this value bounds how much of a stranger's identity
   * document the server will buffer in memory.
   */
  AUTHORITY_DOCUMENT_MAX_BYTES: z.coerce.number().int().positive().default(8 * 1024 * 1024),

  /**
   * How many authority applications one account may submit or re-submit per
   * minute. An anti-spam ceiling only: a real candidate submits once, then
   * perhaps once more after a rejection, so this is orders of magnitude above the
   * genuine rate.
   */
  AUTHORITY_APPLICATION_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),

  /**
   * Browser origin(s) allowed by CORS. Credentials (cookies) are enabled, so
   * this must be an explicit origin - `*` is rejected by the browser. Several
   * origins can be listed separated by commas, e.g. for staging deployments.
   */
  FRONTEND_URL: z
    .string()
    .min(1, 'FRONTEND_URL is required (e.g. http://localhost:5173)')
    .default('http://localhost:5173,https://urban-shield-ai-iota.vercel.app')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .refine(
      (origins) =>
        origins.length > 0 &&
        origins.every((origin) => {
          try {
            const { protocol, hostname } = new URL(origin);
            return (protocol === 'http:' || protocol === 'https:') && hostname.length > 0;
          } catch {
            return false;
          }
        }),
      'FRONTEND_URL must be a comma separated list of valid origins (e.g. http://localhost:5173)',
    ),
});

// `CLIENT_ORIGIN` is the previous name of `FRONTEND_URL` and is still honoured
// so existing deployments do not break when they upgrade.
const rawEnv = {
  ...process.env,
  FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.CLIENT_ORIGIN,
};

const parsedEnv = envSchema.safeParse(rawEnv);

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

/** OpenRouter speaks the OpenAI chat-completions API; this is its base url. */
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/** Origins accepted by CORS (parsed from `FRONTEND_URL`). */
export const FRONTEND_ORIGINS: readonly string[] = env.FRONTEND_URL;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
