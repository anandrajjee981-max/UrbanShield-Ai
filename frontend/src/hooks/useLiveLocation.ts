import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { getCurrentPosition, getIpLocation, reverseGeocode } from '../services/mapService';

export type LiveSource = 'gps' | 'ip' | 'city' | 'default';

/** Fallback when neither GPS nor a searched city is available. */
export const DEFAULT_LOC = { lat: 23.34, lon: 85.31, label: 'Ranchi' };

/** Shown while a GPS fix is being reverse-geocoded — never raw coordinates. */
export const LIVE_LOCATION_LABEL = 'Your current location';

export interface LiveLocation {
  lat: number;
  lon: number;
  /** Human-readable place name only ("Ranchi, India") — never coordinates. */
  label: string;
  source: LiveSource;
  locating: boolean;
  error: string | null;
  retryGps: () => void;
  /** Manual city fallback when GPS is blocked — beats the default city. */
  applyManual: (lat: number, lon: number, label: string) => void;
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
  const [gps, setGps] = useState<{ lat: number; lon: number; label: string | null } | null>(null);
  const [ip, setIp] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [manual, setManual] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  const askGps = useCallback(async (silent: boolean) => {
    setLocating(true);
    if (!silent) setError(null);
    let gpsCode: number | undefined;
    // 1) Browser GPS (needs permission + HTTPS/localhost).
    try {
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        throw new Error('insecure');
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        throw new Error('unsupported');
      }
      const [lat, lon] = await withTimeout(getCurrentPosition(), 9000);
      setGps({ lat, lon, label: null });
      setIp(null);
      setManual(null);
      setError(null);
      // Resolve the place name in the background so the UI shows a name
      // ("Ranchi, India"), never raw coordinates.
      void reverseGeocode(lat, lon).then((place) => {
        if (place) {
          setGps((prev) =>
            prev && prev.lat === lat && prev.lon === lon
              ? { ...prev, label: place.country ? `${place.city}, ${place.country}` : place.city }
              : prev,
          );
        }
      });
      return;
    } catch (e) {
      gpsCode = (e as { code?: number })?.code;
      // 2) GPS failed → network-IP location (no permission needed, works on
      // HTTP too). This is why "Use my location" keeps working.
      try {
        const found = await getIpLocation();
        setIp({ lat: found.lat, lon: found.lon, label: found.label });
        // Don't stay silent when GPS was blocked: otherwise the page looks
        // stuck on the default city with no explanation.
        if (gpsCode === 1) {
          setError('GPS blocked — showing IP location. Allow Location for this site, then tap Live Location again for exact weather.');
        } else {
          setError(null);
        }
        return;
      } catch {
        /* fall through to the message below */
      }
      if (!silent) {
        setError(
          gpsCode === 1
            ? 'GPS permission denied and IP lookup failed — allow Location for this site, then retry. Or type your city below.'
            : 'Could not detect your location — check your connection and retry. Or type your city below.',
        );
      }
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void askGps(true);
  }, [askGps]);

  const retryGps = () => void askGps(false);
  const applyManual = (lat: number, lon: number, label: string) => {
    setManual({ lat, lon, label });
    setError(null);
  };

  if (gps) {
    return {
      lat: gps.lat,
      lon: gps.lon,
      label: gps.label ?? LIVE_LOCATION_LABEL,
      source: 'gps',
      locating,
      error,
      retryGps,
      applyManual,
    };
  }
  if (ip) {
    return {
      lat: ip.lat,
      lon: ip.lon,
      label: ip.label,
      source: 'ip',
      locating,
      error,
      retryGps,
      applyManual,
    };
  }
  if (manual) {
    return {
      lat: manual.lat,
      lon: manual.lon,
      label: manual.label,
      source: 'city',
      locating,
      error,
      retryGps,
      applyManual,
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
      retryGps,
      applyManual,
    };
  }
  return {
    lat: DEFAULT_LOC.lat,
    lon: DEFAULT_LOC.lon,
    label: DEFAULT_LOC.label,
    source: 'default',
    locating,
    error,
    retryGps,
    applyManual,
  };
}
