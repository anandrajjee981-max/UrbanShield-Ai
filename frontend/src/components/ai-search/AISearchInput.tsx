import type { RefObject } from 'react';
import { Loader2, Search, Send, X } from 'lucide-react';

interface Props {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * Search field with leading icon, clear affordance and submit action.
 * Enter submits (form), Escape is handled by the parent panel.
 */
export default function AISearchInput({ value, loading, onChange, onSubmit, inputRef }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex h-12 items-center gap-2 rounded-xl border border-line bg-canvas py-1.5 pl-3 pr-1.5 transition-colors focus-within:border-brand">
        <Search size={17} className="shrink-0 text-mute" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask UrbanShield AI..."
          aria-label="Ask UrbanShield AI"
          autoComplete="off"
          className="no-focus-outline w-full min-w-0 border-none bg-transparent text-sm text-ink outline-none ring-0 placeholder:text-mute focus:border-none focus:outline-none focus:ring-0 disabled:opacity-60"
        />
        {value && !loading && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="shrink-0 rounded p-1 text-mute transition-colors hover:text-brand"
          >
            <X size={15} />
          </button>
        )}
        <button
          type="submit"
          disabled={loading || value.trim() === ''}
          aria-label="Submit search"
          title="Search"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-all duration-150 hover:bg-brand-warm active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand"
        >
          {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={15} aria-hidden />}
        </button>
      </div>
    </form>
  );
}
