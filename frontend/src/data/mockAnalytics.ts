import type { TrendPoint, RiskDistribution, DashboardKpi } from '../types';

export const mockTrend: TrendPoint[] = [
  { date: 'Sep 27', incidents: 12, resolved: 9, reports: 22 },
  { date: 'Sep 28', incidents: 18, resolved: 11, reports: 31 },
  { date: 'Sep 29', incidents: 15, resolved: 13, reports: 27 },
  { date: 'Sep 30', incidents: 24, resolved: 14, reports: 45 },
  { date: 'Oct 01', incidents: 29, resolved: 19, reports: 52 },
  { date: 'Oct 02', incidents: 34, resolved: 22, reports: 61 },
  { date: 'Oct 03', incidents: 21, resolved: 12, reports: 38 },
];

export const mockRiskDistribution: RiskDistribution[] = [
  { name: 'Flood', value: 32, color: 'var(--blue)' },
  { name: 'Heat', value: 27, color: 'var(--brand-warm)' },
  { name: 'Air', value: 18, color: 'var(--mute)' },
  { name: 'Fire', value: 13, color: 'var(--brand)' },
  { name: 'Infra', value: 10, color: 'var(--tag)' },
];

export const mockWaterRisk = [
  { area: 'Yamuna East', level: 88 },
  { area: 'ITO', level: 76 },
  { area: 'Lajpat Nagar', level: 54 },
  { area: 'R.K. Puram', level: 41 },
  { area: 'Chanakyapuri', level: 22 },
];

export const mockHeatRisk = [
  { hour: '6a', temp: 31 },
  { hour: '9a', temp: 36 },
  { hour: '12p', temp: 42 },
  { hour: '3p', temp: 44 },
  { hour: '6p', temp: 39 },
  { hour: '9p', temp: 34 },
];

export const mockKpis: DashboardKpi[] = [
  { id: 'active', label: 'Active Incidents', value: 24, delta: 12.5 },
  { id: 'reports', label: 'Citizen Reports', value: 276, delta: 8.2 },
  { id: 'highrisk', label: 'High-Risk Zones', value: 7, delta: -4.1 },
  { id: 'resolved', label: 'Resolved (24h)', value: 58, delta: 15.3 },
];
