import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { dismissToast, selectToasts } from '../../redux/slices/uiSlice.js'

/**
 * Toast stack.
 *
 * Mounted once in the app shell. Mutations dispatch `addToast` from the hooks,
 * so no component renders feedback markup itself.
 */

const TONES = {
  success: { icon: CheckCircle2, className: 'border-green-200 bg-green-50 text-green-800', iconClass: 'text-green-600' },
  danger: { icon: XCircle, className: 'border-red-200 bg-red-50 text-red-800', iconClass: 'text-risk-high' },
  warning: { icon: AlertTriangle, className: 'border-amber-200 bg-amber-50 text-amber-800', iconClass: 'text-risk-medium' },
  info: { icon: Info, className: 'border-blue-200 bg-blue-50 text-blue-800', iconClass: 'text-blue-600' },
}

function ToastItem({ toast }) {
  const dispatch = useDispatch()
  const tone = TONES[toast.tone] ?? TONES.info
  const Icon = tone.icon

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), toast.duration)
    return () => clearTimeout(timer)
  }, [dispatch, toast.id, toast.duration])

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-3.5 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.2)] animate-[var(--animate-slide-in)] ${tone.className}`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${tone.iconClass}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
        {toast.message ? <p className="mt-0.5 text-xs leading-relaxed opacity-90">{toast.message}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function Toast() {
  const toasts = useSelector(selectToasts)

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[1200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
