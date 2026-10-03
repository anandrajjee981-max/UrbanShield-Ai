import axios from 'axios';

// Optional: Open-Meteo public weather API (no key required) — external service only.
export interface WeatherNow { temperature: number; weathercode: number; time: string; }

export async function getWeather(lat: number, lng: number): Promise<WeatherNow | null> {
  try {
    const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: { latitude: lat, longitude: lng, current_weather: true },
    });
    return data.current_weather as WeatherNow;
  } catch {
    return null;
  }
}
