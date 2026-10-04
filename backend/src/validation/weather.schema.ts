import { z } from 'zod';

/**
 * Query schema for the public weather endpoint (`GET /api/weather`).
 *
 * Exactly one location mode is required: either a `city` name or a
 * `lat` + `lon` pair (browser geolocation). `refresh=true` skips the
 * server-side cache and fetches fresh data from OpenWeatherMap.
 */
export const weatherQuerySchema = z
  .object({
    city: z
      .string({ error: 'City must be a string' })
      .trim()
      .min(1, 'City cannot be blank')
      .max(100, 'City must be at most 100 characters')
      .optional(),
    lat: z.coerce
      .number({ error: 'Latitude must be a number' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .optional(),
    lon: z.coerce
      .number({ error: 'Longitude must be a number' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .optional(),
    refresh: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
  })
  .strict()
  .refine((q) => q.city !== undefined || (q.lat !== undefined && q.lon !== undefined), {
    message: 'Provide a city or latitude/longitude.',
    path: ['city'],
  });

export type WeatherQueryRequest = z.infer<typeof weatherQuerySchema>;
