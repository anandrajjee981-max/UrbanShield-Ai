import { TrendingDown, TrendingUp } from 'lucide-react'
import { RISK_CATEGORY_COLORS } from '../../utils/colors.js'

/**
 * KPI tile for the dashboard and analytics headers.
 *
 * Renders whatever the selector gives it - it never invents a value, so the
 * "12 / 28 / 35 / 112" style numbers in the design come from the API.
 */

const TONE = {
  high: { icon: 'bg-red-50 text-risk-high', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  medium: { icon: 'bg-amber-50 text-risk-medium', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  low: { icon: 'bg-green-50 text-risk-low', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  heat: { icon: 'bg-red-50 text-risk-heat', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  water: { icon: 'bg-blue-50 text-blue-500', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  garbage: { icon: 'bg-brand-50 text-brand-600', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  road: { icon: 'bg-amber-50 text-amber-500', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  infrastructure: { icon: 'bg-violet-50 text-violet-600', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  info: { icon: 'bg-blue-50 text-blue-500', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  warning: { icon: 'bg-amber-50 text-amber-600', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
  success: { icon: 'bg-green-50 text-green-600', trendUp: 'text-risk-high', trendDown: 'text-brand-600' },
}

export default function StatCard({ label, value, trend, isUp, tone = 'info', icon: Icon, suffix, footer, className = '' }) {
  const palette = TONE[tone] ?? TONE.info
  const hasTrend = typeof trend === 'number' && trend !== 0
  const TrendIcon = isUp ? TrendingUp : TrendingDown

  return (
    <article className={`card card-interactive p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${palette.icon}`}>
            <Icon size={18} aria-hidden="true" />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-body">{label}</p>
          <p className="mt-1 flex items-baseline gap-1 text-2xl font-bold leading-none tracking-tight text-ink">
            {value ?? 0}
            {suffix ? <span className="text-xs font-medium text-muted">{suffix}</span> : null}
          </p>

          <div className="mt-2 flex items-center gap-2">
            {hasTrend ? (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${isUp ? palette.trendUp : palette.trendDown}`}>
                <TrendIcon size={11} aria-hidden="true" />
                {Math.abs(trend)}%
              </span>
            ) : null}
            {footer ? <span className="truncate text-[10px] text-muted">{footer}</span> : null}
          </div>
        </div>
      </div>
    </article>
  )
}

/** Slim progress row - used for ward risk breakdowns and department load. */
export function StatBar({ label, value, max, color = RISK_CATEGORY_COLORS.water, trailing }) {
  const percent = max ? Math.min(100, Math.round((value / max) * 100)) : 0

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-body">{label}</span>
        <span className="font-semibold text-ink">{trailing ?? value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
