/**
 * Single source of truth for the Admin Operations Overview design language.
 * Keep every color / spacing / radius value here so the dashboard stays
 * consistent. Components must import from this file, never hard-code hexes.
 *
 * Theme: dark bark sidebar (in AdminLayout), dark-mode-aware cards, single
 * orange brand accent (#ff5f3d in dark, #f84424 in light).
 */

export const overviewTokens = {
  radius: {
    card: 'rounded-2xl',
    pill: 'rounded-full',
    control: 'rounded-xl',
  },
  spacing: {
    page: 'space-y-5',
    grid: 'gap-3 sm:gap-4',
  },
  chart: {
    /** Donut / pie slices — color-blind-distinguishable, AA on dark + light. */
    categories: ['#ff5f3d', '#4482ea', '#51933a', '#f7b907', '#fb9c47', '#8a7f63'],
    trendStroke: '#ff5f3d',
    trendFill: 'rgba(255,95,61,0.14)',
    grid: 'var(--grid)',
  },
} as const;

/** Status → badge classes. Green = done, amber = waiting, red = rejected. */
export const statusBadgeCls: Record<string, string> = {
  REPORTED: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  PENDING: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  VERIFIED: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  RESOLVED: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  REJECTED: 'bg-brand/10 text-brand border-brand/30',
};

export const statusDotCls: Record<string, string> = {
  REPORTED: 'bg-civic-amber',
  PENDING: 'bg-civic-amber',
  VERIFIED: 'bg-civic-green',
  RESOLVED: 'bg-civic-green',
  REJECTED: 'bg-brand',
};
