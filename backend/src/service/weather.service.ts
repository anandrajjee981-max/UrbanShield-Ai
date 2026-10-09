import { logger } from '../utils/logger.js';

/**
 * Server-side weather for the assistant's 3-day civic forecast.
 *
 * This mirrors the provider the frontend weather widget already uses - Open-Meteo
 * (geocoding + forecast) - which is free and **keyless**, so no weather API key
 * has to be managed on the backend. If the provider is slow or down every helper
 * here returns null and the assistant says the data was unavailable instead of
 * inventing numbers.
 */

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const GEOCODING_TIMEOUT_MS = 8000;
const FORECAST_TIMEOUT_MS = 10000;

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light rain showers',
  81: 'Rain showers',
  82: 'Heavy rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

export interface WeatherForecastDay {
  date: string;
  condition: string;
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  precipitationChance: number | null;
  windMaxKph: number | null;
}

export interface WeatherForecast {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  days: WeatherForecastDay[];
}

interface GeocodingResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

interface OpenMeteoDailyResponse {
  timezone?: string;
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: Array<number | null>;
    temperature_2m_min: Array<number | null>;
    precipitation_probability_max: Array<number | null>;
    wind_speed_10m_max: Array<number | null>;
  };
}

/** fetch + JSON with a hard timeout; returns null instead of throwing. */
const fetchJson = async <T>(url: string, timeoutMs: number): Promise<T | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn('Weather provider returned an error', { status: response.status });
      return null;
    }

    return (await response.json()) as T;
  } catch {
    logger.warn('Weather provider request failed');
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const toNumber = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Resolves a free-text place ("Ranchi", "Patna, Bihar") to coordinates. */
export const geocodePlace = async (
  query: string,
): Promise<{ label: string; latitude: number; longitude: number; timezone: string | null } | null> => {
  const url = `${OPEN_METEO_GEOCODING_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const data = await fetchJson<GeocodingResponse>(url, GEOCODING_TIMEOUT_MS);
  const match = data?.results?.[0];

  if (!match) return null;

  const region = match.admin1?.trim() || match.country?.trim() || '';
  const label = region ? `${match.name}, ${region}` : match.name;

  return {
    label,
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: match.timezone ?? null,
  };
};

/** Fetches a 3-day forecast for coordinates. Returns null when the provider is unavailable. */
export const forecastForCoordinates = async (
  latitude: number,
  longitude: number,
  label: string,
): Promise<WeatherForecast | null> => {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'wind_speed_10m_max',
    ].join(','),
    forecast_days: '3',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  });

  const data = await fetchJson<OpenMeteoDailyResponse>(
    `${OPEN_METEO_FORECAST_URL}?${params.toString()}`,
    FORECAST_TIMEOUT_MS,
  );
  const daily = data?.daily;

  if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) return null;

  const days: WeatherForecastDay[] = daily.time.map((date, index) => ({
    date,
    condition: WEATHER_CODES[daily.weather_code[index] ?? 0] ?? 'Unknown',
    temperatureMaxC: toNumber(daily.temperature_2m_max[index]),
    temperatureMinC: toNumber(daily.temperature_2m_min[index]),
    precipitationChance: toNumber(daily.precipitation_probability_max[index]),
    windMaxKph: toNumber(daily.wind_speed_10m_max[index]),
  }));

  return {
    label,
    latitude,
    longitude,
    timezone: data?.timezone ?? null,
    days,
  };
};

/**
 * Convenience: geocode a place name then fetch its forecast.
 * Returns null when the place cannot be resolved or the provider is unavailable.
 */
export const forecastForPlace = async (query: string): Promise<WeatherForecast | null> => {
  const place = await geocodePlace(query);
  if (!place) return null;

  return forecastForCoordinates(place.latitude, place.longitude, place.label);
};
