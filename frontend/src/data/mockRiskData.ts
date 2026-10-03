import type { RiskZone } from '../types';

export const mockRiskZones: RiskZone[] = [
  { id: 'RZ-1', name: 'Yamuna Floodplain East', lat: 28.61, lng: 77.25, radiusKm: 3.5, riskLevel: 'critical', riskType: 'flood', score: 92, population: 185000, updatedAt: '2026-10-03T06:00:00Z' },
  { id: 'RZ-2', name: 'Central Heat Island', lat: 28.625, lng: 77.218, radiusKm: 2.8, riskLevel: 'high', riskType: 'heat', score: 81, population: 320000, updatedAt: '2026-10-03T06:00:00Z' },
  { id: 'RZ-3', name: 'Okhla Industrial Belt', lat: 28.599, lng: 77.232, radiusKm: 1.8, riskLevel: 'high', riskType: 'fire', score: 78, population: 95000, updatedAt: '2026-10-03T05:30:00Z' },
  { id: 'RZ-4', name: 'Anand Vihar Corridor', lat: 28.632, lng: 77.217, radiusKm: 2.2, riskLevel: 'medium', riskType: 'air', score: 64, population: 210000, updatedAt: '2026-10-03T05:00:00Z' },
  { id: 'RZ-5', name: 'South Ridge Green Zone', lat: 28.585, lng: 77.19, radiusKm: 2.5, riskLevel: 'low', riskType: 'heat', score: 28, population: 60000, updatedAt: '2026-10-02T18:00:00Z' },
];
