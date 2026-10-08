/**
 * aiSearchMock — FRONTEND-ONLY demo layer for the Global AI Search UI.
 *
 * TEMPORARY: returns canned demo results so the search panel can be reviewed
 * without any backend. It performs no AI, makes no network calls, and holds
 * no API keys.
 *
 * Future: replace `mockAiSearch()` with a call to the real backend AI Search
 * API. The UI components depend only on the exported types + function
 * signature, so no redesign will be needed.
 */

export type AiSearchRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN' | 'GUEST';

export type AiSearchResultKind = 'issue' | 'task' | 'authority' | 'info';

export interface AiSearchResultItem {
  id: string;
  kind: AiSearchResultKind;
  title: string;
  category: string;
  location: string;
  status: string;
  createdAt: string;
  /** Existing frontend route to navigate to, if one exists. */
  to: string;
  ctaLabel: string;
}

export interface AiSearchResponse {
  summary: string;
  items: AiSearchResultItem[];
}

export const ROLE_SUGGESTIONS: Record<AiSearchRole, string[]> = {
  CITIZEN: [
    'Show my reports',
    'Track my latest issue',
    'Find reported potholes',
    'How do I report an issue?',
  ],
  AUTHORITY: [
    'Show my tasks',
    'Show pending tasks',
    'Show my workload',
    'Show assigned issues',
  ],
  ADMIN: [
    'Show unassigned issues',
    'Show authority workload',
    'Show pending applications',
    'Show unresolved issues',
  ],
  GUEST: [
    'Show my reports',
    'Find city issues',
    'Show current risks',
    'Track my issue',
  ],
};

const DEMO_POOL: AiSearchResultItem[] = [
  {
    id: '#ISS-1024',
    kind: 'issue',
    title: 'Road / Pothole on MG Road',
    category: 'Road / Pothole',
    location: 'MG Road, Sector 14',
    status: 'In Progress',
    createdAt: '2h ago',
    to: '/incidents',
    ctaLabel: 'View Issue',
  },
  {
    id: '#ISS-1018',
    kind: 'issue',
    title: 'Streetlight outage near Central Park',
    category: 'Streetlight',
    location: 'Central Park Gate 2',
    status: 'Open',
    createdAt: '6h ago',
    to: '/reports',
    ctaLabel: 'View Issue',
  },
  {
    id: '#TSK-2041',
    kind: 'task',
    title: 'Waterlogging review — ITO crossing',
    category: 'Drainage / Waterlogging',
    location: 'ITO Crossing',
    status: 'Assigned',
    createdAt: 'Assigned 1h ago',
    to: '/tasks',
    ctaLabel: 'View Task',
  },
  {
    id: '#TSK-2033',
    kind: 'task',
    title: 'Garbage clearance — Lajpat Nagar',
    category: 'Sanitation',
    location: 'Lajpat Nagar Block C',
    status: 'Pending',
    createdAt: 'Assigned 3h ago',
    to: '/tasks',
    ctaLabel: 'View Task',
  },
  {
    id: 'AUTH-07',
    kind: 'authority',
    title: 'Ravi Kumar — Roads Department',
    category: 'Roads · Pothole repair',
    location: 'Zone East',
    status: 'Available',
    createdAt: 'Joined 2023',
    to: '/authority/profile',
    ctaLabel: 'View Authority',
  },
  {
    id: 'APP-312',
    kind: 'info',
    title: 'Authority application — Water Dept.',
    category: 'Application',
    location: 'Pending verification',
    status: 'Pending',
    createdAt: 'Submitted yesterday',
    to: '/admin/authority-applications',
    ctaLabel: 'View Details',
  },
];

const norm = (s: string) => s.toLowerCase();

/**
 * Simulate an AI search over the demo pool.
 * - Query "error" forces a rejected promise (to preview the error state).
 * - Queries with no token overlap resolve with an empty item list.
 * - Otherwise resolves after a short delay to preview the loading state.
 */
export function mockAiSearch(query: string, _role: AiSearchRole = 'GUEST'): Promise<AiSearchResponse> {
  const q = query.trim();
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (norm(q) === 'error') {
        reject(new Error('Demo search failed. Please try again.'));
        return;
      }
      const tokens = norm(q).split(/\s+/).filter((t) => t.length > 2);
      const items = DEMO_POOL.filter((item) =>
        tokens.some((t) =>
          norm(`${item.id} ${item.title} ${item.category} ${item.location} ${item.status} ${item.kind}`).includes(t),
        ),
      ).slice(0, 4);

      if (items.length === 0) {
        resolve({ summary: '', items: [] });
        return;
      }
      const unresolved = items.filter((i) => norm(i.status) !== 'available').length;
      resolve({
        summary: `You have ${items.length} matching ${items.length === 1 ? 'result' : 'results'}${unresolved > 0 ? ` (${unresolved} need${unresolved === 1 ? 's' : ''} attention)` : ''}.`,
        items,
      });
    }, 700);
  });
}
