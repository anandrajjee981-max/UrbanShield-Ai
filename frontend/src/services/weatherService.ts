import axios from 'axios';

export interface WeatherLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface WeatherDay {
  date: string;
  label: string;
  weekday: string;
  temperature: number;
  feelsLike: number;
  min: number;
  max: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeedKmh: number;
  windDeg: number;
  windDirection: string;
  pressure: number;
  visibility: number;
  rainChance: number;
  sunrise: number | null;
  sunset: number | null;
}

export interface WeatherResponse {
  location: WeatherLocation;
  timezoneOffset: number;
  forecast: WeatherDay[];
}

export type WeatherQueryInput = { city: string } | { lat: number; lon: number };

interface GeocodingResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

interface OpenMeteoResponse {
  utc_offset_seconds: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    pressure_msl: number;
    visibility: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: Array<number | null>;
    apparent_temperature_mean: Array<number | null>;
    precipitation_probability_max: Array<number | null>;
    sunrise: string[];
    sunset: string[];
    wind_speed_10m_max: number[];
    wind_direction_10m_dominant: number[];
  };
  hourly: {
    time: string[];
    relative_humidity_2m: Array<number | null>;
    pressure_msl: Array<number | null>;
    visibility: Array<number | null>;
    apparent_temperature: Array<number | null>;
  };
}

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const WEATHER_CODES: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear sky', icon: '01d' },
  1: { condition: 'Mainly clear', icon: '02d' },
  2: { condition: 'Partly cloudy', icon: '03d' },
  3: { condition: 'Overcast', icon: '04d' },
  45: { condition: 'Fog', icon: '50d' },
  48: { condition: 'Rime fog', icon: '50d' },
  51: { condition: 'Light drizzle', icon: '09d' },
  53: { condition: 'Drizzle', icon: '09d' },
  55: { condition: 'Heavy drizzle', icon: '09d' },
  56: { condition: 'Freezing drizzle', icon: '09d' },
  57: { condition: 'Heavy freezing drizzle', icon: '09d' },
  61: { condition: 'Light rain', icon: '10d' },
  63: { condition: 'Rain', icon: '10d' },
  65: { condition: 'Heavy rain', icon: '10d' },
  66: { condition: 'Freezing rain', icon: '13d' },
  67: { condition: 'Heavy freezing rain', icon: '13d' },
  71: { condition: 'Light snow', icon: '13d' },
  73: { condition: 'Snow', icon: '13d' },
  75: { condition: 'Heavy snow', icon: '13d' },
  77: { condition: 'Snow grains', icon: '13d' },
  80: { condition: 'Light rain showers', icon: '09d' },
  81: { condition: 'Rain showers', icon: '09d' },
  82: { condition: 'Heavy rain showers', icon: '09d' },
  85: { condition: 'Snow showers', icon: '13d' },
  86: { condition: 'Heavy snow showers', icon: '13d' },
  95: { condition: 'Thunderstorm', icon: '11d' },
  96: { condition: 'Thunderstorm with hail', icon: '11d' },
  99: { condition: 'Severe thunderstorm with hail', icon: '11d' },
};

function valueAt(values: Array<number | null>, index: number, fallback: number): number {
  const value = values[index];
  return typeof value === 'number' ? value : fallback;
}

function averageForDate(
  values: Array<number | null>,
  times: string[],
  date: string,
  fallback: number,
): number {
  const matching = values.filter((value, index) => times[index]?.startsWith(date) && value !== null);
  if (matching.length === 0) return fallback;
  return matching.reduce<number>((sum, value) => sum + (value ?? 0), 0) / matching.length;
}

function compassDirection(degrees: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
    Math.round(degrees / 45) % 8
  ]!;
}

function toUnixTime(localTime: string | undefined, timezoneOffset: number): number | null {
  if (!localTime) return null;
  const localAsUtc = Date.parse(`${localTime}Z`);
  return Number.isNaN(localAsUtc) ? null : Math.floor(localAsUtc / 1000) - timezoneOffset;
}

function dayLabel(date: string, today: string, tomorrow: string): string {
  if (date === today) return 'Today';
  if (date === tomorrow) return 'Tomorrow';
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
}

function localDateAtOffset(utcDate: Date, offsetSeconds: number): string {
  return new Date(utcDate.getTime() + offsetSeconds * 1000).toISOString().slice(0, 10);
}

