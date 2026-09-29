import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import { sendSuccess } from './utils/api-response.js';

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
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

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
