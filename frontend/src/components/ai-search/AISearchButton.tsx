import { Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onToggle: () => void;
}

/**
 * Floating entry point for the global AI assistant — a compact box with an
 * icon inside. Opening it expands the assistant to full width on every size.
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
        aria-label={open ? 'Close UrbanShield AI assistant' : 'Open UrbanShield AI assistant'}
        aria-expanded={open}
        title={open ? 'Close AI assistant' : 'Ask UrbanShield AI'}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white shadow-xl shadow-brand/30 transition-all duration-150 hover:scale-105 hover:bg-brand-warm hover:shadow-brand/40 active:scale-95 md:h-14 md:w-14"
      >
        <span className="flex flex-col items-center gap-0.5">
          <Sparkles size={20} aria-hidden />
          <span className="hidden text-[9px] font-extrabold uppercase leading-none md:inline">
            {open ? 'Close' : 'AI'}
          </span>
        </span>
      </button>
    </div>
  );
}
