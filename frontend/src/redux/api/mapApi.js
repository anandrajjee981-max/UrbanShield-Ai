import { USE_MOCK, clone, fakeLatency, get } from '../../services/api.js'
import {
  MOCK_DEPARTMENT_STATIONS,
  MOCK_INFRASTRUCTURE,
  MOCK_RISK_ZONES,
  MOCK_WARD_BOUNDARIES,
} from '../../mock/risks.js'
import { MOCK_REPORTS } from '../../mock/reports.js'
import { applyFilters } from '../../utils/filters.js'

/**
 * Map endpoints. Returns plain GeoJSON-friendly arrays so React Leaflet can
 * render them directly - no component ever holds marker data of its own.
 */

/** `GET /api/map/risks` */
export async function fetchRiskZones(filters = {}) {
  if (!USE_MOCK) return get('/api/map/risks', filters)

  await fakeLatency()
  return clone(applyFilters(MOCK_RISK_ZONES, filters))
}

/** `GET /api/map/reports` */
export async function fetchMapReports(filters = {}) {
  if (!USE_MOCK) return get('/api/map/reports', filters)

  await fakeLatency()
  return clone(applyFilters(MOCK_REPORTS, filters))
}

/** `GET /api/map/infrastructure` */
export async function fetchInfrastructure() {
  if (!USE_MOCK) return get('/api/map/infrastructure')

  await fakeLatency(180, 380)
  return clone(MOCK_INFRASTRUCTURE)
}

/** `GET /api/map/boundaries` */
export async function fetchWardBoundaries() {
  if (!USE_MOCK) return get('/api/map/boundaries')

  await fakeLatency(140, 300)
  return clone(MOCK_WARD_BOUNDARIES)
}

/** `GET /api/map/departments` */
export async function fetchDepartmentStations() {
  if (!USE_MOCK) return get('/api/map/departments')

  await fakeLatency(140, 300)
  return clone(MOCK_DEPARTMENT_STATIONS)
}

/**
 * One round-trip for every layer, so the map can render as a single unit and
 * show a single loading state.
 */
export async function fetchMapBundle(filters = {}) {
  const [risks, reports, infrastructure, boundaries, departments] = await Promise.all([
    fetchRiskZones(filters),
    fetchMapReports(filters),
    fetchInfrastructure(),
    fetchWardBoundaries(),
    fetchDepartmentStations(),
  ])

  return { risks, reports, infrastructure, boundaries, departments }
}
