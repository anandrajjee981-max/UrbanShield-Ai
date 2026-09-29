import type { UserRole } from '../types/auth.types.js';

/**
 * A `users` row exactly as PostgreSQL returns it (snake_case columns).
 * Only the DAO layer ever sees this shape.
 */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

/** Domain entity passed between DAO, service and controller. */
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/** The only user shape that may leave the service layer. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/** Values required to insert a new user. */
export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

/** Maps a raw database row to the domain entity. */
export const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.password_hash,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Strips the password hash before a user is serialised into an API response.
 * Every response path in the service layer goes through this function.
 */
export const toSafeUser = (user: User): SafeUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
