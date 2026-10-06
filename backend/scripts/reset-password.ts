/**
 * Resets any account's password (role untouched).
 *
 * Use when login fails with "Invalid credentials" and the password is lost:
 *
 *   npm run db:reset-password -- user@civic.local NewPass1234
 *
 * Or via environment variables:
 *
 *   RESET_EMAIL=user@civic.local RESET_PASSWORD=NewPass1234 npm run db:reset-password
 */

import { pool, closeDatabasePool } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';

const [, , emailArg, passwordArg] = process.argv;

const email = (emailArg ?? process.env.RESET_EMAIL ?? '').trim().toLowerCase();
const password = passwordArg ?? process.env.RESET_PASSWORD ?? '';

const fail = (message: string): never => {
  process.stderr.write(`reset-password: ${message}\n`);
  process.exit(1);
};

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('a valid email is required: npm run db:reset-password -- user@civic.local NewPass1234');
}

if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  fail('password must be at least 8 characters with a letter and a number (same rule as registration).');
}

try {
  const existing = await pool.query<{ id: string; role: string }>(
    'SELECT id, role FROM users WHERE email = $1 LIMIT 1',
    [email],
  );

  const row = existing.rows[0];

  if (!row) {
    fail(`no account found for ${email} — register first (role CITIZEN or AUTHORITY), then reset if needed.`);
  }

  const passwordHash = await hashPassword(password);

  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [row!.id, passwordHash]);

  process.stdout.write(`reset-password: password updated for ${email} (role ${row!.role}).\n`);
  process.stdout.write('reset-password: done — login with the new password.\n');
} catch (error) {
  process.stderr.write(
    `reset-password: database operation failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exit(1);
} finally {
  await closeDatabasePool();
}
