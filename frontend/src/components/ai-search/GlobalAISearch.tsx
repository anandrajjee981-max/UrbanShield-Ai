import { useCallback, useEffect, useState } from 'react';
import AISearchButton from './AISearchButton';
import AISearchPanel, { type SearchStatus } from './AISearchPanel';
import { useAppSelector } from '../../store/hooks';
import {
  ROLE_SUGGESTIONS,
  mockAiSearch,
  type AiSearchResponse,
  type AiSearchRole,
} from '../../services/aiSearchMock';

/**
 * GlobalAISearch — mounted ONCE inside the Router in App.tsx so the floating
 * "Ask AI" button is available on every page without per-page wiring.
 *
 * Frontend UI only: queries resolve through `mockAiSearch` (temporary demo
 * data). Swap that call for the real backend AI Search endpoint later —
 * the UI below stays unchanged.
 */
export default function GlobalAISearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [response, setResponse] = useState<AiSearchResponse | null>(null);

  // Role-aware suggestions only — reads the EXISTING auth state,
  // creates no new auth logic. Guests see the CITIZEN-style defaults.
  const role = useAppSelector((s) => s.auth.user?.role) as AiSearchRole | undefined;
  const suggestions = ROLE_SUGGESTIONS[role ?? 'GUEST'];

  const runSearch = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (q === '') return;
      setStatus('loading');
      setResponse(null);
      mockAiSearch(q, role ?? 'GUEST').then(
        (res) => {
          setResponse(res);
          setStatus(res.items.length === 0 ? 'empty' : 'results');
        },
        () => {
          setStatus('error');
        },
      );
    },
    [role],
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Escape closes the panel. A fresh open resets to the suggestions view.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Keep background scroll locked while open on small screens, where the
  // panel behaves like a bottom sheet.
  useEffect(() => {
    if (!open || window.innerWidth >= 640) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <AISearchPanel
          query={query}
          status={status}
          response={response}
          suggestions={suggestions}
          onQueryChange={setQuery}
          onSubmit={() => runSearch(query)}
          onPickSuggestion={(s) => {
            setQuery(s);
            runSearch(s);
          }}
          onRetry={() => runSearch(query)}
          onClearResults={() => {
            setQuery('');
            setResponse(null);
            setStatus('idle');
          }}
          onNavigate={close}
          onClose={close}
        />
      )}
      <div className="flex justify-end">
        <AISearchButton
          open={open}
          onToggle={() => {
            if (open) {
              close();
            } else {
              setStatus('idle');
              setResponse(null);
              setOpen(true);
            }
          }}
        />
      </div>
    </div>
  );
}
