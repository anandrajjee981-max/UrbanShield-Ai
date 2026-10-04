import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { DEFAULT_WEATHER_CITY, fetchWeather } from '../store/slices/weatherSlice';

/** Matches the backend in-memory cache TTL (10 minutes). */
const STALE_MS = 10 * 60 * 1000;
/** How often the open tab checks whether dates need a live update. */
const LIVE_CHECK_MS = 60 * 1000;

/** Location-local calendar date (YYYY-MM-DD) for a timezone offset in seconds. */
function localToday(timezoneOffsetSeconds: number): string {
  return new Date(Date.now() + timezoneOffsetSeconds * 1000).toISOString().slice(0, 10);
}

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

  // Live-update the 3-day window without manual refresh: an open tab used to
  // keep showing old dates forever (initial fetch ran only once).
  // This re-fetches when the data is stale or when midnight rolls over in
  // the location's timezone so the Today date stays live (Today is the
  // last card of the [Day Before Yesterday, Yesterday, Today] window).
  const liveRef = useRef({
    hasData,
    loading: weather.loading,
    timezoneOffset: weather.timezoneOffset,
    todayDate: weather.forecast[weather.forecast.length - 1]?.date ?? null as string | null,
    lastUpdated: weather.lastUpdated,
    refresh,
  });
  liveRef.current = {
    hasData,
    loading: weather.loading,
    timezoneOffset: weather.timezoneOffset,
    todayDate: weather.forecast[weather.forecast.length - 1]?.date ?? null,
    lastUpdated: weather.lastUpdated,
    refresh,
  };

  useEffect(() => {
    const tick = () => {
      const s = liveRef.current;
      if (!s.hasData || s.loading) return;
      const stale =
        !s.lastUpdated || Date.now() - new Date(s.lastUpdated).getTime() > STALE_MS;
      const rolledOver =
        s.todayDate !== null && s.todayDate !== localToday(s.timezoneOffset);
      if (stale || rolledOver) s.refresh();
    };
    const id = setInterval(tick, LIVE_CHECK_MS);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, []);

  return { ...weather, hasData, searchCity, refresh };
}
