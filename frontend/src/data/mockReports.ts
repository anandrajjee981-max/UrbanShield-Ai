import type { CitizenReport } from '../types';

export const mockReports: CitizenReport[] = [
  { id: 'RPT-501', category: 'flood', title: 'Garbage drain overflowing', description: 'Drain near Block C overflowing since morning rain.', lat: 28.6197, lng: 77.2048, address: 'Rajendra Nagar Block C', status: 'verified', createdAt: '2026-10-03T05:30:00Z', votes: 42 },
  { id: 'RPT-502', category: 'heat', title: 'No shade at bus stop', description: 'Commuters fainting, need temporary shelter.', lat: 28.633, lng: 77.221, address: 'Shahdara Bus Stand', status: 'pending', createdAt: '2026-10-03T02:12:00Z', votes: 18 },
  { id: 'RPT-503', category: 'air', title: 'Open garbage burning', description: 'Burning waste causing heavy smoke.', lat: 28.6012, lng: 77.2455, address: 'Mayur Vihar Phase 1', status: 'actioned', createdAt: '2026-10-02T20:00:00Z', votes: 67 },
  { id: 'RPT-504', category: 'infrastructure', title: 'Streetlight failure', description: 'Entire lane dark for 3 nights.', lat: 28.6125, lng: 77.192, address: 'Chanakyapuri Lane 5', status: 'verified', createdAt: '2026-10-02T18:40:00Z', votes: 9 },
  { id: 'RPT-505', category: 'flood', title: 'Basement flooding in apartments', description: 'Water entering basements, pumps needed.', lat: 28.5944, lng: 77.2123, address: 'Jangpura Extension', status: 'pending', createdAt: '2026-10-02T15:10:00Z', votes: 31 },
];
