/**
 * Authentication domain types shared by the DAO, service, controller and
 * middleware layers.
 */

export const USER_ROLES = ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Claims carried inside the signed access token. */
export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

/** Information attached to `req.user` by the authentication middleware. */
export interface AuthenticatedUser extends AuthTokenPayload {}  
