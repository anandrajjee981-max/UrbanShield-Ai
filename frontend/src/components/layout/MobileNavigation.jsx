import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { MOBILE_NAV_ITEMS } from '../../utils/constants.js'
import { selectRole } from '../../redux/selectors.js'
import { selectUnreadCount } from '../../redux/slices/notificationSlice.js'

/**
 * Bottom tab bar, mobile only.
 *
 * Same `MOBILE_NAV_ITEMS` definition the sidebar is built from, filtered by
 * role - so a citizen and an officer never see each other's destinations.
 */
export default function MobileNavigation() {
  const role = useSelector(selectRole)
  const unread = useSelector(selectUnreadCount)

  const items = MOBILE_NAV_ITEMS.filter((item) => item.roles.includes(role)).slice(0, 5)

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/97 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon
          const isAlerts = item.label === 'Alerts'
          const badge = isAlerts ? unread : 0

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/citizen'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                    isActive ? 'text-brand-600' : 'text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      {item.primary ? (
                        <span className="flex h-9 w-9 -translate-y-2 items-center justify-center rounded-xl bg-brand-500 text-navy-900 shadow-[0_6px_16px_-4px_rgba(5,150,105,0.6)]">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                      ) : (
                        <Icon size={19} aria-hidden="true" className={isActive ? 'text-brand-600' : ''} />
                      )}
                      {badge > 0 ? (
                        <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-high px-1 text-[9px] font-bold text-white">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      ) : null}
                    </span>
                    <span className={item.primary ? '-mt-1' : ''}>{item.label}</span>
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
