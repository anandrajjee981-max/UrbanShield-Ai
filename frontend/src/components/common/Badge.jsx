/**
 * Compact status / severity pill.
 *
 * `tone` is the semantic API; colours come from the theme tokens, so a badge
 * always matches the matching severity dot on the map and the matching series
 * in a chart.
 */

const TONES = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-green-50 text-green-700 ring-green-200',
  success: 'bg-green-50 text-green-700 ring-green-200',
  minimal: 'bg-brand-50 text-brand-700 ring-brand-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  water: 'bg-blue-50 text-blue-700 ring-blue-200',
  infrastructure: 'bg-violet-50 text-violet-700 ring-violet-200',
  ai: 'bg-violet-50 text-violet-700 ring-violet-200',
  environment: 'bg-teal-50 text-teal-700 ring-teal-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  muted: 'bg-slate-100 text-slate-500 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
}

const SIZES = {
  sm: 'h-5 px-2 text-[10px] gap-1',
  md: 'h-6 px-2.5 text-[11px] gap-1.5',
  lg: 'h-7 px-3 text-xs gap-1.5',
}

const DOT_TONES = {
  high: 'bg-risk-high',
  danger: 'bg-risk-high',
  medium: 'bg-risk-medium',
  warning: 'bg-risk-medium',
  low: 'bg-risk-low',
  success: 'bg-risk-low',
  minimal: 'bg-brand-500',
  info: 'bg-blue-500',
  water: 'bg-blue-500',
  infrastructure: 'bg-violet-500',
  ai: 'bg-violet-600',
  environment: 'bg-teal-500',
  neutral: 'bg-slate-400',
  muted: 'bg-slate-400',
  brand: 'bg-brand-500',
}

export default function Badge({ children, tone = 'neutral', size = 'md', dot = false, icon: Icon, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset ${
        TONES[tone] ?? TONES.neutral
      } ${SIZES[size] ?? SIZES.md} ${className}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone] ?? DOT_TONES.neutral}`} aria-hidden="true" /> : null}
      {Icon ? <Icon size={11} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}
