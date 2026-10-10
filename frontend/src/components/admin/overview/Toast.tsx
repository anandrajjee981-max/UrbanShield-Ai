import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export interface ToastMsg {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

let nextId = 1;

/** Push a toast into state managed by the page. */
export function makeToast(kind: 'success' | 'error', text: string): ToastMsg {
  return { id: nextId++, kind, text };
}

/** Bottom-right toast stack, auto-dismisses after 4s. */
export function ToastStack({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-[min(92vw,360px)]" role="status" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastMsg; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => onDismiss(toast.id), 200);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const Icon = toast.kind === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className={`flex items-center gap-2.5 bg-card border rounded-2xl px-4 py-3 shadow-xl transition-opacity duration-200 ${
        leaving ? 'opacity-0' : 'opacity-100'
      } ${toast.kind === 'success' ? 'border-civic-green/40' : 'border-brand/40'}`}
    >
      <Icon size={17} className={toast.kind === 'success' ? 'text-civic-green shrink-0' : 'text-brand shrink-0'} aria-hidden />
      <p className="text-xs font-bold text-ink flex-1">{toast.text}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="text-soft hover:text-ink text-sm font-bold px-1 focus-visible:outline-2 focus-visible:outline-brand rounded"
      >
        ×
      </button>
    </div>
  );
}
