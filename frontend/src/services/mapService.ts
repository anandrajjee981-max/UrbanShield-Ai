// Consumes real map tiles (OpenStreetMap) + Nominatim geocoding — external public APIs only.
import axios from 'axios';

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface GeocodeResult { display_name: string; lat: string; lon: string; }

export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  const { data } = await axios.get<GeocodeResult[]>('https://nominatim.openstreetmap.org/search', {
    params: { q: query, format: 'json', limit: 5 },
  });
  return data;
}

/**
 * Approximate location from the network IP (free ipwho.is API, no key).
 * Needs no permission and works on plain HTTP too — used when browser
 * GPS is blocked/unavailable. City-level accuracy.
 */
export interface IpLocateResult { lat: number; lon: number; label: string }

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function getIpLocation(timeoutMs = 8000): Promise<IpLocateResult> {
  // Provider 1: ipwho.is (HTTPS, no key).
  try {
    const j = (await fetchJson('https://ipwho.is/', timeoutMs)) as {
      success?: boolean;
      latitude?: number;
      longitude?: number;
      city?: string;
      country?: string;
    };
    if (j.success !== false && typeof j.latitude === 'number' && typeof j.longitude === 'number') {
      const label = [j.city, j.country].filter(Boolean).join(', ') || 'IP location';
      return { lat: j.latitude, lon: j.longitude, label };
    }
    throw new Error('no coordinates');
  } catch {
    /* fall through to provider 2 */
  }
  try {
    // Provider 2: geolocation-db.com (HTTPS, no key) — some networks or
    // tracker-blockers break the first provider.
    const j = (await fetchJson('https://geolocation-db.com/json/', timeoutMs)) as {
      latitude?: number;
      longitude?: number;
      city?: string | null;
      country_name?: string | null;
    };
    if (typeof j.latitude !== 'number' || typeof j.longitude !== 'number') {
      throw new Error('IP lookup returned no coordinates');
    }
    const label = [j.city, j.country_name].filter(Boolean).join(', ') || 'IP location';
    return { lat: j.latitude, lon: j.longitude, label };
  } catch {
    /* fall through to provider 3 */
  }
  // Provider 3: ipapi.co (HTTPS, no key, CORS-enabled).
  const j = (await fetchJson('https://ipapi.co/json/', timeoutMs)) as {
    latitude?: number;
    longitude?: number;
    city?: string | null;
    country_name?: string | null;
  };
  if (typeof j.latitude !== 'number' || typeof j.longitude !== 'number') {
    throw new Error('IP lookup returned no coordinates');
  }
  const label = [j.city, j.country_name].filter(Boolean).join(', ') || 'IP location';
  return { lat: j.latitude, lon: j.longitude, label };
}

/**
 * Place name for GPS coordinates (free BigDataCloud client API, no key).
 * Returns null when unreachable — callers must fall back to a plain name
 * label, never raw coordinates.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  timeoutMs = 8000,
): Promise<{ city: string; country: string } | null> {
  try {
    const j = (await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      timeoutMs,
    )) as { city?: string; locality?: string; countryName?: string };
    const city = j.city || j.locality || '';
    if (!city) return null;
    return { city, country: j.countryName ?? '' };
  } catch {
    return null;
  }
}

export function getCurrentPosition(timeoutMs = 12000): Promise<[number, number]> {  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    let done = false;
    const timer = window.setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error('Location request timed out'));
      }
    }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve([p.coords.latitude, p.coords.longitude]);
      },
      (e) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        reject(e);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}
