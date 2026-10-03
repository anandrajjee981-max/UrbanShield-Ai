import {
  BarChart3,
  ClipboardList,
  CircleCheck,
  CircleX,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
} from 'lucide-react'

/** Product identity. */
export const APP_NAME = 'UbranShieldAI'
export const APP_SUBTITLE = 'AI-Powered Urban Risk & Civic Intelligence Platform'
export const BRAND_MESSAGE = 'Smarter Cities. Safer Communities. Resilient Tomorrow.'

/** The city the platform is seeded against. */
export const CITY = {
  name: 'Patna',
  state: 'Bihar',
  country: 'India',
  center: [25.5941, 85.1376],
  zoom: 13,
  timezone: 'Asia/Kolkata',
}

/** Report lifecycle. Order matters - the timeline renders in this order. */
export const REPORT_STATUS_FLOW = ['reported', 'verified', 'assigned', 'in_progress', 'resolved']

export const REPORT_STATUS_LABELS = {
  reported: 'Reported',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

/** Next status an authority officer can move a report to. */
export const STATUS_ACTIONS = {
  reported: { next: 'verified', label: 'Verify Report' },
  verified: { next: 'assigned', label: 'Assign Department' },
  assigned: { next: 'in_progress', label: 'Mark as In Progress' },
  in_progress: { next: 'resolved', label: 'Mark as Resolved' },
  resolved: { next: null, label: 'Resolved' },
}

export const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/**
 * Issue catalogue. `category` groups types for map layers and charts,
 * `icon` is a lucide component so the same definition drives every picker.
 */
export const ISSUE_TYPES = [
  { value: 'heat', label: 'Heat Issue', category: 'heat', icon: 'sun' },
  { value: 'water_shortage', label: 'Water Shortage', category: 'water', icon: 'droplet-off' },
  { value: 'water_leakage', label: 'Water Leakage', category: 'water', icon: 'droplet' },
  { value: 'garbage', label: 'Garbage Issue', category: 'garbage', icon: 'trash-2' },
  { value: 'streetlight', label: 'Broken Streetlight', category: 'infrastructure', icon: 'lightbulb-off' },
  { value: 'road_damage', label: 'Road Damage', category: 'road', icon: 'construction' },
  { value: 'environmental', label: 'Environmental Issue', category: 'environment', icon: 'leaf' },
  { value: 'other', label: 'Other Issue', category: 'other', icon: 'circle-alert' },
]

export const ISSUE_TYPE_LABELS = Object.fromEntries(ISSUE_TYPES.map((item) => [item.value, item.label]))

export const ISSUE_CATEGORIES = [
  { value: 'heat', label: 'Heat' },
  { value: 'water', label: 'Water' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'road', label: 'Road' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'environment', label: 'Environmental' },
]

/** Wards used by every ward filter and the ward risk chart. */
export const WARDS = Array.from({ length: 12 }, (_, index) => `Ward ${index + 1}`)

/** Risk severity buckets, derived from a 0-100 score by `utils/riskCalculator`. */
export const RISK_LEVELS = [
  { value: 'high', label: 'High Risk', min: 70, max: 100 },
  { value: 'medium', label: 'Medium Risk', min: 40, max: 70 },
  { value: 'low', label: 'Low Risk', min: 0, max: 40 },
  { value: 'minimal', label: 'Minimal Risk', min: 0, max: 0 },
]

export const DATE_RANGES = [
  { value: 'today', label: 'Today', days: 1 },
  { value: '7d', label: 'Last 7 Days', days: 7 },
  { value: '30d', label: 'Last 30 Days', days: 30 },
  { value: 'month', label: 'This Month', days: 30 },
  { value: 'custom', label: 'Custom Range', days: null },
]

export const DEFAULT_FILTERS = {
  dateRange: '30d',
  customRange: { from: null, to: null },
  ward: 'all',
  issueCategory: 'all',
  riskLevel: 'all',
  status: 'all',
  priority: 'all',
  search: '',
  sort: 'latest',
}

/** Map layers the user can toggle. */
export const MAP_LAYERS = [
  { key: 'heat', label: 'Heat Risk' },
  { key: 'water', label: 'Water Risk' },
  { key: 'reports', label: 'Citizen Reports' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'boundaries', label: 'Ward Boundaries' },
  { key: 'departments', label: 'Departments' },
]

export const DEFAULT_MAP_LAYERS = {
  heat: true,
  water: true,
  reports: true,
  infrastructure: false,
  boundaries: true,
  departments: false,
}

/** Risk categories plotted on the map, keyed by `risk.type`. */
export const MAP_RISK_TYPES = ['heat', 'water', 'garbage', 'road', 'infrastructure', 'environment']

/** Roles. `admin` inherits every authority capability. */
export const ROLES = {
  CITIZEN: 'citizen',
  AUTHORITY: 'authority',
  ADMIN: 'admin',
}

export const ROLE_LABELS = {
  citizen: 'Citizen',
  authority: 'Authority Officer',
  admin: 'Administrator',
}

/** Base path for each authenticated role, used by login and route guards. */
export const ROLE_HOME = {
  citizen: '/citizen/dashboard',
  authority: '/authority/dashboard',
  admin: '/admin/dashboard',
}

/**
 * One navigation definition, consumed by the single `Sidebar` component for
 * every role. `roles` gates an item; `badgeKey` names a counter in Redux.
 */
export const NAV_MENUS = {
  authority: [
    { label: 'Dashboard', to: '/authority/dashboard', icon: LayoutDashboard, roles: [ROLES.AUTHORITY] },
    { label: 'Assigned Tasks', to: '/authority/tasks', icon: ClipboardList, roles: [ROLES.AUTHORITY] },
    { label: 'Profile', to: '/authority/profile', icon: UserRound, roles: [ROLES.AUTHORITY] },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, roles: [ROLES.ADMIN] },
    { label: 'Reports', to: '/admin/issues', icon: FileText, roles: [ROLES.ADMIN] },
    { label: 'Verified Reports', to: '/admin/issues?status=VERIFIED', icon: CircleCheck, roles: [ROLES.ADMIN] },
    { label: 'Rejected Reports', to: '/admin/issues?status=REJECTED', icon: CircleX, roles: [ROLES.ADMIN] },
    { label: 'Profile', to: '/admin/profile', icon: UserRound, roles: [ROLES.ADMIN] },
  ],
  citizen: [
    { label: 'Dashboard', to: '/citizen/dashboard', icon: LayoutDashboard, roles: [ROLES.CITIZEN] },
    { label: 'Report an Issue', to: '/citizen/report', icon: FileText, roles: [ROLES.CITIZEN] },
    { label: 'My Reports', to: '/citizen/reports', icon: ClipboardList, roles: [ROLES.CITIZEN] },
    { label: 'Profile', to: '/citizen/profile', icon: UserRound, roles: [ROLES.CITIZEN] },
  ],
}

