import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { DEFAULT_WEATHER_CITY, fetchWeather } from '../store/slices/weatherSlice';

/**
 * Reusable hook for the 3-day weather feature.
 * Owns the fetch lifecycle (city search, refresh, initial load) while the
 * Redux slice owns the cached state shared by the Home preview + Weather page.
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
    const current = weather.location?.city ?? weather.queryLabel;
    dispatch(fetchWeather({ city: current, refresh: true }));
  }, [dispatch, weather.location?.city, weather.queryLabel]);

  return { ...weather, hasData, searchCity, refresh };
}
