import { env } from '../config/env.js';
import { AppError, BadRequestError, NotFoundError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

/**
 * Server-side OpenWeatherMap integration behind GET /api/weather.
 *
 * The API key lives only here (process env on the server). The browser never
 * calls OpenWeatherMap directly, so the key cannot leak through components,
 * Redux state, localStorage or the network tab - it only travels server to
 * server inside the `appid` query parameter.
 *
 * Two OpenWeatherMap endpoints are combined:
 *  - /data/2.5/weather  - current observation (also carries timezone, sunrise,
 *    sunset and the canonical city/country spelling)
 *  - /data/2.5/forecast - 5-day / 3-hour entries used to build Tomorrow and
 *    Day After Tomorrow (and to enrich Today with min/max + rain chance)
 *
 * Forecast entries are grouped by *local* calendar date (UTC timestamp plus
 * the location's `timezone` offset) and aggregated per day - never just the
 * first three raw records.
 */

// ---------------------------------------------------------------------------
// Public (normalized) shapes - the only weather data the frontend ever sees
// ---------------------------------------------------------------------------

export interface WeatherLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface WeatherDay {
  /** ISO calendar date in the location's timezone, e.g. "2026-10-04". */
  date: string;
  /** "Today" | "Tomorrow" | "Day After Tomorrow". */
  label: string;
  /** Local weekday, e.g. "Sunday". */
  weekday: string;
  temperature: number;
  feelsLike: number;
  min: number;
  max: number;
  condition: string;
  /** OpenWeatherMap icon code, e.g. "01d" (frontend builds the image URL). */
  icon: string;
  humidity: number;
  /** km/h, converted from the API's m/s. */
  windSpeedKmh: number;
  /** Degrees, 0-360. */
  windDeg: number;
  /** Compass point, e.g. "NE". */
  windDirection: string;
  pressure: number;
  /** Meters, as reported by the API. */
  visibility: number;
  /** Chance of rain in percent (max `pop` across the day's entries). */
  rainChance: number;
  /** Unix seconds, present on Today when the API reports them. */
  sunrise: number | null;
  sunset: number | null;
}

export interface WeatherResponse {
  location: WeatherLocation;
  timezoneOffset: number;
  forecast: [WeatherDay, WeatherDay, WeatherDay];
}

// ---------------------------------------------------------------------------
// Raw OpenWeatherMap shapes (only the fields we read)
// ---------------------------------------------------------------------------

interface OwmWeather {
  main: string;
  description: string;
  icon: string;
}

interface OwmCurrent {
  coord: { lon: number; lat: number };
  weather: OwmWeather[];
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; pressure: number; humidity: number };
  visibility?: number;
  wind?: { speed?: number; deg?: number };
  sys?: { country?: string; sunrise?: number; sunset?: number };
  timezone?: number;
  dt: number;
  name?: string;
}

interface OwmForecastEntry {
  dt: number;
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; pressure: number; humidity: number };
  weather: OwmWeather[];
  wind?: { speed?: number; deg?: number };
  visibility?: number;
  pop?: number;
}

interface OwmForecast {
  list: OwmForecastEntry[];
  city?: { name?: string; country?: string; timezone?: number; coord?: { lat: number; lon: number } };
}

export interface WeatherQuery {
  city?: string;
  lat?: number;
  lon?: number;
  /** Bypass the server-side cache and fetch fresh data. */
  refresh?: boolean;
}

// ---------------------------------------------------------------------------
// Tiny in-memory cache (per location, 10 minutes) so repeated Home preview +
// Weather page visits do not burn the OpenWeatherMap rate limit.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expires: number; data: WeatherResponse }>();

