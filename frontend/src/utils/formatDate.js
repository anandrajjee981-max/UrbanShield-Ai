/** Date helpers. Everything renders in a single, predictable format. */

const DAY = 24 * 60 * 60 * 1000

/** ISO string -> `12 Sep 2026, 10:30 AM` */
export function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return `${formatDate(date)}, ${formatTime(date)}`
}

/** ISO string -> `12 Sep 2026` */
export function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** ISO string -> `10:30 AM` */
export function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const hours = date.getHours()
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 === 0 ? 12 : hours % 12

  return `${String(display).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${suffix}`
}

/** ISO string -> `2 hours ago` */
export function formatRelativeTime(value) {
  if (!value) return '-'
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return '-'

  const diff = Date.now() - timestamp
  if (diff < 0) return 'just now'

  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`

  return formatDate(value)
}

/** `true` when `date` falls inside the last `days` days. */
export function isWithinDays(date, days) {
  if (!date) return false
  if (days === null || days === undefined) return true
  return Date.now() - new Date(date).getTime() <= days * DAY
}

/** Resolves a date-range key to a concrete `{ from, to }` window. */
export function resolveDateRange(rangeKey, customRange) {
  const now = new Date()

  if (rangeKey === 'custom' && customRange?.from && customRange?.to) {
    return { from: new Date(customRange.from), to: new Date(customRange.to) }
  }

  const days = { today: 1, '7d': 7, '30d': 30, month: 30 }[rangeKey] ?? 30
  return { from: new Date(now.getTime() - days * DAY), to: now }
}

/** Calendar label for a dashboard/analytics header, e.g. `30 Sep 2026 - 29 Oct 2026`. */
export function formatDateRangeLabel(rangeKey, customRange) {
  const { from, to } = resolveDateRange(rangeKey, customRange)
  return `${formatDate(from)} - ${formatDate(to)}`
}

/** Builds the last `count` day labels ending today - feeds trend charts. */
export function buildDayLabels(count) {
  const today = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getTime() - (count - 1 - index) * DAY)
    return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`
  })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
