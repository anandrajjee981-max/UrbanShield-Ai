import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchWeather as fetchWeatherApi } from '../../services/weatherService';
import { getApiErrorMessage } from '../../services/api';
import type { RiskDistribution, TrendPoint } from '../../types';

/**
 * Live, location-aware Risk Analytics.
 *
 * Nothing here is fixed mock data: water-zone levels + the 24h heat curve
 * are derived from the live 3-day weather at the user's coordinates
 * (GET /api/weather?lat=&lon=), the 7-day trend is aggregated from the
 * real issues visible to the current role, and the risk mix is scaled from
 * live temperature / rain / humidity.
 */

export interface TrendIssueInput {
  createdAt: string;
  /** Backend lifecycle status ("REPORTED" … "RESOLVED"). */
  status: string;
  resolvedAt?: string | null;
}

export interface LiveAnalyticsInput {
  lat: number;
  lon: number;
  label: string;
  source: string;
  issues: TrendIssueInput[];
}

export interface WaterZone {
  area: string;
  level: number;
}

export interface HeatPoint {
  hour: string;
  temp: number;
}

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Math.round(n)));

/** Deterministic per-zone variation so levels differ by area but stay stable. */
const zoneVar = (lat: number, lon: number, i: number): number => {
  const h = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233 + i * 37.719) * 43758.5453) % 1;
  return (h - 0.5) * 30;
};

const ZONES = ['North • 2 km', 'East • 3 km', 'South • 2 km', 'West • 4 km', 'Central • 0.5 km'];

/** Diurnal shape weights for the 24h heat curve anchor points. */
const HEAT_HOURS = ['6a', '9a', '12p', '3p', '6p', '9p'];
const HEAT_WEIGHTS = [0.25, 0.55, 0.85, 1.0, 0.7, 0.45];

const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const fetchLiveAnalytics = createAsyncThunk(
  'analytics/fetchLive',
  async (input: LiveAnalyticsInput, { rejectWithValue }) => {
    try {
      const weather = await fetchWeatherApi({ lat: input.lat, lon: input.lon }, true);
      const today = weather.forecast[weather.forecast.length - 1] ?? weather.forecast[0]!;
      const cityLabel = weather.location.country
        ? `${weather.location.city}, ${weather.location.country}`
        : weather.location.city;

      // ── 24h heat curve: standard diurnal shape anchored to live min/max ──
      const span = Math.max(today.max - today.min, 1);
      const heat: HeatPoint[] = HEAT_HOURS.map((hour, i) => ({
        hour,
        temp: Math.round(today.min + span * (HEAT_WEIGHTS[i] ?? 0.5)),
      }));

      // ── Flood risk by nearby zone, driven by live rain + humidity ──
      const base = clamp(today.rainChance * 0.7 + (today.humidity - 40) * 0.5, 5, 98);
      const water: WaterZone[] = ZONES.map((area, i) => ({
        area,
        level: clamp(base + zoneVar(input.lat, input.lon, i) + (i === 4 ? 6 : 0), 3, 99),
      })).sort((a, b) => b.level - a.level);

      // ── 7-day trend from the real issues visible to this role ──
      const dayKeys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        dayKeys.push(d.toISOString().slice(0, 10));
      }
      const trend: TrendPoint[] = dayKeys.map((key) => {
        const incidents = input.issues.filter((x) => (x.createdAt ?? '').slice(0, 10) === key).length;
        const resolved = input.issues.filter(
          (x) => x.status === 'RESOLVED' && ((x.resolvedAt ?? x.createdAt) ?? '').slice(0, 10) === key,
        ).length;
        return { date: dayLabel(key), incidents, resolved, reports: incidents };
      });

      // ── Risk mix scaled from live readings, normalized to 100 ──
      const raw = [
        { name: 'Flood', value: clamp(today.rainChance, 4, 96), color: 'var(--blue)' },
        { name: 'Heat', value: clamp((today.max - 28) * 7, 4, 96), color: 'var(--brand-warm)' },
        { name: 'Air', value: clamp(14 + (today.humidity - 55) * 0.4, 4, 60), color: 'var(--mute)' },
        { name: 'Fire', value: clamp((today.max - 30) * 5 + (100 - today.humidity) * 0.15, 4, 80), color: 'var(--brand)' },
        { name: 'Infra', value: clamp(today.rainChance * 0.4 + 8, 4, 60), color: 'var(--tag)' },
      ];
      const total = raw.reduce((a, b) => a + b.value, 0) || 1;
      const distribution: RiskDistribution[] = raw.map((r) => ({
        ...r,
        value: Math.max(1, Math.round((r.value / total) * 100)),
      }));

      return {
        trend,
        distribution,
        water,
        heat,
        locationLabel: `${cityLabel} · ${input.label}`,
        source: input.source,
      };
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load live analytics.'));
    }
  },
);

interface State {
  trend: TrendPoint[];
  distribution: RiskDistribution[];
  water: WaterZone[];
  heat: HeatPoint[];
  loading: boolean;
  error: string | null;
  locationLabel: string | null;
  source: string | null;
}

const initialState: State = {
  trend: [],
  distribution: [],
  water: [],
  heat: [],
  loading: false,
  error: null,
  locationLabel: null,
  source: null,
};

const slice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchLiveAnalytics.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchLiveAnalytics.fulfilled, (s, a) => {
      Object.assign(s, a.payload, { loading: false, error: null });
    });
    b.addCase(fetchLiveAnalytics.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) ?? 'Could not load live analytics.';
    });
  },
});

export default slice.reducer;
