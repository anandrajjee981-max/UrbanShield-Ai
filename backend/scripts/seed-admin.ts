/**
 * Creates or promotes an ADMIN account so the admin console (/admin/login)
 * can be opened.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts --name "Root Admin" --email admin@civic.local --password Admin1234
 *
 * If the email already exists its role is upgraded to ADMIN (password is
 * reset to the supplied value). Otherwise a new ADMIN row is inserted.
 */
import bcrypt from 'bcryptjs';
import { query, closeDatabasePool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const parseArg = (flag: string): string | undefined => {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
};

const main = async (): Promise<void> => {
  const name = parseArg('--name') ?? 'Root Admin';
  const email = (parseArg('--email') ?? 'admin@civic.local').trim().toLowerCase();
  const password = parseArg('--password') ?? 'Admin1234';

  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error('Password must be at least 8 characters with a letter and a number.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rows[0]) {
    await query('UPDATE users SET name = $2, password_hash = $3, role = $4, updated_at = NOW() WHERE id = $1', [
      existing.rows[0].id,
      name,
      passwordHash,
      'ADMIN',
    ]);
    console.log(`Promoted ${email} to ADMIN (id=${existing.rows[0].id})`);
  } else {
    const inserted = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'ADMIN') RETURNING id`,
      [name, email, passwordHash],
    );
    console.log(`Created ADMIN ${email} (id=${inserted.rows[0]?.id})`);
  }
  console.log('Login at /admin/login with this email + password.');
  await closeDatabasePool();
};

main().catch(async (err) => {
  console.error(err);
  await closeDatabasePool();
  process.exit(1);
});
