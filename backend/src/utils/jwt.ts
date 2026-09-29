import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { USER_ROLES, type AuthTokenPayload, type AuthenticatedUser } from '../types/auth.types.js';

const ALGORITHM = 'HS256' as const;
const ISSUER = 'climate-smart-city-api';
const AUDIENCE = 'climate-smart-city-client';

/**
 * Only these two claims are trusted from a token. Anything else (including a
 * token signed with a different algorithm or issuer) is rejected.
 */
const verifiedTokenSchema = z.object({
  userId: z.uuid(),
  role: z.enum(USER_ROLES),
});

export const signAccessToken = (payload: AuthTokenPayload): string =>
  jwt.sign({ userId: payload.userId, role: payload.role }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: payload.userId,
  });

/**
 * Verifies signature, expiry, issuer and audience, then validates the claim
 * shape. Throws `TokenExpiredError` / `JsonWebTokenError` from jsonwebtoken,
 * which the authentication middleware maps to 401 responses.
 */
export const verifyAccessToken = (token: string): AuthenticatedUser => {
  const decoded: unknown = jwt.verify(token, env.JWT_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const parsed = verifiedTokenSchema.safeParse(decoded);

  if (!parsed.success) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return { userId: parsed.data.userId, role: parsed.data.role };
};

/** Decodes a token without verifying it. Only used for diagnostics/debugging. */
export const decodeAccessToken = (token: string): AuthTokenPayload | null => {
  const decoded = jwt.decode(token);
  const parsed = verifiedTokenSchema.safeParse(decoded);
  return parsed.success ? parsed.data : null;
};
