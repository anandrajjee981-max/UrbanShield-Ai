/**
 * Mock geospatial layer: risk zones, ward boundaries, infrastructure POIs and
 * department stations, all generated around `CITY.center` from a seeded PRNG so
 * the dataset is byte-identical on every reload.
 */

import { CITY, WARDS } from '../utils/constants.js'
import { MOCK_DEPARTMENTS } from './users.js'

/** Deterministic PRNG (mulberry32) - keeps mock coordinates stable. */
function createRandom(seed = 20260929) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = createRandom()

/** Offsets a point from the city centre by roughly `spread` kilometres. */
function offsetPoint(spreadKm) {
  const latOffset = (random() - 0.5) * spreadKm * 0.09
  const lngOffset = (random() - 0.5) * spreadKm * 0.085
  return [CITY.center[0] + latOffset, CITY.center[1] + lngOffset]
}

const HOUR = 60 * 60 * 1000

const RISK_SEED = [
  { type: 'heat', title: 'Concrete & asphalt heat island', source: 'Landsat-9 thermal band', impact: 'Surface temperature 6.4 C above city average' },
  { type: 'heat', title: 'Low canopy density corridor', source: 'NDVI vegetation index', impact: 'Shade deficit during peak afternoon hours' },
  { type: 'water', title: 'Pipeline pressure anomaly', source: 'Smart meter telemetry', impact: 'Night flow 3.1x higher than billed consumption' },
  { type: 'water', title: 'Groundwater extraction hotspot', source: 'Aquifer sensor grid', impact: 'Water table dropped 2.4 m since last quarter' },
  { type: 'garbage', title: 'Overflowing collection point', source: 'Citizen report clustering', impact: 'Bins unrecycled for more than 72 hours' },
  { type: 'road', title: 'Pothole cluster on arterial road', source: 'Street imagery analysis', impact: 'Peak-hour congestion risk' },
  { type: 'infrastructure', title: 'Transformer overheating', source: 'IoT power telemetry', impact: 'Reliability risk on two feeder lines' },
  { type: 'environment', title: 'Industrial effluent discharge', source: 'Water quality probes', impact: 'Dissolved oxygen below safe threshold' },
]

/** 40 risk zones spread across the 12 wards. */
export const MOCK_RISK_ZONES = Array.from({ length: 40 }, (_, index) => {
  const seed = RISK_SEED[index % RISK_SEED.length]
  const [latitude, longitude] = offsetPoint(16)
  const score = 20 + Math.round(random() * 78)
  const wardIndex = index % WARDS.length

  return {
    id: `risk-${String(index + 1).padStart(3, '0')}`,
    type: seed.type,
    title: seed.title,
    source: seed.source,
    impact: seed.impact,
    ward: WARDS[wardIndex],
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
    radiusMeters: 400 + Math.round(random() * 1100),
    score,
    status: score >= 70 ? 'critical' : score >= 40 ? 'watch' : 'stable',
    confidence: Number((0.62 + random() * 0.36).toFixed(2)),
    sensors: 1 + Math.floor(random() * 4),
    updatedAt: new Date(Date.now() - Math.round(random() * 72) * HOUR).toISOString(),
  }
})

/** 26 infrastructure points of interest. */
export const MOCK_INFRASTRUCTURE = Array.from({ length: 26 }, (_, index) => {
  const types = ['water_treatment', 'transformer', 'sanitation', 'streetlight', 'drainage', 'shelter']
  const type = types[index % types.length]
  const [latitude, longitude] = offsetPoint(18)
  const health = 45 + Math.round(random() * 54)

  return {
    id: `infra-${String(index + 1).padStart(3, '0')}`,
    type,
    name: `${type.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())} ${index + 1}`,
    ward: WARDS[index % WARDS.length],
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
    healthScore: health,
    status: health >= 75 ? 'operational' : health >= 55 ? 'degraded' : 'critical',
    lastInspectedAt: new Date(Date.now() - Math.round(random() * 30 * 24) * HOUR).toISOString(),
  }
})

/** Department headquarters - one marker per department. */
export const MOCK_DEPARTMENT_STATIONS = MOCK_DEPARTMENTS.map((department, index) => {
  const [latitude, longitude] = offsetPoint(12)
  return {
    id: `${department.id}-hq`,
    departmentId: department.id,
    name: department.shortName,
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
    phone: department.phone,
    ward: WARDS[index % WARDS.length],
  }
})

/**
 * Simplified ward boundaries.
 *
 * Real deployments load these as GeoJSON from the city GIS service; the mock
 * draws a small convex quad per ward so the Leaflet `GeoJSON` path can be
 * exercised end to end.
 */
export const MOCK_WARD_BOUNDARIES = {
  type: 'FeatureCollection',
  features: WARDS.map((name, index) => {
    const column = index % 4
    const row = Math.floor(index / 4)
    const baseLat = CITY.center[0] - 0.09 + row * 0.06
    const baseLng = CITY.center[1] - 0.15 + column * 0.075

    const coordinates = [
      [baseLat, baseLng],
      [baseLat, baseLng + 0.062],
      [baseLat + 0.052, baseLng + 0.07],
      [baseLat + 0.058, baseLng + 0.004],
      [baseLat, baseLng],
    ]

    return {
      type: 'Feature',
      properties: { name, id: name.toLowerCase().replace(' ', '-') },
      geometry: { type: 'Polygon', coordinates: [coordinates] },
    }
  }),
}
