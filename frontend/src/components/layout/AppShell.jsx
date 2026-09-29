import { useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import { Radio } from 'lucide-react'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import MobileNavigation from './MobileNavigation.jsx'
import Toast from '../common/Toast.jsx'
import { selectIsAuthenticated } from '../../redux/selectors.js'
import { selectSidebarCollapsed } from '../../redux/slices/uiSlice.js'
import { selectRealtimeConnected } from '../../redux/slices/notificationSlice.js'

/**
 * The product chrome.
 *
 * Public routes render bare - a marketing page with a sidebar and a sign-out
 * button in it would be wrong - while every signed-in area gets the sidebar,
 * header, mobile tab bar and the global toast stack.
 */
const PUBLIC_PATHS = ['/', '/about']

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export default function AppShell({ children }) {
  const location = useLocation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const collapsed = useSelector(selectSidebarCollapsed)
  const connected = useSelector(selectRealtimeConnected)

  const showChrome = isAuthenticated && !isPublicPath(location.pathname)

  if (!showChrome) {
    return (
      <>
        {children ?? <Outlet />}
        {isAuthenticated ? <Toast /> : null}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />

      {/* Padding has to follow the sidebar, or the rail overlaps the content. */}
      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}>
        <Header />

        <div className="flex items-center justify-end gap-1.5 px-4 pt-3 text-[11px] lg:px-6">
          <Radio
            size={12}
            className={connected ? 'text-brand-500' : 'text-muted'}
            aria-hidden="true"
            style={connected ? { animation: 'var(--animate-shimmer)' } : undefined}
          />
          <span className={connected ? 'font-medium text-brand-600' : 'text-muted'}>
            {connected ? 'Live updates connected' : 'Reconnecting…'}
          </span>
        </div>

        <main className="flex-1 pb-24 lg:pb-8">{children ?? <Outlet />}</main>

        <footer className="hidden border-t border-line px-6 py-4 text-[11px] text-muted lg:block">
          UbranShieldAI · AI-Powered Urban Risk &amp; Civic Intelligence Platform
        </footer>
      </div>

      <MobileNavigation />
      <Toast />
    </div>
  )
}
