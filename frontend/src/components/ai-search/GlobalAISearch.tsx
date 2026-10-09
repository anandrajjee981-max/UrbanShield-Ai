import { useCallback, useEffect, useRef, useState } from 'react';
import AISearchButton from './AISearchButton';
import AISearchPanel from './AISearchPanel';
import type { ChatMessage } from './AISearchMessage';
import { useAppSelector } from '../../store/hooks';
import { ROLE_SUGGESTIONS, type AiSearchRole } from '../../services/aiSearchMock';
import { sendAiChat, type AiChatHistoryTurn } from '../../services/aiAssistant';
import { getApiErrorMessage } from '../../services/api';

/** Prior turns sent back for context; matches the backend's default cap. */
const MAX_HISTORY_TURNS = 6;

const newId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * GlobalAISearch — mounted ONCE inside the Router in App.tsx so the floating
 * "Ask AI" assistant is available on every dashboard.
 *
 * The panel is a conversation over the real backend (`POST /api/ai/chat`). The
 * caller's role comes from the existing auth state; the backend re-derives it
 * from the JWT and scopes the answer, so the client sends only the question.
 */
export default function GlobalAISearch() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  // Bumped on every send and on "New chat" so a stale in-flight answer is ignored.
  const requestSeq = useRef(0);

  // Role-aware suggestions only — reads the EXISTING auth state,
  // creates no new auth logic. Guests see the CITIZEN-style defaults.
  const role = useAppSelector((s) => s.auth.user?.role) as AiSearchRole | undefined;
  const suggestions = ROLE_SUGGESTIONS[role ?? 'GUEST'];

  const sendMessage = useCallback(
    (raw: string, appendUser: boolean) => {
      const text = raw.trim();
      if (text === '' || loading) return;

      const history: AiChatHistoryTurn[] = messages
        .filter((m) => !m.isError)
        .slice(-MAX_HISTORY_TURNS * 2)
        .map((m) => ({ role: m.role, content: m.text }));

      if (appendUser) {
        setMessages((prev) => [...prev, { id: newId(), role: 'user', text }]);
      }
      setDraft('');
      setLoading(true);

      const seq = (requestSeq.current += 1);

      sendAiChat({ message: text, history }).then(
        (data) => {
          if (seq !== requestSeq.current) return;
          setMessages((prev) => [...prev, { id: newId(), role: 'assistant', text: data.message, data }]);
          setLoading(false);
        },
        (error: unknown) => {
          if (seq !== requestSeq.current) return;
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: 'assistant',
              text: getApiErrorMessage(error, 'The AI assistant is unavailable right now. Please try again.'),
              isError: true,
            },
          ]);
          setLoading(false);
        },
      );
    },
    [loading, messages],
  );

  const retry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setMessages((prev) => prev.filter((m) => !m.isError));
    sendMessage(lastUser.text, false);
  }, [messages, sendMessage]);

  const newChat = useCallback(() => {
    requestSeq.current += 1;
    setMessages([]);
    setDraft('');
    setLoading(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Keep background scroll locked while the assistant is open (full screen now).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <AISearchPanel
          messages={messages}
          draft={draft}
          loading={loading}
          suggestions={suggestions}
          onDraftChange={setDraft}
          onSubmit={() => sendMessage(draft, true)}
          onPickSuggestion={(s) => sendMessage(s, true)}
          onRetry={retry}
          onNewChat={newChat}
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
              setOpen(true);
            }
          }}
        />
      </div>
    </div>
  );
}
