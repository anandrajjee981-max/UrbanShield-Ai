import { Loader2 } from 'lucide-react'

/** Inline spinner for buttons, table cells and small panels. */
export default function Loader({ size = 20, label = 'Loading', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2.5 text-body ${className}`} role="status" aria-live="polite">
      <Loader2 size={size} className="animate-spin text-brand-500" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

/** Full-panel loader for route-level suspense fallbacks. */
export function PageLoader({ label = 'Loading workspace' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Loader2 size={30} className="animate-spin text-brand-500" aria-hidden="true" />
      <p className="text-sm text-body">{label}</p>
    </div>
  )
}
