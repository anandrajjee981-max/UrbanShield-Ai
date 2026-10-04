import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { getCurrentPosition } from '../services/mapService';

export type LiveSource = 'gps' | 'city' | 'default';

/** Fallback when neither GPS nor a searched city is available. */
export const DEFAULT_LOC = { lat: 22.8, lon: 86.18, label: 'Jamshedpur' };

export interface LiveLocation {
  lat: number;
  lon: number;
  /** Human label for the header ("GPS 22.80, 86.18" or the city name). */
  label: string;
  source: LiveSource;
  locating: boolean;
  error: string | null;
  retryGps: () => void;
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

/**
 * Live location for location-aware features (Risk Analytics…).
 * Tries browser GPS first, falls back to the weather city's coordinates,
 * then to the default city. `retryGps` re-asks the browser on demand.
 */
export function useLiveLocation(): LiveLocation {
  const weatherLoc = useAppSelector((s) => s.weather.location);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  const askGps = useCallback(async (silent: boolean) => {
    setLocating(true);
    if (!silent) setError(null);
    try {
      const [lat, lon] = await withTimeout(getCurrentPosition(), 9000);
      setGps({ lat, lon });
      setError(null);
    } catch {
      // Permission denied / unavailable / timeout → keep fallback quietly on
      // auto-attempt, loudly on manual retry.
      if (!silent) setError('Could not access GPS — using city location instead. Check browser permission.');
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void askGps(true);
  }, [askGps]);

  if (gps) {
    return {
      lat: gps.lat,
      lon: gps.lon,
      label: `GPS ${gps.lat.toFixed(2)}, ${gps.lon.toFixed(2)}`,
      source: 'gps',
      locating,
      error,
      retryGps: () => void askGps(false),
    };
  }
  if (weatherLoc) {
    return {
      lat: weatherLoc.latitude,
      lon: weatherLoc.longitude,
      label: weatherLoc.country ? `${weatherLoc.city}, ${weatherLoc.country}` : weatherLoc.city,
      source: 'city',
      locating,
      error,
      retryGps: () => void askGps(false),
    };
  }
  return {
    lat: DEFAULT_LOC.lat,
    lon: DEFAULT_LOC.lon,
    label: DEFAULT_LOC.label,
    source: 'default',
    locating,
    error,
    retryGps: () => void askGps(false),
  };
}
