import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * PostgreSQL connection pool.
 *
 * Works with Neon PostgreSQL: the connection string already carries
 * `sslmode=require`, which `pg` translates into a TLS enabled connection, so no
 * credentials or host are hardcoded anywhere in this project.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === 'production' ? 20 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: 'climate-smart-city-api',
});

pool.on('error', (error: Error) => {
  // Idle client errors (e.g. Neon closing a connection after idling) must never
  // crash the process; `pg` already discards the broken client.
  logger.error('Unexpected idle database client error', { error: error.message });
});

/** Runs a parameterised query and returns the raw pg result. */
export const query = async <Row extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<Row>> => pool.query<Row>(text, params as unknown[]);

/** Runs `handler` inside a transaction, rolling back on any error. */
export const withTransaction = async <T>(handler: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Opens a single connection to verify the database is reachable.
 * Neon may suspend an idle database, so the first query can take a moment.
 */
export const verifyDatabaseConnection = async (retries = 3, delayMs = 1_000): Promise<void> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      logger.warn('Database connection attempt failed', {
        attempt,
        retries,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `Unable to connect to the database: ${lastError instanceof Error ? lastError.message : 'unknown error'}`,
  );
};

/** Closes every pooled connection during graceful shutdown. */
export const closeDatabasePool = async (): Promise<void> => {
  await pool.end();
};
