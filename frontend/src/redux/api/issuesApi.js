import { http } from '../../services/api.js'

const ADMIN_STATUSES = new Set(['REPORTED', 'VERIFIED', 'REJECTED'])

function unwrap(response) {
  return response.data?.data ?? response.data
}

function unwrapList(response) {
  const payload = unwrap(response)
  if (Array.isArray(payload)) return payload
  return payload?.issues ?? payload?.items ?? []
}

export async function fetchMyIssues() {
  const response = await http.get('/api/issues/my')
  return unwrapList(response)
}

export async function createIssue({ issueType, description, image, locationType, latitude, longitude, address }) {
  const formData = new FormData()
  formData.append('issueType', issueType)
  formData.append('description', description)
  formData.append('locationType', locationType)
  if (image) formData.append('image', image)
  if (locationType === 'GPS') {
    formData.append('latitude', String(latitude))
    formData.append('longitude', String(longitude))
  } else {
    formData.append('address', address.trim())
  }

  const response = await http.post('/api/issues', formData)
  return unwrap(response)
}

export async function fetchAdminIssues(status) {
  const params = ADMIN_STATUSES.has(status) ? { status } : undefined
  const response = await http.get('/api/admin/issues', { params })
  return unwrapList(response)
}

export async function fetchAdminIssue(id) {
  const issues = await fetchAdminIssues()
  return issues.find((issue) => String(issue.id ?? issue._id) === String(id)) ?? null
}

export async function verifyIssue(id) {
  const response = await http.patch(`/api/admin/issues/${encodeURIComponent(id)}/verify`)
  return unwrap(response)
}

export async function rejectIssue(id, reason) {
  const response = await http.patch(`/api/admin/issues/${encodeURIComponent(id)}/reject`, {
    ...(reason.trim() ? { reason: reason.trim() } : {}),
  })
  return unwrap(response)
}