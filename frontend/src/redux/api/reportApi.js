import { USE_MOCK, clone, fakeLatency, get, patch, post } from '../../services/api.js'
import { MOCK_MY_REPORTS, MOCK_REPORTS } from '../../mock/reports.js'
import { MOCK_DEPARTMENTS, MOCK_OFFICERS, MOCK_USERS } from '../../mock/users.js'
import { STATUS_ACTIONS } from '../../utils/constants.js'
import { paginate, queryItems } from '../../utils/filters.js'

/**
 * Report endpoints.
 *
 * The only module that knows reports come from a mock array today and from
 * `/api/reports` tomorrow. Every exported function returns a plain object, so
 * the thunks and components are identical either way.
 */

const STORAGE_KEY = 'urbanshield.reports'

/** Mock store so a submitted report survives navigation within the session. */
function readMockStore() {
  if (typeof sessionStorage === 'undefined') return clone(MOCK_REPORTS)
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY)
    if (cached) return JSON.parse(cached)
  } catch {
    // Fall through to the seeded dataset.
  }
  return clone(MOCK_REPORTS)
}

function writeMockStore(reports) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
  } catch {
    // Storage is full or unavailable - the in-memory copy still works.
  }
}

function pushStatus(report, status, actor, note) {
  const entry = {
    status,
    at: new Date().toISOString(),
    by: actor,
    note: note || 'Status updated by authority.',
  }
  return { ...report, status, updatedAt: entry.at, timeline: [...report.timeline, entry] }
}

function createMockReport(payload, user) {
  const now = new Date().toISOString()
  const sequence = 1234 + MOCK_REPORTS.length + Math.floor(Math.random() * 500)

  return {
    id: `rpt-${Date.now().toString(36)}`,
    trackingId: `#USAI-${new Date().getFullYear()}-${String(sequence).padStart(6, '0')}`,
    issueType: payload.issueType,
    issueLabel: payload.issueLabel,
    category: payload.category,
    title: payload.title || payload.issueLabel,
    description: payload.description,
    ward: payload.ward ?? 'Ward 12',
    address: payload.address ?? '',
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    photos: (payload.photos ?? []).map((photo, index) => ({
      id: `photo-${Date.now()}-${index}`,
      url: typeof photo === 'string' ? photo : photo.url,
      name: typeof photo === 'string' ? `evidence-${index + 1}.jpg` : photo.name,
    })),
    status: 'reported',
    priority: payload.priority ?? 'medium',
    reporter: {
      id: payload.anonymous ? null : user.id,
      name: payload.anonymous ? 'Anonymous resident' : user.name,
      phone: payload.anonymous ? '' : payload.contactPhone ?? user.phone ?? '',
      email: payload.anonymous ? '' : payload.contactEmail ?? user.email ?? '',
      anonymous: Boolean(payload.anonymous),
    },
    department: null,
    assignee: null,
    dueDate: null,
    timeline: [{ status: 'reported', at: now, by: 'Citizen', note: 'Report submitted by citizen with location attached.' }],
    notes: [],
    aiInsight: null,
    createdAt: now,
    updatedAt: now,
  }
}

/** `GET /api/reports` - filtered, sorted, paginated. */
export async function fetchReports(params = {}) {
  if (!USE_MOCK) return get('/api/reports', params)

  await fakeLatency()
  const all = queryItems(readMockStore(), params)
  return paginate(all, params.page ?? 1, params.limit ?? 10)
}

/** Reports authored by the signed-in citizen. */
export async function fetchMyReports(filters = {}) {
  if (!USE_MOCK) return get('/api/reports/mine', filters)

  await fakeLatency()
  const mine = readMockStore().filter((report) => report.reporter?.id === MOCK_USERS.citizen.id)
  const fallback = MOCK_MY_REPORTS.filter((report) => report.reporter?.id === MOCK_USERS.citizen.id)
  const source = mine.length ? mine : fallback

  return paginate(queryItems(source, filters), filters.page ?? 1, filters.limit ?? 10)
}

/** `GET /api/reports/:id` */
export async function fetchReportById(id) {
  if (!USE_MOCK) return get(`/api/reports/${id}`)

  await fakeLatency(150, 320)
  const found = readMockStore().find((report) => report.id === id || report.trackingId === id)
  if (!found) throw new Error('Report not found')
  return found
}

/** `POST /api/reports` */
export async function createReport(payload, user = MOCK_USERS.citizen) {
  if (!USE_MOCK) return post('/api/reports', payload)

  await fakeLatency(600, 1000)
  const report = createMockReport(payload, user)
  const store = readMockStore()
  writeMockStore([report, ...store])
  return report
}

