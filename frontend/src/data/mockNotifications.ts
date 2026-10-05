import type { AppNotification } from '../types';

export const mockNotifications: AppNotification[] = [
  { id: 'N-1', title: 'Critical flood alert', message: 'ITO Underpass water level crossed danger mark.', type: 'critical', time: '5 min ago', read: false, category: 'INCIDENT', link: '/incidents' },
  { id: 'N-2', title: 'Heat advisory issued', message: 'Karol Bagh heat index 44°C — cooling centers opened.', type: 'warning', time: '32 min ago', read: false, category: 'INCIDENT', link: '/incidents' },
  { id: 'N-3', title: 'Fire crew on scene', message: '3 tenders reached Okhla Industrial Phase II.', type: 'info', time: '1 hr ago', read: false, category: 'AUTHORITY ACTION', link: '/tasks' },
  { id: 'N-4', title: 'Report verified', message: 'RPT-501 verified by ward officer.', type: 'success', time: '2 hrs ago', read: true, category: 'REPORT', link: '/reports' },
  { id: 'N-5', title: 'AQI improving', message: 'Anand Vihar PM2.5 down 12% in last hour.', type: 'info', time: '3 hrs ago', read: true, category: 'SYSTEM', link: '/analytics' },
];
