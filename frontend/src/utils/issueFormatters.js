export function getIssueStatus(issue) {
  return String(issue?.status ?? 'REPORTED').toUpperCase()
}

export function getIssueTypeLabel(issueType) {
  const value = String(issueType ?? 'Unknown issue')
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getIssueImage(issue) {
  const image = issue?.imageUrl ?? issue?.image ?? issue?.photo ?? issue?.imagePath
  if (typeof image === 'string') return image
  return image?.url ?? image?.path ?? ''
}

export function getIssueLocation(issue) {
  const address = issue?.address ?? issue?.location?.address ?? issue?.location
  if (typeof address === 'string' && address.trim()) return address
  const latitude = issue?.latitude ?? issue?.location?.latitude ?? issue?.location?.lat
  const longitude = issue?.longitude ?? issue?.location?.longitude ?? issue?.location?.lng
  if (latitude != null && longitude != null) return `${latitude}, ${longitude}`
  return 'Location not provided'
}

export function formatIssueDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()
}