import type { Request, Response } from 'express';
import { getThreeDayWeather } from '../service/weather.service.js';
import type { WeatherQueryRequest } from '../validation/weather.schema.js';
import { sendSuccess } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * HTTP layer for the public weather feature.
 *
 * GET /api/weather?city=Jamshedpur  (or ?lat=&lon=, optional &refresh=true)
 *
 * Public on purpose: the Home page weather preview is visible without
 * login. The response is the normalized 3-day shape only - the
 * OpenWeatherMap key and all upstream detail stay server side.
 * Thin by design: the validated query goes straight to the service.
 */
const getWeatherHandler = async (req: Request, res: Response): Promise<void> => {
  // Validated by `validateQuery(weatherQuerySchema)` on the route.
  const { city, lat, lon, refresh } = req.query as unknown as WeatherQueryRequest;

  const weather = await getThreeDayWeather({ city, lat, lon, refresh });

  sendSuccess(res, 200, 'Weather retrieved', { weather });
};

export const getWeather = asyncHandler(getWeatherHandler);
