import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabasePool, pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Minimal forward-only migration runner.
 *
 * Every .sql file in ./migrations is executed once, in file name order, inside a
 * transaction. Applied files are recorded in the `_migrations` table so the
 * runner is safe to re-run on every deploy.
 */

const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS _migrations (
    name        VARCHAR(255) PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const ensureMigrationsTable = async (): Promise<void> => {
  await pool.query(MIGRATIONS_TABLE_SQL);
};

const getAppliedMigrations = async (): Promise<Set<string>> => {
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM _migrations');
  return new Set(rows.map((row) => row.name));
};

const runMigrations = async (): Promise<void> => {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    logger.warn('No migration files found', { directory: migrationsDirectory });
    return;
  }

  let pending = 0;

  for (const file of files) {
    if (applied.has(file)) {
      logger.debug('Migration already applied', { migration: file });
      continue;
    }

    const sql = await readFile(path.join(migrationsDirectory, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      pending += 1;
      logger.info('Migration applied', { migration: file });
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(
        `Migration ${file} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    } finally {
      client.release();
    }
  }

  logger.info('Database migrations up to date', { total: files.length, applied: pending });
};

try {
  await runMigrations();
  logger.info('Migrations complete');
} catch (error) {
  logger.error('Migrations failed', {
    error: error instanceof Error ? error.message : 'unknown error',
  });
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
