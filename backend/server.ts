import { app } from './src/app.js';
import { closeDatabasePool, verifyDatabaseConnection } from './src/config/db.js';
import { env } from './src/config/env.js';
import { logger } from './src/utils/logger.js';

/**
 * Application entry point: environment, HTTP server, graceful shutdown.
 * No routes, no business logic.
 */

const start = async (): Promise<void> => {
  await verifyDatabaseConnection();

  const server = app.listen(env.PORT, () => {
    // console.log(process.env.DATABASE_URL?.split("@")[1]);
    logger.info('Server listening', { port: env.PORT, environment: env.NODE_ENV });
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error('Port is already in use', { port: env.PORT });
    } else {
      logger.error('HTTP server error', { error: error.message });
    }
    process.exit(1);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutting down', { signal });

    // Stop accepting connections, then release the database pool.
    server.close(async () => {
      try {
        await closeDatabasePool();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error while closing the database pool', {
          error: error instanceof Error ? error.message : 'unknown error',
        });
        process.exit(1);
      }
    });

    // Do not hang forever on lingering keep-alive sockets.
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      error: reason instanceof Error ? reason.message : String(reason),
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    void shutdown('uncaughtException');
  });
};

start().catch((error: unknown) => {
  logger.error('Failed to start the server', {
    error: error instanceof Error ? error.message : 'unknown error',
  });
  process.exit(1);
});
