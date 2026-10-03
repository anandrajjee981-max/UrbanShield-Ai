import { useSelector } from 'react-redux'

/**
 * Displays the authenticated identity returned by the backend.
 */

export default function RoleSwitcher({ collapsed = false }) {
  const user = useSelector((state) => state.auth.user)
  const displayName = user?.name ?? 'User'
  const roleLabel = user?.roleLabel ?? user?.role ?? 'User'

  if (collapsed) {
    return (
      <div className="flex justify-center" title={`${displayName} · ${roleLabel}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-xs font-bold text-brand-300">
          {displayName.charAt(0)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-white/8 px-3 py-2 text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-[11px] font-bold text-navy-900">
          {(user?.name ?? 'U').charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{displayName}</span>
          <span className="block truncate text-[10px] text-slate-400">{roleLabel}</span>
        </span>
    </div>
  )
}
