import { ServerCrash, WifiOff } from 'lucide-react'
import Button from './Button.jsx'

/**
 * Error state.
 *
 * Distinguishes an offline client from a server failure, because the action the
 * user should take is different in each case.
 */
export default function ErrorState({ title, message, onRetry, className = '', offline = false, compact = false }) {
  const Icon = offline ? WifiOff : ServerCrash

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center px-6 text-center ${compact ? 'py-8' : 'py-14'} ${className}`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-risk-high">
        <Icon size={24} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">{title ?? (offline ? 'You appear to be offline' : 'Something went wrong')}</h3>
      <p className="mt-1.5 max-w-md text-sm text-body">
        {message ?? 'The data could not be loaded. Check your connection and try again.'}
      </p>
      {onRetry ? (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}
