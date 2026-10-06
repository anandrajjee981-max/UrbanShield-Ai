/**
 * Creates or promotes the ADMIN account.
 *
 * Why this script exists: public POST /api/auth/register only accepts
 * CITIZEN / AUTHORITY (backend/src/validation/auth.schema.ts), so an ADMIN
 * account can never be created from the UI. Without one, every admin login
 * fails with "Invalid credentials" — which is exactly what this fixes.
 *
 *   npm run db:seed-admin -- admin@civic.local Admin1234 "Site Admin"
 *
 * Or via environment variables:
 *
 *   ADMIN_EMAIL=admin@civic.local ADMIN_PASSWORD=Admin1234 npm run db:seed-admin
 *
 * Behaviour: if the email already exists (e.g. registered as CITIZEN), its
 * password is reset and its role is promoted to ADMIN. Otherwise a new ADMIN
 * row is inserted. Safe to re-run.
 */

import { pool, closeDatabasePool } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';

const [, , emailArg, passwordArg, ...nameParts] = process.argv;

const email = (emailArg ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
const password = passwordArg ?? process.env.ADMIN_PASSWORD ?? '';
const name = nameParts.join(' ').trim() || process.env.ADMIN_NAME || 'Site Admin';

const fail = (message: string): never => {
  process.stderr.write(`seed-admin: ${message}\n`);
  process.exit(1);
};

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('a valid email is required: npm run db:seed-admin -- admin@civic.local Admin1234 "Site Admin"');
}

if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  fail('password must be at least 8 characters with a letter and a number (same rule as registration).');
}

/** Matches users.name VARCHAR(120). */
if (name.length > 120) {
  fail('name must be at most 120 characters.');
}

try {
  const passwordHash = await hashPassword(password);

  const existing = await pool.query<{ id: string; role: string }>(
    'SELECT id, role FROM users WHERE email = $1 LIMIT 1',
    [email],
  );

  if (existing.rows[0]) {
    await pool.query(
      'UPDATE users SET password_hash = $2, role = $3, name = $4 WHERE id = $1',
      [existing.rows[0]!.id, passwordHash, 'ADMIN', name],
    );
    process.stdout.write(`seed-admin: promoted ${email} (${existing.rows[0]!.role} -> ADMIN) and reset its password.\n`);
  } else {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ADMIN')`,
      [name, email, passwordHash],
    );
    process.stdout.write(`seed-admin: created ADMIN account ${email}.\n`);
  }

  process.stdout.write('seed-admin: done — login at /admin/login, you will land straight inside /admin.\n');
} catch (error) {
  process.stderr.write(`seed-admin: database operation failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
  process.exit(1);
} finally {
  await closeDatabasePool();
}
