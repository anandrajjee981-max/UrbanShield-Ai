/**
 * Mock report dataset.
 *
 * Reports are generated from a seeded PRNG so pagination, filters and charts
 * always agree with each other and the page looks identical on every reload.
 */

import { CITY, ISSUE_TYPES, REPORT_STATUS_FLOW, WARDS } from '../utils/constants.js'
import { MOCK_DEPARTMENTS, MOCK_OFFICERS, MOCK_USERS } from './users.js'

function createRandom(seed = 772026) {
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
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const CITIZEN_NAMES = [
  'Aarav Sharma',
  'Priya Nair',
  'Rohit Yadav',
  'Sneha Kumari',
  'Imran Qureshi',
  'Divya Ranjan',
  'Manish Tiwari',
  'Kavya Singh',
  'Sunil Prasad',
  'Neha Gupta',
  'Vikas Yadav',
  'Ritika Singh',
]

const STREETS = [
  'Gandhi Maidan Road',
  'Boring Road',
  'Kankarbagh Main Road',
  'Rajendra Nagar Road',
  'Patliputra Link Road',
  'Bailey Road',
  'Kadam Kuan',
  'Danapur Station Road',
  'Sonpur Road',
  'Rajgir Highway',
  'Khusrupur Lane',
  'Ramnagar Cross Road',
]

const DESCRIPTIONS = {
  heat: 'Road surface is burning hot and there is no shade nearby. Two people collapsed at the bus stop this afternoon and the temperature feels unbearable.',
  water_shortage: 'No water supply in the whole block since four days. Families are queuing at the public tap every morning and it runs dry within minutes.',
  water_leakage: 'Main pipeline has been leaking continuously for more than a week. The road is flooded and the water is clearly contaminated near the drain.',
  garbage: 'Garbage has not been collected for three days. The pile near the crossing is spreading and stray animals are now roaming the street.',
  streetlight: 'Streetlight has been out for over a week. The stretch stays completely dark after 8 PM which is unsafe for women and children walking home.',
  road_damage: 'Large pothole right in the middle of the lane. A two-wheeler fell into it yesterday. The road surface has broken up across the whole junction.',
  environmental: 'Factory effluent is being discharged straight into the nallah. Strong chemical smell and the water has turned completely dark.',
  other: 'Public infrastructure on this stretch needs attention. Please send a team to inspect the area and take the necessary action.',
}

const AI_TEMPLATES = {
  water_leakage: {
    priority: 'high',
    title: 'Probable continuous pipeline leak',
    description: 'Night flow telemetry is 3.1x higher than billed consumption in this ward, which matches a continuous leak rather than customer usage.',
    recommendation: 'Send a pipeline inspection crew with acoustic leak detection within 24 hours.',
    confidence: 0.88,
  },
  water_shortage: {
    priority: 'high',
    title: 'Supply deficit predicted in this ward',
    description: 'Reservoir level is 41% below the seasonal average and demand is trending upward after the temperature increase.',
    recommendation: 'Arrange temporary tanker supply and publish a water schedule for the affected blocks.',
    confidence: 0.81,
  },
  heat: {
    priority: 'high',
    title: 'Severe heat stress risk for next 5 days',
    description: 'Forecast maximum of 42 C with a heat index above 46 C. The ward has low canopy cover and an elderly population above the city average.',
    recommendation: 'Open a cooling centre in a community hall and issue a public advisory before 2 PM each day.',
    confidence: 0.9,
  },
  garbage: {
    priority: 'medium',
    title: 'Collection schedule is being missed',
    description: 'Reports from this pickup point have tripled over the last 10 days while the assigned vehicle has the lowest route completion rate.',
    recommendation: 'Re-sequence the collection route and add an evening pickup for this block.',
    confidence: 0.74,
  },
  streetlight: {
    priority: 'medium',
    title: 'Feeder failure, not a single lamp fault',
    description: 'Three dark poles cluster on the same circuit, which points to a feeder or transformer issue rather than individual lamp failure.',
    recommendation: 'Dispatch the electrical team with a line technician and inspect the nearest transformer.',
    confidence: 0.79,
  },
  road_damage: {
    priority: 'medium',
    title: 'Load-bearing failure on an arterial road',
    description: 'The pothole is deeper than the patch width and sits on a bus route carrying heavy axle load during peak hours.',
    recommendation: 'Schedule hot-mix patching and add speed breakers until the repair is completed.',
    confidence: 0.76,
  },
  environmental: {
    priority: 'high',
    title: 'Effluent concentration above safe limit',
    description: 'Downstream probe shows dissolved oxygen below the minimum threshold and rising conductivity for the second day running.',
    recommendation: 'Inspect the nearest industrial outfall and issue a show-cause notice to the defaulting unit.',
    confidence: 0.85,
  },
  other: {
    priority: 'low',
    title: 'Field verification recommended',
    description: 'The report could not be matched to a known infrastructure category automatically.',
    recommendation: 'Assign to the nearest field supervisor for physical inspection within 48 hours.',
    confidence: 0.52,
  },
}

function photoUrl(seed) {
  return `https://picsum.photos/seed/usai-${seed}/640/480`
}

function buildTimeline(status, createdAt, department, officer) {
  const index = REPORT_STATUS_FLOW.indexOf(status)
  const reached = REPORT_STATUS_FLOW.slice(0, index + 1)

  return reached.map((step, stepIndex) => ({
    status: step,
    at: new Date(new Date(createdAt).getTime() + stepIndex * (6 + Math.floor(random() * 30)) * HOUR).toISOString(),
    by:
      stepIndex === 0
        ? 'Citizen'
        : stepIndex === index
          ? 'Authority Officer'
          : department?.shortName ?? 'Authority',
    note:
      step === 'reported'
        ? 'Report submitted by citizen with location attached.'
        : step === 'verified'
          ? 'Location and evidence verified by field review.'
          : step === 'assigned'
            ? `Assigned to ${department?.name ?? 'department'}.`
            : step === 'in_progress'
              ? `Work started by ${officer?.name ?? 'field team'}.`
              : 'Issue resolved and verified by the reporting citizen.',
  }))
}

function buildNotes(department, officer) {
  if (!department) return []

  const count = 1 + Math.floor(random() * 2)
  return Array.from({ length: count }, (_, index) => ({
    id: `note-${Math.floor(random() * 100000)}-${index}`,
    author: index === 0 ? officer?.name ?? 'Field Supervisor' : department.head,
    authorRole: index === 0 ? 'Field Supervisor' : 'Department Head',
    body:
      index === 0
        ? 'Site visited and issue confirmed. Materials and crew have been requested.'
        : 'Progress update shared with the ward office. Work is expected to finish within the SLA.',
    createdAt: new Date(Date.now() - Math.floor(random() * 48) * HOUR).toISOString(),
  }))
}

const STATUS_MIX = [
  ...Array(14).fill('reported'),
  ...Array(9).fill('verified'),
  ...Array(8).fill('assigned'),
  ...Array(11).fill('in_progress'),
  ...Array(18).fill('resolved'),
]

function buildReport(index) {
  const issueType = ISSUE_TYPES[Math.floor(random() * (ISSUE_TYPES.length - 1))]
  const category = issueType.category
  const status = STATUS_MIX[index % STATUS_MIX.length]
  const department = category === 'other' ? null : MOCK_DEPARTMENTS.find((d) => d.categories.includes(category))
  const officer = MOCK_OFFICERS.find((o) => o.departmentId === department?.id)
  const ward = WARDS[Math.floor(random() * WARDS.length)]

  const createdAtMs = Date.now() - Math.floor(random() * 45) * DAY - Math.floor(random() * 24) * HOUR
  const createdAt = new Date(createdAtMs).toISOString()

  const priority = category === 'heat' || category === 'water' ? (random() > 0.35 ? 'high' : 'medium') : random() > 0.7 ? 'high' : random() > 0.3 ? 'medium' : 'low'

  const photoCount = 1 + Math.floor(random() * 3)

  return {
    id: `rpt-${String(index + 1).padStart(4, '0')}`,
    trackingId: `#USAI-2026-${String(1234 + index).padStart(6, '0')}`,
    issueType: issueType.value,
    issueLabel: issueType.label,
    category,
    title: `${issueType.label} - ${STREETS[index % STREETS.length]}`,
    description: DESCRIPTIONS[issueType.value],
    ward,
    address: `${STREETS[index % STREETS.length]}, ${CITY.name}`,
    latitude: Number((CITY.center[0] + (random() - 0.5) * 0.16).toFixed(5)),
    longitude: Number((CITY.center[1] + (random() - 0.5) * 0.15).toFixed(5)),
    photos: Array.from({ length: photoCount }, (_, photoIndex) => ({
      id: `photo-${index}-${photoIndex}`,
      url: photoUrl(`${index}-${photoIndex}`),
      name: `evidence-${photoIndex + 1}.jpg`,
    })),
    status,
    priority,
    reporter: {
      id: MOCK_USERS.citizen.id,
      name: CITIZEN_NAMES[index % CITIZEN_NAMES.length],
      phone: `+91 9${String(100000000 + Math.floor(random() * 899999999)).slice(0, 9)}`,
    },
    department: department ? { id: department.id, name: department.name, shortName: department.shortName } : null,
    assignee: officer ? { id: officer.id, name: officer.name, role: officer.role, phone: officer.phone } : null,
    dueDate: new Date(createdAtMs + (department?.responseSlaHours ?? 72) * HOUR).toISOString(),
    timeline: buildTimeline(status, createdAt, department, officer),
    notes: buildNotes(department, officer),
    aiInsight: AI_TEMPLATES[issueType.value]
      ? { ...AI_TEMPLATES[issueType.value], createdAt, generatedBy: 'UbranShieldAI Risk Engine v4.2' }
      : null,
    createdAt,
    updatedAt: new Date(Math.min(Date.now(), createdAtMs + 30 * HOUR)).toISOString(),
  }
}

/** 60 reports - enough to exercise pagination, filters and charts. */
export const MOCK_REPORTS = Array.from({ length: 60 }, (_, index) => buildReport(index))

/** Reports the demo citizen is the author of. */
export const MOCK_MY_REPORTS = MOCK_REPORTS.filter((_, index) => index % 9 === 0).map((report) => ({
  ...report,
  reporter: { id: MOCK_USERS.citizen.id, name: MOCK_USERS.citizen.name, phone: MOCK_USERS.citizen.phone },
}))
