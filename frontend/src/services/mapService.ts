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

export function getCurrentPosition(timeoutMs = 12000): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
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
