import { Inbox, RefreshCw, SearchX } from 'lucide-react'
import Button from './Button.jsx'

/**
 * Empty state.
 *
 * Distinguishes "nothing here yet" from "nothing matched your filters" so the
 * citizen knows whether to change a filter or take an action.
 */
export default function EmptyState({
  title = 'Nothing to show',
  message = 'There is no data for the selected filters.',
  icon,
  action,
  variant = 'filters',
  className = '',
}) {
  const Icon = variant === 'search' ? SearchX : icon ?? Inbox

  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-muted">
        <Icon size={24} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-body">{message}</p>
      {action ? (
        <div className="mt-5">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