function buildForecast(data: OpenMeteoResponse, location: WeatherLocation): WeatherResponse {
  const timezoneOffset = data.utc_offset_seconds;
  const today = localDateAtOffset(new Date(), timezoneOffset);
  const tomorrow = localDateAtOffset(new Date(Date.now() + 24 * 60 * 60 * 1000), timezoneOffset);
  const currentDate = data.current.time.slice(0, 10);

  const forecast = data.daily.time.map((date, index): WeatherDay => {
    const minimum = data.daily.temperature_2m_min[index] ?? 0;
    const maximum = data.daily.temperature_2m_max[index] ?? minimum;
    const isCurrentDay = date === currentDate;
    const weatherCode = isCurrentDay
      ? data.current.weather_code
      : data.daily.weather_code[index] ?? 0;
    const weather = WEATHER_CODES[weatherCode] ?? { condition: 'Unknown', icon: '01d' };
    const meanTemperature = valueAt(data.daily.temperature_2m_mean, index, (minimum + maximum) / 2);

    return {
      date,
      label: dayLabel(date, today, tomorrow),
      weekday: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: 'UTC',
      }),
      temperature: isCurrentDay ? data.current.temperature_2m : meanTemperature,
      feelsLike: isCurrentDay
        ? data.current.apparent_temperature
        : valueAt(data.daily.apparent_temperature_mean, index, meanTemperature),
      min: minimum,
      max: maximum,
      condition: weather.condition,
      icon: weather.icon,
      humidity: isCurrentDay
        ? data.current.relative_humidity_2m
        : averageForDate(data.hourly.relative_humidity_2m, data.hourly.time, date, 0),
      windSpeedKmh: isCurrentDay
        ? data.current.wind_speed_10m
        : data.daily.wind_speed_10m_max[index] ?? 0,
      windDeg: isCurrentDay
        ? data.current.wind_direction_10m
        : data.daily.wind_direction_10m_dominant[index] ?? 0,
      windDirection: compassDirection(
        isCurrentDay
          ? data.current.wind_direction_10m
          : data.daily.wind_direction_10m_dominant[index] ?? 0,
      ),
      pressure: isCurrentDay
        ? data.current.pressure_msl
        : averageForDate(data.hourly.pressure_msl, data.hourly.time, date, 0),
      visibility: isCurrentDay
        ? data.current.visibility
        : averageForDate(data.hourly.visibility, data.hourly.time, date, 0),
      rainChance: data.daily.precipitation_probability_max[index] ?? 0,
      sunrise: toUnixTime(data.daily.sunrise[index], timezoneOffset),
      sunset: toUnixTime(data.daily.sunset[index], timezoneOffset),
    };
  });

  return { location, timezoneOffset, forecast };
}

async function resolveLocation(query: WeatherQueryInput): Promise<WeatherLocation> {
  if ('city' in query) {
    const { data } = await axios.get<GeocodingResponse>(OPEN_METEO_GEOCODING_URL, {
      params: { name: query.city, count: 1, language: 'en', format: 'json' },
      timeout: 12000,
    });
    const match = data.results?.[0];
    if (!match) throw new Error(`No weather location found for "${query.city}".`);
    return {
      city: match.name,
      country: match.country,
      latitude: match.latitude,
      longitude: match.longitude,
    };
  }
  return {
    city: 'Current location',
    country: '',
    latitude: query.lat,
    longitude: query.lon,
  };
}

export function weatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

export async function fetchWeather(query: WeatherQueryInput, _refresh = false): Promise<WeatherResponse> {
  try {
    const location = await resolveLocation(query);
    const { data } = await axios.get<OpenMeteoResponse>(OPEN_METEO_FORECAST_URL, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'weather_code',
          'wind_speed_10m',
          'wind_direction_10m',
          'pressure_msl',
          'visibility',
        ].join(','),
        hourly: 'relative_humidity_2m,pressure_msl,visibility',
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'temperature_2m_mean',
          'apparent_temperature_mean',
          'precipitation_probability_max',
          'sunrise',
          'sunset',
          'wind_speed_10m_max',
          'wind_direction_10m_dominant',
        ].join(','),
        forecast_days: 3,
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        timezone: 'auto',
      },
      timeout: 12000,
    });
    return buildForecast(data, location);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Weather request timed out. Please try again.');
      }
      if (error.response) {
        throw new Error(`Weather provider returned HTTP ${error.response.status}. Please try again later.`);
      }
      throw new Error('Cannot reach the weather provider. Check your internet connection and try again.');
    }
    throw error;
  }
}
