import { useEffect, useRef } from 'react';
import { RotateCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import AISearchInput from './AISearchInput';
import AISearchMessage, { type ChatMessage } from './AISearchMessage';
import AISearchSuggestions from './AISearchSuggestions';

interface Props {
  messages: ChatMessage[];
  draft: string;
  loading: boolean;
  suggestions: string[];
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onPickSuggestion: (suggestion: string) => void;
  onRetry: () => void;
  onNewChat: () => void;
  onClose: () => void;
}

/**
 * Assistant panel. Expands to full width (full screen) on every screen size so
 * the AI dashboard uses the whole viewport; the header, conversation and
 * composer keep the existing look. Message bubbles stay comfortably narrow.
 */
export default function AISearchPanel({
  messages,
  draft,
  loading,
  suggestions,
  onDraftChange,
  onSubmit,
  onPickSuggestion,
  onRetry,
  onNewChat,
  onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Autofocus the input when the panel opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const isEmpty = messages.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="UrbanShield AI assistant"
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-card"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-line bg-cream px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <ShieldCheck size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold leading-tight">UrbanShield AI</p>
          <p className="truncate text-[11px] font-semibold leading-tight text-mute">
            Ask about your city, reports &amp; tasks
          </p>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={onNewChat}
            aria-label="Start a new chat"
            title="New chat"
            className="shrink-0 rounded-lg p-2 text-mute transition-colors hover:bg-canvas hover:text-brand"
          >
            <RotateCw size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI assistant"
          className="shrink-0 rounded-lg p-2 text-mute transition-colors hover:bg-canvas hover:text-brand"
        >
          <X size={17} />
        </button>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3.5">
        {isEmpty && !loading && (
          <AISearchSuggestions suggestions={suggestions} disabled={false} onPick={onPickSuggestion} />
        )}

        {!isEmpty && (
          <div className="space-y-3">
            {messages.map((message) => (
              <AISearchMessage key={message.id} message={message} onRetry={onRetry} />
            ))}
          </div>
        )}

        {loading && (
          <div role="status" aria-live="polite" className="mt-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft">
              <Sparkles size={15} className="animate-pulse text-brand" aria-hidden />
            </span>
            <span className="text-xs font-semibold text-mute">Thinking…</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-card px-4 py-3">
        <AISearchInput
          value={draft}
          loading={loading}
          onChange={onDraftChange}
          onSubmit={onSubmit}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
