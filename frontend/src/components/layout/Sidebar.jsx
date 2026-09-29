import { NavLink, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronLeft, LogOut, ShieldCheck, X } from 'lucide-react'
import { APP_NAME, APP_SUBTITLE, NAV_MENUS, ROLES } from '../../utils/constants.js'
import { selectRole, selectSidebarBadges } from '../../redux/selectors.js'
import { selectSidebarCollapsed, setMobileNavOpen, toggleSidebar } from '../../redux/slices/uiSlice.js'
import { switchRole } from '../../redux/slices/authSlice.js'
import RoleSwitcher from './RoleSwitcher.jsx'

/**
 * The one sidebar for the whole product.
 *
 * Desktop renders as a collapsible rail; below `lg` it becomes an off-canvas
 * drawer. The menu is picked from `NAV_MENUS` by role - there is no second
 * citizen sidebar anywhere in the codebase.
 */

function Brand({ collapsed }) {
  return (
    <div className="flex items-center gap-3 overflow-hidden border-b border-white/10 px-4 py-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-navy-900">
        <ShieldCheck size={19} aria-hidden="true" />
      </span>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-white">{APP_NAME}</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-brand-300/70">
            {APP_SUBTITLE.split('&')[0].trim()}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function NavItems({ collapsed, badges, onNavigate }) {
  const role = useSelector(selectRole)
  const items = (NAV_MENUS[role === ROLES.CITIZEN ? 'citizen' : 'authority'] ?? []).filter((item) =>
    item.roles.includes(role),
  )

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const badge = item.badgeKey ? badges[item.badgeKey] : 0

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/citizen' || item.to === '/authority/dashboard'}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-navy-900 shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
                      : 'text-slate-300 hover:bg-white/8 hover:text-white'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className="shrink-0" aria-hidden="true" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    {badge > 0 ? (
                      <span
                        className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                          isActive ? 'bg-navy-900 text-brand-200' : 'bg-risk-high text-white'
                        } ${collapsed ? 'absolute ml-6 -mt-4' : ''}`}
                        aria-label={`${badge} items`}
                      >
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function SidebarBody({ collapsed, badges, onNavigate, onSignOut }) {
  return (
    <div className="flex h-full flex-col bg-navy-700">
      <Brand collapsed={collapsed} />
      <NavItems collapsed={collapsed} badges={badges} onNavigate={onNavigate} />

      <div className="border-t border-white/10 p-3">
        {collapsed ? null : (
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Demo role</p>
        )}
        <RoleSwitcher collapsed={collapsed} />

        <button
          type="button"
          onClick={onSignOut}
          className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/8 hover:text-white ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Reset session"
        >
          <LogOut size={17} aria-hidden="true" />
          {!collapsed ? 'Reset session' : null}
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const dispatch = useDispatch()
  const collapsed = useSelector(selectSidebarCollapsed)
  const badges = useSelector(selectSidebarBadges)
  const mobileOpen = useSelector((state) => state.ui.mobileNavOpen)
  const location = useLocation()

  const closeDrawer = () => dispatch(setMobileNavOpen(false))
  const signOut = () => dispatch(switchRole(ROLES.CITIZEN))

  return (
    <>
      {/* Desktop rail / expanded panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden shrink-0 transition-[width] duration-200 lg:block ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <SidebarBody collapsed={collapsed} badges={badges} onNavigate={() => {}} onSignOut={signOut} />

        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-body shadow-raised transition hover:text-ink"
        >
          <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeDrawer}
            className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
          />
          <div
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-[var(--animate-slide-in)]"
            key={location.pathname}
          >
            <SidebarBody collapsed={false} badges={badges} onNavigate={closeDrawer} onSignOut={signOut} />
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close navigation"
              className="absolute right-3 top-5 rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
