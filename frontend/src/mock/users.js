/**
 * Mock identity + organisational data.
 *
 * Only the API layer reads this file. When the real backend is ready,
 * `redux/api/*` swaps these objects for HTTP responses and nothing else changes.
 */

import { FALLBACK_WEATHER } from '../utils/constants.js'

/** Departments that reports can be assigned to. */
export const MOCK_DEPARTMENTS = [
  {
    id: 'dept-water',
    name: 'Water Supply Department',
    shortName: 'Water Supply',
    head: 'A. K. Sharma',
    email: 'water@urbanshield.gov',
    phone: '+91 612 270 1001',
    personnel: 34,
    categories: ['water'],
    color: '#3B82F6',
    responseSlaHours: 24,
  },
  {
    id: 'dept-roads',
    name: 'Road Maintenance Division',
    shortName: 'Roads',
    head: 'Rajiv Singh',
    email: 'roads@urbanshield.gov',
    phone: '+91 612 270 1002',
    personnel: 42,
    categories: ['road'],
    color: '#F59E0B',
    responseSlaHours: 48,
  },
  {
    id: 'dept-sanitation',
    name: 'Sanitation & Waste Management',
    shortName: 'Sanitation',
    head: 'Meera Devi',
    email: 'sanitation@urbanshield.gov',
    phone: '+91 612 270 1003',
    personnel: 56,
    categories: ['garbage', 'environment'],
    color: '#10B981',
    responseSlaHours: 12,
  },
  {
    id: 'dept-electrical',
    name: 'Electrical & Streetlight Department',
    shortName: 'Electrical',
    head: 'Sanjay Kumar',
    email: 'electrical@urbanshield.gov',
    phone: '+91 612 270 1004',
    personnel: 20,
    categories: ['infrastructure'],
    color: '#8B5CF6',
    responseSlaHours: 36,
  },
  {
    id: 'dept-heat',
    name: 'Disaster Management & Heat Cell',
    shortName: 'Heat Cell',
    head: 'Priya Patel',
    email: 'heat@urbanshield.gov',
    phone: '+91 612 270 1005',
    personnel: 15,
    categories: ['heat'],
    color: '#EF4444',
    responseSlaHours: 6,
  },
  {
    id: 'dept-env',
    name: 'Parks & Environment Department',
    shortName: 'Environment',
    head: 'Vikram Rao',
    email: 'environment@urbanshield.gov',
    phone: '+91 612 270 1006',
    personnel: 18,
    categories: ['environment', 'garbage'],
    color: '#14B8A6',
    responseSlaHours: 72,
  },
]

/** Officer roster used by the assignment picker. */
export const MOCK_OFFICERS = [
  { id: 'off-1', name: 'Rakesh Kumar', role: 'Field Supervisor', departmentId: 'dept-water', phone: '+91 98765 12001' },
  { id: 'off-2', name: 'Amit Singh', role: 'Field Supervisor', departmentId: 'dept-roads', phone: '+91 98765 12002' },
  { id: 'off-3', name: 'Sanjay Verma', role: 'Line Technician', departmentId: 'dept-electrical', phone: '+91 98765 12003' },
  { id: 'off-4', name: 'Team Alpha', role: 'Crew Lead', departmentId: 'dept-sanitation', phone: '+91 98765 12004' },
  { id: 'off-5', name: 'Nisha Gupta', role: 'Field Supervisor', departmentId: 'dept-heat', phone: '+91 98765 12005' },
  { id: 'off-6', name: 'Farhan Ali', role: 'Crew Lead', departmentId: 'dept-env', phone: '+91 98765 12006' },
]

/** The three demo identities the role switcher can log in as. */
export const MOCK_USERS = {
  citizen: {
    id: 'usr-citizen-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+91 90000 11122',
    role: 'citizen',
    roleLabel: 'Citizen',
    ward: 'Ward 12',
    avatar: null,
  },
  authority: {
    id: 'usr-authority-1',
    name: 'Ananya Verma',
    email: 'ananya.verma@urbanshield.gov',
    phone: '+91 90000 22233',
    role: 'authority',
    roleLabel: 'Authority Officer',
    departmentId: 'dept-water',
    ward: 'All Wards',
    avatar: null,
  },
  admin: {
    id: 'usr-admin-1',
    name: 'Rohit Menon',
    email: 'rohit.menon@urbanshield.gov',
    phone: '+91 90000 33344',
    role: 'admin',
    roleLabel: 'Administrator',
    departmentId: 'dept-sanitation',
    ward: 'All Wards',
    avatar: null,
  },
}

export const MOCK_WEATHER = {
  ...FALLBACK_WEATHER,
  observedAt: new Date().toISOString(),
  ward: 'Ward 12',
  aqi: 118,
  rainChance: 12,
}
