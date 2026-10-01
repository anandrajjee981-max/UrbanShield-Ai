import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Check, ChevronsUpDown, Shield, User, UserCog, Users } from 'lucide-react'
import { ROLES, ROLE_HOME } from '../../utils/constants.js'
import { MOCK_USERS } from '../../mock/users.js'
import { switchRole } from '../../redux/slices/authSlice.js'

/**
 * Demo identity switcher.
 *
 * Stands in for real authentication: switching a role re-homes the user to that
 * role's landing page and swaps the sidebar menu, so every role-based route can
 * be reviewed without three logins.
 */

const OPTIONS = [
  { role: ROLES.CITIZEN, label: 'Citizen', description: 'Report and track issues', icon: User },
  { role: ROLES.AUTHORITY, label: 'Authority', description: 'Operate the control room', icon: Shield },
  { role: ROLES.ADMIN, label: 'Admin', description: 'Users and system settings', icon: UserCog },
]

export default function RoleSwitcher({ collapsed = false }) {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const [open, setOpen] = useState(false)
  const isDemoUser = Object.values(MOCK_USERS).some((demoUser) => demoUser.id === user?.id)
  const displayName = user?.name ?? 'User'
  const roleLabel = user?.roleLabel ?? user?.role ?? 'User'

  if (!isDemoUser) {
    return collapsed ? (
      <div className="flex justify-center" title={`${displayName} · ${roleLabel}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-xs font-bold text-brand-300">
          {displayName.charAt(0)}
        </span>
      </div>
    ) : (
      <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-white/8 px-3 py-2 text-white">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500 text-[11px] font-bold text-navy-900">
          {displayName.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{displayName}</span>
          <span className="block truncate text-[10px] text-slate-400">{roleLabel}</span>
        </span>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="group relative flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Switch demo role"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-brand-300 transition hover:bg-white/15"
        >
          <Users size={17} />
        </button>
        {open ? (
          <div className="absolute left-full top-0 z-50 ml-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop">
            {OPTIONS.map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => {
                  dispatch(switchRole(option.role))
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink transition hover:bg-slate-50"
              >
                <option.icon size={15} className="text-body" />
                <span className="flex-1">{option.label}</span>
                {user?.role === option.role ? <Check size={14} className="text-brand-600" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-lg bg-white/8 px-3 py-2 text-left text-white transition hover:bg-white/15"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-[11px] font-bold text-navy-900">
          {(user?.name ?? 'U').charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{user?.roleLabel ?? 'Guest'}</span>
          <span className="block truncate text-[10px] text-slate-400">Switch role</span>
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop"
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon
            const active = user?.role === option.role

            return (
              <button
                key={option.role}
                type="button"
                role="menuitem"
                onClick={() => {
                  dispatch(switchRole(option.role))
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <Icon size={15} className="text-body" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-ink">{option.label}</span>
                  <span className="block text-[10px] text-muted">{option.description}</span>
                </span>
                {active ? <Check size={14} className="text-brand-600" aria-hidden="true" /> : null}
              </button>
            )
          })}
          <p className="border-t border-line px-3 pt-2 pb-1 text-[10px] leading-relaxed text-muted">
            Demo switcher. Replaces the login screen while the backend is pending.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export { ROLE_HOME }
