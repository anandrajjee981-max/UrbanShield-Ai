import type { ReactNode } from 'react';
import { statusBadgeCls } from './tokens';

/**
 * Colored status badge — green (verified/resolved), amber (pending/reported),
 * red (rejected). Always pairs color with text so meaning never depends on
 * color alone (a11y).
 */
export function StatusBadge({ value }: { value: string }) {
  const key = value.toUpperCase().replace(/[\s-]/g, '_');
  const style = statusBadgeCls[key] ?? 'bg-canvas text-soft border-line';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap text-[11px] font-bold px-2.5 py-1 rounded-full border ${style}`}
    >
      {value.replace(/_/g, ' ')}
    </span>
  );
}

/** Category chip — neutral outline so it never competes with the status badge. */
export function CategoryChip({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-full bg-canvas text-soft border border-line">
      {value.replace(/_/g, ' ')}
    </span>
  );
}

/** Card shell shared by every overview panel. */
export function ChartCard({
  title,
  sub,
  action,
  children,
  className = '',
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-card border border-line rounded-2xl p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="font-extrabold text-sm text-ink">{title}</h2>
          {sub && <p className="text-xs text-soft mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