/** `PATCH /api/reports/:id/status` */
export async function updateReportStatus(id, status, actor = MOCK_USERS.authority) {
  if (!USE_MOCK) return patch(`/api/reports/${id}/status`, { status })

  await fakeLatency(280, 520)
  const store = readMockStore()
  const index = store.findIndex((report) => report.id === id)
  if (index === -1) throw new Error('Report not found')

  store[index] = pushStatus(store[index], status, actor.name, STATUS_ACTIONS[store[index].status]?.label)
  writeMockStore(store)
  return store[index]
}

/** `PATCH /api/reports/:id/assign` */
export async function assignReport(id, { departmentId, assigneeId, dueDate }) {
  if (!USE_MOCK) return patch(`/api/reports/${id}/assign`, { departmentId, assigneeId, dueDate })

  await fakeLatency(320, 600)
  const store = readMockStore()
  const index = store.findIndex((report) => report.id === id)
  if (index === -1) throw new Error('Report not found')

  const department = MOCK_DEPARTMENTS.find((d) => d.id === departmentId)
  const officer = MOCK_OFFICERS.find((o) => o.id === assigneeId)

  store[index] = {
    ...pushStatus(store[index], 'assigned', 'Authority Officer', `Assigned to ${department?.name ?? 'department'}.`),
    department: department ? { id: department.id, name: department.name, shortName: department.shortName } : null,
    assignee: officer ? { id: officer.id, name: officer.name, role: officer.role, phone: officer.phone } : null,
    dueDate: dueDate ?? new Date(Date.now() + (department?.responseSlaHours ?? 72) * 3600000).toISOString(),
  }

  writeMockStore(store)
  return store[index]
}

/** `POST /api/reports/:id/notes` */
export async function addReportNote(id, body, author = MOCK_USERS.authority) {
  if (!USE_MOCK) return post(`/api/reports/${id}/notes`, { body })

  await fakeLatency(240, 480)
  const store = readMockStore()
  const index = store.findIndex((report) => report.id === id)
  if (index === -1) throw new Error('Report not found')

  const note = {
    id: `note-${Date.now().toString(36)}`,
    author: author.name,
    authorRole: author.roleLabel,
    body,
    createdAt: new Date().toISOString(),
  }

  store[index] = { ...store[index], notes: [...store[index].notes, note], updatedAt: note.createdAt }
  writeMockStore(store)
  return store[index]
}

/** `DELETE`-style rejection of an unverified report. */
export async function rejectReport(id, reason) {
  if (!USE_MOCK) return patch(`/api/reports/${id}/reject`, { reason })

  await fakeLatency(260, 480)
  const store = readMockStore()
  const index = store.findIndex((report) => report.id === id)
  if (index === -1) throw new Error('Report not found')

  store[index] = {
    ...pushStatus(store[index], 'rejected', 'Authority Officer', reason || 'Report did not match any known issue.'),
  }
  writeMockStore(store)
  return store[index]
}

/** `PATCH`-style soft deletion of a report. */
export async function deleteReport(id) {
  if (!USE_MOCK) return patch(`/api/reports/${id}/delete`, {})

  await fakeLatency(260, 480)
  const store = readMockStore()
  const index = store.findIndex((report) => report.id === id)
  if (index === -1) throw new Error('Report not found')

  store[index] = {
    ...pushStatus(store[index], 'deleted', 'Authority Officer', 'Report deleted.'),
  }
  writeMockStore(store)
  return store[index]
}

/** `GET /api/search?q=` - global search across reports, wards and departments. */
export async function searchAll(query) {
  if (!USE_MOCK) return get('/api/search', { q: query })

  await fakeLatency(180, 380)
  const term = query.trim().toLowerCase()
  if (term.length < 2) return { reports: [], wards: [], departments: [], departmentsList: [] }

  const store = readMockStore()

  return {
    reports: store
      .filter((report) =>
        [report.trackingId, report.title, report.issueLabel, report.address, report.ward, report.reporter?.name]
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 6),
    wards: [...new Set(store.map((report) => report.ward))].filter((ward) => ward.toLowerCase().includes(term)).slice(0, 4),
    departments: MOCK_DEPARTMENTS.filter((department) => department.name.toLowerCase().includes(term)).slice(0, 4),
  }
}

/** Reference data for the assignment modal. */
export async function fetchAssignmentOptions() {
  if (!USE_MOCK) return get('/api/reports/assign-options')

  await fakeLatency(120, 240)
  return { departments: MOCK_DEPARTMENTS, officers: MOCK_OFFICERS }
}
