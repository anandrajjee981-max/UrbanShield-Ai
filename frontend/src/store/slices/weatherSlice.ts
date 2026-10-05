import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchWeather as fetchWeatherApi, type WeatherResponse } from '../../services/weatherService';
import { getApiErrorMessage } from '../../services/api';

/** Default city shown on first visit (also the placeholder in city search). */
export const DEFAULT_WEATHER_CITY = 'Ranchi';

export interface WeatherQuery {
  city?: string;
  lat?: number;
  lon?: number;
  refresh?: boolean;
}

interface WeatherState {
  location: WeatherResponse['location'] | null;
  timezoneOffset: number;
  forecast: WeatherResponse['forecast'];
  /** The city (or "lat,lon") the displayed data belongs to. */
  queryLabel: string;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: WeatherState = {
  location: null,
  timezoneOffset: 0,
  forecast: [],
  queryLabel: DEFAULT_WEATHER_CITY,
  loading: false,
  error: null,
  lastUpdated: null,
};

export const fetchWeather = createAsyncThunk(
  'weather/fetch',
  async (input: WeatherQuery = {}) => {
    const { city, lat, lon, refresh = false } = input;
    const query =
      city && city.trim()
        ? { city: city.trim() }
        : lat !== undefined && lon !== undefined
          ? { lat, lon }
          : { city: DEFAULT_WEATHER_CITY };
    const weather = await fetchWeatherApi(query, refresh);
    return { weather, query };
  },
);

const slice = createSlice({
  name: 'weather',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchWeather.pending, (s, action) => {
      s.loading = true;
      s.error = null;
      const arg = action.meta.arg ?? {};
      if (arg.city) s.queryLabel = arg.city.trim();
      else if (arg.lat !== undefined && arg.lon !== undefined) {
        s.queryLabel = `${arg.lat.toFixed(2)}, ${arg.lon.toFixed(2)}`;
      }
    });
    b.addCase(fetchWeather.fulfilled, (s, a) => {
      s.loading = false;
      s.error = null;
      s.location = a.payload.weather.location;
      s.timezoneOffset = a.payload.weather.timezoneOffset;
      s.forecast = a.payload.weather.forecast;
      s.lastUpdated = new Date().toISOString();
    });
    b.addCase(fetchWeather.rejected, (s, a) => {
      s.loading = false;
      s.error = getApiErrorMessage(
        a.error,
        'Unable to load weather data. Please try again.',
      );
    });
  },
});

export default slice.reducer;
