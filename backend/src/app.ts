import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env, FRONTEND_ORIGINS } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import { sendSuccess } from './utils/api-response.js';
import { logger } from './utils/logger.js';

/**
 * Builds the Express application: global middleware, routes and error handling.
 * There is no business logic here and nothing is listened on - server.ts owns
 * the HTTP lifecycle.
 */
export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');

  // Behind a proxy/load balancer (Neon-backed deployments) trust the first hop
  // so rate limiting and secure cookies see the real client IP.
  app.set('trust proxy', 1);

  app.use(helmet());

  /**
   * Cookie authentication needs an explicit allow list: the browser only sends
   * the `access_token` cookie to a cross-origin API when CORS allows credentials
   * and never sends it to a `*` origin. Requests without an `Origin` header
   * (curl, server-to-server, same-origin) are not browser requests and are not
   * subject to this check.
   */
  const allowedOrigins = new Set(FRONTEND_ORIGINS);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (origin === undefined || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        // No CORS headers are emitted, so the browser blocks the response and
        // never attaches the cookie to a request from a foreign origin.
        logger.warn('Blocked cross-origin request', { origin });
        callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  // Must run before any route so `req.cookies.access_token` is available to
  // `authenticate` in src/middleware/auth.middleware.ts.
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    sendSuccess(res, 200, 'Service is healthy', { status: 'ok', environment: env.NODE_ENV });
  });

  app.use('/api/auth', authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();

export default app;