const cacheKey = (q: WeatherQuery): string =>
  q.city ? `city:${q.city.trim().toLowerCase()}` : `geo:${q.lat?.toFixed(3)},${q.lon?.toFixed(3)}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const toCompass = (deg: number): string => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16] ?? 'N';

/** ISO date (YYYY-MM-DD) of a UTC timestamp shifted into the location's day. */
const localDateKey = (utcSeconds: number, tzOffsetSeconds: number): string =>
  new Date((utcSeconds + tzOffsetSeconds) * 1000).toISOString().slice(0, 10);

/** Weekday for an already-local ISO calendar date (YYYY-MM-DD). */
const weekdayOf = (dateKey: string): string =>
  new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round0 = (n: number): number => Math.round(n);
const avg = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Most frequent condition; ties break towards the midday entry. */
const dominantCondition = (entries: OwmForecastEntry[]): OwmWeather => {
  const counts = new Map<string, { n: number; w: OwmWeather; midday: boolean }>();
  for (const e of entries) {
    const w = e.weather[0] ?? { main: 'Unknown', description: 'unknown', icon: '02d' };
    const hour = new Date(e.dt * 1000).getUTCHours();
    const prev = counts.get(w.main);
    counts.set(w.main, {
      n: (prev?.n ?? 0) + 1,
      w,
      midday: prev?.midday ?? (hour >= 9 && hour <= 15),
    });
  }
  const ranked = [...counts.values()].sort((a, b) => b.n - a.n || Number(b.midday) - Number(a.midday));
  return ranked[0]?.w ?? { main: 'Unknown', description: 'unknown', icon: '02d' };
};

// ---------------------------------------------------------------------------
// OpenWeatherMap fetch with safe error mapping (never leaks upstream detail)
// ---------------------------------------------------------------------------

const owmFetch = async <T>(path: string, params: URLSearchParams): Promise<T> => {
  const key = env.OPENWEATHER_API_KEY;
  if (!key) {
    throw new AppError(503, 'Weather data is not configured yet. Please try again later.', 'WEATHER_NOT_CONFIGURED');
  }
  params.set('appid', key);
  params.set('units', 'metric');

  let res: Response;
  try {
    res = await fetch(`https://api.openweathermap.org/data/2.5/${path}?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    logger.warn('OpenWeatherMap unreachable', { error: error instanceof Error ? error.message : 'unknown' });
    throw new AppError(503, 'Unable to load weather data. Please try again.', 'WEATHER_UNAVAILABLE');
  }

  if (res.ok) return (await res.json()) as T;

  if (res.status === 404) {
    throw new NotFoundError('City not found. Check the spelling and try again.', 'CITY_NOT_FOUND');
  }
  if (res.status === 401) {
    logger.error('OpenWeatherMap rejected the server API key');
    throw new AppError(503, 'Unable to load weather data. Please try again.', 'WEATHER_UPSTREAM_ERROR');
  }
  if (res.status === 429) {
    throw new AppError(429, 'Weather service is busy. Please try again in a minute.', 'WEATHER_RATE_LIMITED');
  }
  logger.warn('OpenWeatherMap unexpected status', { status: res.status });
  throw new AppError(503, 'Unable to load weather data. Please try again.', 'WEATHER_UPSTREAM_ERROR');
};

// ---------------------------------------------------------------------------
// Main entry: fetch, group by local date, aggregate exactly 3 days
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Today', 'Tomorrow', 'Day After Tomorrow'] as const;

