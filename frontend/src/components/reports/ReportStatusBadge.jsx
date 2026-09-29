import Badge from '../common/Badge.jsx'
import { REPORT_STATUS_LABELS } from '../../utils/constants.js'

/**
 * Status and priority presentation, shared by the table, the detail view, the
 * map popup and the citizen list so the same report never wears two colours.
 */

const TONE = {
  reported: 'danger',
  verified: 'warning',
  assigned: 'info',
  in_progress: 'infrastructure',
  resolved: 'success',
  rejected: 'neutral',
}

const DOT_CLASS = {
  reported: 'bg-risk-high',
  verified: 'bg-risk-medium',
  assigned: 'bg-blue-500',
  in_progress: 'bg-violet-500',
  resolved: 'bg-brand-500',
  rejected: 'bg-slate-400',
}

export function StatusBadge({ status, size = 'sm', showDot = true }) {
  return (
    <Badge tone={TONE[status] ?? 'neutral'} size={size} dot={showDot}>
      {REPORT_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}

export function PriorityBadge({ priority, size = 'sm' }) {
  return (
    <Badge tone={priority} size={size}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  )
}

export function StatusDot({ status }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[status] ?? DOT_CLASS.rejected}`} aria-hidden="true" />
}

export default StatusBadge
