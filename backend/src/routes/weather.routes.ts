import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import * as weatherController from '../controller/weather.controller.js';
import { env } from '../config/env.js';
import { validateQuery } from '../middleware/validate.middleware.js';
import { TooManyRequestsError } from '../utils/api-error.js';
import { weatherQuerySchema } from '../validation/weather.schema.js';

/**
 * Public weather routes.
 *
 *   GET /api/weather?city=Jamshedpur[&refresh=true]
 *   GET /api/weather?lat=..&lon=..[&refresh=true]
 *
 * Public on purpose: the Home page preview card is visible without login.
 * Rate limited per IP because every uncached lookup costs an upstream
 * OpenWeatherMap call; the client never sees the API key.
 */
const weatherRouter = Router();

const weatherLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.WEATHER_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'anonymous'),
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many weather requests. Please try again in a minute'));
  },
});

weatherRouter.get('/', weatherLimiter, validateQuery(weatherQuerySchema), weatherController.getWeather);

export default weatherRouter;
