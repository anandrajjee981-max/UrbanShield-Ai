import { useEffect, useRef } from 'react';
import { ShieldCheck, SearchX, TriangleAlert, X } from 'lucide-react';
import AISearchInput from './AISearchInput';
import AISearchResults from './AISearchResults';
import AISearchSuggestions from './AISearchSuggestions';
import type { AiSearchResponse } from '../../services/aiSearchMock';

export type SearchStatus = 'idle' | 'loading' | 'results' | 'empty' | 'error';

interface Props {
  query: string;
  status: SearchStatus;
  response: AiSearchResponse | null;
  suggestions: string[];
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onPickSuggestion: (suggestion: string) => void;
  onRetry: () => void;
  onClearResults: () => void;
  onNavigate: () => void;
  onClose: () => void;
}

/**
 * Floating search panel. Desktop: fixed card above the button.
 * Mobile: bottom sheet, almost full width, never overflows the viewport.
 */
export default function AISearchPanel({
  query,
  status,
  response,
  suggestions,
  onQueryChange,
  onSubmit,
  onPickSuggestion,
  onRetry,
  onClearResults,
  onNavigate,
  onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Autofocus the input when the panel opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loading = status === 'loading';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="UrbanShield AI search"
      className="fixed z-50 flex max-h-[min(34rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[26rem] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl bottom-[4.75rem] right-4 sm:bottom-[5.5rem] sm:right-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-line bg-cream px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <ShieldCheck size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold leading-tight">UrbanShield AI</p>
          <p className="truncate text-[11px] font-semibold leading-tight text-mute">Search UrbanShieldAI</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI search"
          className="shrink-0 rounded-lg p-2 text-mute transition-colors hover:bg-canvas hover:text-brand"
        >
          <X size={17} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <AISearchInput
          value={query}
          loading={loading}
          onChange={onQueryChange}
          onSubmit={onSubmit}
          inputRef={inputRef}
        />

        <div className="mt-3.5">
          {status === 'idle' && (
            <AISearchSuggestions suggestions={suggestions} disabled={false} onPick={onPickSuggestion} />
          )}

          {status === 'loading' && (
            <div role="status" aria-live="polite" className="py-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft">
                <ShieldCheck size={22} className="animate-pulse text-brand" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold">Thinking...</p>
              <p className="mt-0.5 text-xs text-mute">Searching across UrbanShieldAI</p>
            </div>
          )}

          {status === 'results' && response && (
            <AISearchResults
              summary={response.summary}
              items={response.items}
              onNavigate={onNavigate}
              onClear={onClearResults}
            />
          )}

          {status === 'empty' && (
            <div role="status" className="py-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-mute">
                <SearchX size={20} aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold">No results found.</p>
              <p className="mx-auto mt-1 max-w-60 text-xs text-mute">
                Try searching with a different phrase.
              </p>
              <div className="mt-4 text-left">
                <AISearchSuggestions suggestions={suggestions} disabled={false} onPick={onPickSuggestion} />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div role="alert" className="py-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                <TriangleAlert size={20} aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold">Something went wrong.</p>
              <p className="mt-1 text-xs text-mute">Please try again.</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white transition-all duration-150 hover:bg-brand-warm active:scale-95"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
