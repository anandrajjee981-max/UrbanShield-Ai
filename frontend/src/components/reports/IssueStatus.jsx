const STATUS_STYLES = {
  REPORTED: 'border-amber-200 bg-amber-50 text-amber-800',
  VERIFIED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
}

export default function IssueStatus({ status }) {
  const normalized = String(status ?? 'REPORTED').toUpperCase()
  const label = normalized.replaceAll('_', ' ')

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[normalized] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      {label}
    </span>
  )
}