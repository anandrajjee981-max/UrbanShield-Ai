import { api, type ApiSuccess } from './api';

/**
 * Frontend abstraction for the 3-day weather feature.
 *
 * The browser only ever talks to our own backend (`GET /api/weather`).
 * The OpenWeatherMap API key lives exclusively on the server
 * (backend `OPENWEATHER_API_KEY`) and never appears in components,
 * Redux state, localStorage or any frontend bundle.
 */

// ---------------------------------------------------------------------------
// Normalized shapes (mirror backend/src/service/weather.service.ts)
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
  /** "Day Before Yesterday" | "Yesterday" | "Today". */
  label: string;
  /** Local weekday, e.g. "Sunday". */
  weekday: string;
  temperature: number;
  feelsLike: number;
  min: number;
  max: number;
  condition: string;
  /** OpenWeatherMap icon code, e.g. "01d". */
  icon: string;
  humidity: number;
  /** km/h (converted server side from the API's m/s). */
  windSpeedKmh: number;
  /** Degrees, 0-360. */
  windDeg: number;
  /** Compass point, e.g. "NE". */
  windDirection: string;
  pressure: number;
  /** Meters. */
  visibility: number;
  /** Chance of rain in percent. */
  rainChance: number;
  /** Unix seconds; present on Today when the API reports them. */
  sunrise: number | null;
  sunset: number | null;
}

export interface WeatherResponse {
  location: WeatherLocation;
  timezoneOffset: number;
  forecast: WeatherDay[];
}

export type WeatherQueryInput = { city: string } | { lat: number; lon: number };

// ---------------------------------------------------------------------------
// API calls (backend proxy — no OpenWeatherMap key involved client side)
// ---------------------------------------------------------------------------

/** Official OpenWeatherMap icon CDN URL for an icon code. No key required. */
export function weatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

export async function fetchWeather(
  query: WeatherQueryInput,
  refresh = false,
): Promise<WeatherResponse> {
  const params: Record<string, string | number | boolean> = { refresh };
  if ('city' in query) params.city = query.city;
  else {
    params.lat = query.lat;
    params.lon = query.lon;
  }
  const res = await api.get<ApiSuccess<{ weather: WeatherResponse }>>('/weather', { params });
  return res.data.data.weather;
}
