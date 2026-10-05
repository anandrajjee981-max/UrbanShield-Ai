import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { DEFAULT_WEATHER_CITY, fetchWeather } from '../store/slices/weatherSlice';

/**
 * Reusable hook for the 3-day weather feature.
 * Owns the fetch lifecycle (city search, refresh, initial load) while the
 * Redux slice owns the cached state shared by the Home preview + Weather page.
 *
 * No auto-refresh: data loads once on mount, then only on explicit
 * searchCity / refresh / live-coords dispatch from the page. Previously an
 * interval + window-focus listener re-fetched when stale, which kept
 * overwriting the live-location view and spammed the backend.
 */
export function useWeather(autoLoadCity: string = DEFAULT_WEATHER_CITY) {
  const dispatch = useAppDispatch();
  const weather = useAppSelector((s) => s.weather);

  const hasData = weather.forecast.length > 0;

  useEffect(() => {
    if (!hasData && !weather.loading && !weather.error) {
      dispatch(fetchWeather({ city: autoLoadCity }));
    }
  }, [dispatch, autoLoadCity, hasData, weather.loading, weather.error]);

  const searchCity = useCallback(
    (city: string) => dispatch(fetchWeather({ city })),
    [dispatch],
  );

  const refresh = useCallback(() => {
    // Preserve live coords: re-fetching by city name after a GPS/IP lookup
    // loses precision (reverse-geocoded city != exact coords), so refresh the
    // exact displayed location instead.
    if (weather.location) {
      dispatch(
        fetchWeather({ lat: weather.location.latitude, lon: weather.location.longitude, refresh: true }),
      );
    } else {
      dispatch(fetchWeather({ city: weather.queryLabel, refresh: true }));
    }
  }, [dispatch, weather.location, weather.queryLabel]);

  return { ...weather, hasData, searchCity, refresh };
}
