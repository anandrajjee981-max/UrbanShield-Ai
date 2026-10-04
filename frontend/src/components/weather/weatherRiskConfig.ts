import type { WeatherDay } from '../../services/weatherService';

/**
 * Configurable thresholds for the UrbanShieldAI weather-risk indicators.
 * Edit the numbers here to retune risk levels — no UI code changes needed.
 *
 * All temperatures are °C, wind is km/h, rain chance and humidity are %.
 */

export interface RiskThresholds {
  heat: { high: number; moderate: number };
  rain: { high: number; moderate: number };
  wind: { high: number; moderate: number };
  humidity: { high: number; moderate: number };
}

export const WEATHER_RISK_THRESHOLDS: RiskThresholds = {
  heat: { high: 38, moderate: 32 },
  rain: { high: 70, moderate: 40 },
  wind: { high: 40, moderate: 20 },
  humidity: { high: 85, moderate: 70 },
};

export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface WeatherRisks {
  heat: RiskLevel;
  rain: RiskLevel;
  wind: RiskLevel;
  humidity: RiskLevel;
}

function level(value: number, t: { high: number; moderate: number }): RiskLevel {
  if (value >= t.high) return 'High';
  if (value >= t.moderate) return 'Moderate';
  return 'Low';
}

/** Derives simple risk indicators from a day's live API values. */
export function assessWeatherRisk(
  day: WeatherDay,
  thresholds: RiskThresholds = WEATHER_RISK_THRESHOLDS,
): WeatherRisks {
  return {
    heat: level(Math.max(day.temperature, day.max), thresholds.heat),
    rain: level(day.rainChance, thresholds.rain),
    wind: level(day.windSpeedKmh, thresholds.wind),
    humidity: level(day.humidity, thresholds.humidity),
  };
}