export const getThreeDayWeather = async (query: WeatherQuery): Promise<WeatherResponse> => {
  if (!query.city && (query.lat === undefined || query.lon === undefined)) {
    throw new BadRequestError('Provide a city or latitude/longitude.', 'WEATHER_QUERY_REQUIRED');
  }

  const key = cacheKey(query);
  const cached = cache.get(key);
  if (!query.refresh && cached && cached.expires > Date.now()) return cached.data;

  const params = new URLSearchParams();
  if (query.city) params.set('q', query.city.trim());
  else {
    params.set('lat', String(query.lat));
    params.set('lon', String(query.lon));
  }

  const [current, forecast] = await Promise.all([
    owmFetch<OwmCurrent>('weather', new URLSearchParams(params)),
    owmFetch<OwmForecast>('forecast', new URLSearchParams(params)),
  ]);

  const tz = current.timezone ?? forecast.city?.timezone ?? 0;
  const cityName = current.name || forecast.city?.name || query.city?.trim() || 'Current location';
  const country = current.sys?.country || forecast.city?.country || '';
  const latitude = current.coord?.lat ?? forecast.city?.coord?.lat ?? query.lat ?? 0;
  const longitude = current.coord?.lon ?? forecast.city?.coord?.lon ?? query.lon ?? 0;

  const todayKey = localDateKey(current.dt, tz);
  const dayKeys = [0, 1, 2].map((offset) => {
    const d = new Date(`${todayKey}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  });

  // Group forecast entries by local calendar date.
  const byDate = new Map<string, OwmForecastEntry[]>();
  for (const entry of forecast.list ?? []) {
    const k = localDateKey(entry.dt, tz);
    const arr = byDate.get(k) ?? [];
    arr.push(entry);
    byDate.set(k, arr);
  }

  const forecastDays: WeatherDay[] = dayKeys.map((dateKey, i) => {
    let entries = byDate.get(dateKey) ?? [];
    if (entries.length === 0) {
      // Fallback: nearest entries so a day is never empty (API edge cases).
      const all = forecast.list ?? [];
      entries = all.length > 0 ? [all.reduce((a, b) => (Math.abs(b.dt - current.dt - i * 86400) < Math.abs(a.dt - current.dt - i * 86400) ? b : a))] : [];
    }
    const isToday = i === 0;

    const temps = entries.map((e) => e.main.temp);
    const min = Math.min(current.main.temp_min, ...entries.map((e) => e.main.temp_min));
    const max = Math.max(current.main.temp_max, ...entries.map((e) => e.main.temp_max));
    const windiest = entries.reduce<OwmForecastEntry | null>((best, e) =>
      (e.wind?.speed ?? 0) > (best?.wind?.speed ?? -1) ? e : best, null);
    const dom = isToday && entries.length === 0
      ? (current.weather[0] ?? { main: 'Unknown', description: 'unknown', icon: '02d' })
      : dominantCondition([
          ...entries,
          ...(isToday && current.weather[0]
            ? [{ dt: current.dt, main: current.main, weather: current.weather, wind: current.wind } as OwmForecastEntry]
            : []),
        ]);

    const windSpeedMs = isToday ? (current.wind?.speed ?? windiest?.wind?.speed ?? 0) : (windiest?.wind?.speed ?? 0);
    const windDegVal = isToday
      ? (current.wind?.deg ?? windiest?.wind?.deg ?? 0)
      : (windiest?.wind?.deg ?? 0);

    // Representative temperature: the live reading today, otherwise the
    // entry closest to local midday (fallback: daily mean).
    const midday = entries.length === 0
      ? null
      : entries.reduce((a, b) => {
          const hourOf = (e: OwmForecastEntry): number =>
            Number(new Date((e.dt + tz) * 1000).toISOString().slice(11, 13));
          return Math.abs(hourOf(b) - 12) < Math.abs(hourOf(a) - 12) ? b : a;
        });

    return {
      date: dateKey,
      label: DAY_LABELS[i] ?? `Day ${i + 1}`,
      weekday: weekdayOf(dateKey),
      temperature: round1(isToday ? current.main.temp : (midday?.main.temp ?? avg(temps))),
      feelsLike: round1(isToday ? current.main.feels_like : avg(entries.map((e) => e.main.feels_like))),
      min: round1(Number.isFinite(min) ? min : avg(temps)),
      max: round1(Number.isFinite(max) ? max : avg(temps)),
      condition: dom.description.replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: isToday && entries.length === 0 ? (current.weather[0]?.icon ?? dom.icon) : dom.icon,
      humidity: round0(isToday && entries.length === 0 ? current.main.humidity : avg(entries.map((e) => e.main.humidity)) || current.main.humidity),
      windSpeedKmh: round1(windSpeedMs * 3.6),
      windDeg: round0(windDegVal),
      windDirection: toCompass(windDegVal),
      pressure: round0(avg(entries.map((e) => e.main.pressure)) || current.main.pressure),
      visibility: round0(avg(entries.map((e) => e.visibility ?? current.visibility ?? 10000))),
      rainChance: round0(Math.max(0, ...entries.map((e) => (e.pop ?? 0) * 100))),
      sunrise: isToday ? (current.sys?.sunrise ?? null) : null,
      sunset: isToday ? (current.sys?.sunset ?? null) : null,
    };
  });

  const response: WeatherResponse = {
    location: { city: cityName, country, latitude: round1(latitude * 100) / 100, longitude: round1(longitude * 100) / 100 },
    timezoneOffset: tz,
    forecast: [forecastDays[0]!, forecastDays[1]!, forecastDays[2]!],
  };

  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data: response });
  // Bound memory: drop the oldest entries past 200 locations.
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return response;
};
