import type { AuthUser } from '../store/slices/authSlice';

export type Role = AuthUser['role'];

/**
 * Single source of truth for "where does this role land after login".
 *
 * Backend rule (backend/src/validation/auth.schema.ts): public /register only
 * creates CITIZEN / AUTHORITY — ADMIN accounts are seeded in the DB, so the
 * admin has a dedicated /admin/login page that enforces role === 'ADMIN'.
 */
export function homeForRole(role: Role | undefined | null): string {
  if (role === 'ADMIN') return '/admin-dashboard';
  if (role === 'AUTHORITY') return '/authority';
  return '/dashboard';
}
