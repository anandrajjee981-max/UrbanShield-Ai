/**
 * CSV export.
 *
 * Shared by the authority register and the citizen "my reports" view so both
 * produce the same columns, escaping rules and filename shape.
 */

const COLUMNS = [
  ['Tracking ID', (report) => report.trackingId],
  ['Issue', (report) => report.issueLabel],
  ['Category', (report) => report.category],
  ['Ward', (report) => report.ward],
  ['Address', (report) => report.address],
  ['Status', (report) => report.status],
  ['Priority', (report) => report.priority],
  ['Department', (report) => report.department?.shortName ?? report.department?.name ?? ''],
  ['Assignee', (report) => report.assignee?.name ?? ''],
  ['Created', (report) => report.createdAt],
  ['Updated', (report) => report.updatedAt],
]

function escapeCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

/**
 * Triggers a browser download of the given reports.
 *
 * @returns {number} row count written, or 0 when there was nothing to export.
 */
export function exportReportsToCsv(reports = [], prefix = 'urbanshield-reports') {
  if (!reports.length) return 0

  const rows = reports.map((report) => COLUMNS.map(([, read]) => read(report)))
  const csv = [COLUMNS.map(([header]) => header), ...rows].map((row) => row.map(escapeCell).join(',')).join('\n')

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)

  return reports.length
}
