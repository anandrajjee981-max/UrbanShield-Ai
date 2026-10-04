export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'active' | 'monitoring' | 'resolved';
export type IncidentCategory = 'flood' | 'heat' | 'fire' | 'air' | 'infrastructure' | 'medical';

export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  severity: Severity;
  status: IncidentStatus;
  lat: number;
  lng: number;
  address: string;
  reportedAt: string;
  reporter: string;
  description: string;
  affectedRadiusKm: number;
}

export interface CitizenReport {
  id: string;
  category: IncidentCategory;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  status: 'pending' | 'verified' | 'rejected' | 'actioned';
  createdAt: string;
  votes: number;
  imageUrl?: string;
  /** How the location was provided (mirrors backend `locationType`). Only GPS reports are pinned on the map. */
  locationType?: 'GPS' | 'MANUAL';
  /** Raw backend lifecycle status for the workflow tracker. */
  rawStatus?: 'REPORTED' | 'VERIFIED' | 'REJECTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
  /** AI briefing once the issue is analysed (null until VERIFIED + analysed). */
  skillRequired?: string | null;
  complexity?: string | null;
  effortHours?: number | null;
  resolutionNote?: string | null;
}

export interface RiskZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  riskLevel: Severity;
  riskType: 'flood' | 'heat' | 'fire' | 'air';
  score: number;
  population: number;
  updatedAt: string;
}

export interface TrendPoint {
  date: string;
  incidents: number;
  resolved: number;
  reports: number;
}

export interface RiskDistribution {
  name: string;
  value: number;
  color: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  time: string;
  read: boolean;
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  delta: number;
  unit?: string;
}
