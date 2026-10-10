import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Sparkline } from './Sparkline';

/**
 * Clickable KPI card: button semantics + keyboard focus ring come free from
 * <button>. Navigates to a filtered list (e.g. /admin/issues?status=REPORTED).
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  delta,
  spark,
  onOpen,
  openLabel,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: LucideIcon;
  accent: string;
  /** % change vs previous week. 0/undefined hides the pill. */
  delta?: number;
  /** 14 daily counts for the mini sparkline. */
  spark?: number[];
  onOpen: () => void;
  openLabel: string;
}) {
  const TrendIcon = delta === undefined || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const trendCls =
    delta === undefined || delta === 0
      ? 'bg-canvas text-soft border-line'
      : delta > 0
        ? 'bg-civic-green/10 text-civic-green border-civic-green/30'
        : 'bg-brand/10 text-brand border-brand/30';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${openLabel}: ${label}, ${value}`}
      className="group text-left bg-card border border-line rounded-2xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:border-brand/50 focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 ${accent}`}>
          <Icon size={19} aria-hidden />
        </div>
        {delta !== undefined && delta !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${trendCls}`}
            aria-label={`${delta > 0 ? '+' : ''}${delta}% versus last week`}
          >
            <TrendIcon size={12} aria-hidden />
            {delta > 0 ? `+${delta}%` : `${delta}%`}
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold leading-none text-ink mt-3">{value}</p>
      <p className="text-xs font-bold text-soft mt-1">{label}</p>
      <p className="text-[11px] text-soft mt-0.5">{sub}</p>
      {spark && spark.length > 1 && (
        <div className="mt-2 -mb-1" aria-hidden>
          <Sparkline data={spark} />
        </div>
      )}
    </button>
  );
}