/** Bottom tab bar on mobile. */
export const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard', to: '/citizen/dashboard', icon: LayoutDashboard, roles: [ROLES.CITIZEN] },
  { label: 'Report', to: '/citizen/report', icon: FileText, roles: [ROLES.CITIZEN], primary: true },
  { label: 'Reports', to: '/citizen/reports', icon: ClipboardList, roles: [ROLES.CITIZEN] },
  { label: 'Profile', to: '/citizen/profile', icon: UserRound, roles: [ROLES.CITIZEN] },
  { label: 'Dashboard', to: '/authority/dashboard', icon: LayoutDashboard, roles: [ROLES.AUTHORITY] },
  { label: 'Tasks', to: '/authority/tasks', icon: ClipboardList, roles: [ROLES.AUTHORITY] },
  { label: 'Profile', to: '/authority/profile', icon: UserRound, roles: [ROLES.AUTHORITY] },
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, roles: [ROLES.ADMIN] },
  { label: 'Reports', to: '/admin/issues', icon: FileText, roles: [ROLES.ADMIN] },
  { label: 'Profile', to: '/admin/profile', icon: UserRound, roles: [ROLES.ADMIN] },
]

/** Infrastructure POI categories shown on the map. */
export const INFRASTRUCTURE_TYPES = [
  { value: 'water_treatment', label: 'Water Treatment' },
  { value: 'transformer', label: 'Power Transformer' },
  { value: 'sanitation', label: 'Sanitation Depot' },
  { value: 'streetlight', label: 'Streetlight Hub' },
  { value: 'drainage', label: 'Drainage Station' },
  { value: 'shelter', label: 'Emergency Shelter' },
]

/** Weather shown in the header. Replaced by `/api/dashboard` when live. */
export const FALLBACK_WEATHER = {
  temperature: 32,
  condition: 'Clear Sky',
  humidity: 62,
  windSpeed: 11,
  feelsLike: 35,
  icon: 'sun',
}

export const NOTIFICATION_TYPES = {
  REPORT_VERIFIED: 'report_verified',
  REPORT_ASSIGNED: 'report_assigned',
  REPORT_STATUS_CHANGED: 'report_status_changed',
  RISK_ALERT: 'risk_alert',
  AI_PREDICTION: 'ai_prediction',
  AUTHORITY_UPDATE: 'authority_update',
}

/** WebSocket / Socket.IO event contract. */
export const SOCKET_EVENTS = {
  NEW_REPORT: 'NEW_REPORT',
  REPORT_UPDATED: 'REPORT_UPDATED',
  REPORT_STATUS_CHANGED: 'REPORT_STATUS_CHANGED',
  NEW_RISK_DETECTED: 'NEW_RISK_DETECTED',
  RISK_LEVEL_CHANGED: 'RISK_LEVEL_CHANGED',
  NEW_NOTIFICATION: 'NEW_NOTIFICATION',
}

export const NAV_ICONS = {
  home: Home,
  map: Map,
  layers: Layers,
  mapPin: MapPin,
  shield: ShieldCheck,
  settings: Settings,
  user: UserCog,
}
