import type { CookieOptions } from 'express';
import { env, isProduction } from './env.js';

/**
 * Single source of truth for the authentication cookie.
 *
 * The JWT never leaves the server in the JSON body: it is written to this
 * HTTP-only cookie by the controller and read back by `authenticate`. Because
 * the name and the options live here, `res.cookie()` and `res.clearCookie()`
 * can never drift apart (a mismatched `path`/`secure`/`sameSite` would make the
 * browser keep the cookie after logout).
 */
export const AUTH_COOKIE_NAME = 'access_token';

const DURATION_UNITS_IN_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_557_600_000,
};

/** Same duration grammar accepted by `JWT_EXPIRES_IN` in config/env.ts. */
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)$/i;

/**
 * Converts `JWT_EXPIRES_IN` (e.g. "15m") to milliseconds so the browser drops
 * the cookie exactly when the JWT inside it expires - the cookie can never
 * outlive its own token.
 */
const durationToMs = (duration: string): number => {
  const match = DURATION_PATTERN.exec(duration.trim());
  const [, amount = '', unit = ''] = match ?? [];

  if (!amount || !unit) {
    throw new Error(`Unsupported duration: ${duration}`);
  }

  return Math.floor(Number(amount) * (DURATION_UNITS_IN_MS[unit.toLowerCase()] ?? 0));
};

export const AUTH_COOKIE_MAX_AGE_MS = durationToMs(env.JWT_EXPIRES_IN);

/**
 * Options used when setting the cookie.
 *
 * - `httpOnly` keeps the JWT unreadable from JavaScript, so XSS cannot steal it.
 * - `secure` is enabled in production only, otherwise browsers reject the
 *   cookie on plain `http://localhost` during development.
 * - `sameSite: 'lax'` blocks cross-site POSTs (CSRF for state changing routes)
 *   while still sending the cookie on normal top-level navigations.
 */
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: AUTH_COOKIE_MAX_AGE_MS,
};

/**
 * Options used when clearing the cookie. They must match `authCookieOptions`
 * except for `maxAge`, which the browser must be told to apply as `Max-Age=0`.
 */
export const clearAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};
