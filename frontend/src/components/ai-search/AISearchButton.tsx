import { ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  onToggle: () => void;
}

/**
 * Floating entry point for the global AI search.
 * Desktop: pill with logo + label. Mobile: compact circular icon.
 */
export default function AISearchButton({ open, onToggle }: Props) {
  return (
    <div className="group relative">
      {/* Tooltip — desktop only, hidden when the panel is open */}
      {!open && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 md:block"
        >
          Ask UrbanShield AI
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Close UrbanShield AI search' : 'Ask UrbanShield AI'}
        aria-expanded={open}
        title={open ? 'Close AI search' : 'Ask UrbanShield AI'}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition-all duration-150 hover:scale-105 hover:bg-brand-warm hover:shadow-brand/40 active:scale-95 md:h-auto md:w-auto md:gap-2 md:rounded-full md:px-5 md:py-3"
      >
        <ShieldCheck size={22} className="shrink-0" aria-hidden />
        <span className="hidden text-sm font-bold md:inline">{open ? 'Close' : 'Ask AI'}</span>
      </button>
    </div>
  );
}
