import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

/* Shared admin primitives in the citizen-app civic theme. */

const badgeStyles: Record<string, string> = {
  // Issue lifecycle
  REPORTED: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  PENDING: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  ASSIGNED: 'bg-civic-blue/10 text-civic-blue border-civic-blue/30',
  IN_PROGRESS: 'bg-civic-blue/10 text-civic-blue border-civic-blue/30',
  VERIFIED: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  RESOLVED: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  REJECTED: 'bg-brand/10 text-brand border-brand/30',
  // Severity / misc
  CRITICAL: 'bg-brand/10 text-brand border-brand/30',
  HIGH: 'bg-brand/10 text-brand border-brand/30',
  MEDIUM: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  LOW: 'bg-canvas text-soft border-line',
  SUBMIT: 'bg-canvas text-soft border-line',
  RESUBMIT: 'bg-civic-blue/10 text-civic-blue border-civic-blue/30',
  VERIFY: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  REJECT: 'bg-brand/10 text-brand border-brand/30',
};

export function StatusBadge({ value }: { value: string }) {
  const key = value.toUpperCase().replace(/[\s-]/g, '_');
  const style = badgeStyles[key] ?? 'bg-canvas text-soft border-line';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap text-[11px] font-bold px-2.5 py-1 rounded-full border ${style}`}
    >
      {value.replace(/_/g, ' ')}
    </span>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4 animate-pulse" aria-busy="true">
      <div className="h-4 w-1/3 bg-line rounded mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-canvas rounded mb-2 last:mb-0" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden" aria-busy="true">
      <div className="h-11 bg-canvas border-b border-line animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 border-b border-line last:border-0 animate-pulse px-4 flex items-center gap-3">
          <div className="h-3 w-16 bg-line rounded" />
          <div className="h-3 flex-1 bg-canvas rounded" />
          <div className="h-5 w-20 bg-line rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title,
  retryLabel = 'Try Again',
  onRetry,
}: {
  title: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-card border border-brand/30 rounded-2xl p-8 text-center">
      <div className="mx-auto w-11 h-11 rounded-full bg-brand-soft text-brand flex items-center justify-center mb-3">
        <AlertTriangle size={20} />
      </div>
      <p className="font-bold text-ink text-sm">{title}</p>
      <p className="text-xs text-mute mt-1">Check your connection and permissions, then retry.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
        >
          <RefreshCw size={15} /> {retryLabel}
        </button>
      )}
    </div>
  );
}

export function ForbiddenState() {
  return (
    <div className="bg-card border border-line rounded-2xl p-10 text-center max-w-lg mx-auto">
      <div className="mx-auto w-11 h-11 rounded-full bg-civic-amber/15 text-civic-amber-dark flex items-center justify-center mb-3">
        <AlertTriangle size={20} />
      </div>
      <p className="font-bold text-ink">You do not have permission to access this area.</p>
      <p className="text-xs text-mute mt-1">This section is restricted to administrators.</p>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="bg-card border border-dashed border-line rounded-2xl p-8 text-center">
      <div className="mx-auto w-11 h-11 rounded-full bg-canvas text-mute flex items-center justify-center mb-3">
        <Inbox size={20} />
      </div>
      <p className="font-bold text-soft text-sm">{title}</p>
      {hint && <p className="text-xs text-mute mt-1">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">{title}</h1>
        <p className="text-xs sm:text-sm text-mute mt-0.5">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const inputCls =
  'bg-card border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 w-full';

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmTone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmTone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-md bg-card border border-line rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-extrabold text-ink">{title}</h2>
        <p className="text-sm text-soft mt-1.5 leading-relaxed">{message}</p>
        {children && <div className="mt-3">{children}</div>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 font-bold text-sm px-4 py-3 rounded-xl border border-line bg-card text-soft hover:border-brand disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 font-bold text-sm px-4 py-3 rounded-xl text-white disabled:opacity-60 ${
              confirmTone === 'danger' ? 'bg-brand hover:bg-brand-warm' : 'bg-civic-green hover:opacity-90'
            }`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
