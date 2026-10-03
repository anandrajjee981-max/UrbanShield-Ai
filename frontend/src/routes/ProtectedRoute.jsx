import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ShieldAlert } from 'lucide-react'
import { ROLE_HOME, ROLE_LABELS } from '../utils/constants.js'
import { selectIsAuthenticated, selectRole } from '../redux/selectors.js'
import Button from '../components/common/Button.jsx'
import { Link } from 'react-router-dom'
import { PageLoader } from '../components/common/Loader.jsx'

/**
 * Gate for every signed-in route.
 *
 * A visitor without a session is sent to login, with the
 * attempted path in router state so login can return them to it.
 */
export default function ProtectedRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const authStatus = useSelector((state) => state.auth.status)
  const location = useLocation()

  if (authStatus === 'loading' || authStatus === 'idle') {
    return <PageLoader label="Checking authentication..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

/**
 * Role gate. Wraps the citizen area, the authority area and the admin-only
 * pages, so a citizen deep-link into `/authority/...` is redirected to their
 * own dashboard instead of rendering a broken screen.
 */
export function RoleRoute({ allow }) {
  const role = useSelector(selectRole)
  const allowed = Array.isArray(allow) ? allow : [allow]
  const location = useLocation()

  if (!allowed.includes(role)) {
    return <Navigate to={ROLE_HOME[role] ?? '/'} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

/**
 * Explicit "you cannot see this" screen. Used where a silent redirect would be
 * confusing - for example an admin-only page opened from a shared link.
 */
export function AccessDenied() {
  const role = useSelector(selectRole)

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <ShieldAlert size={28} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-ink">Access restricted</h1>
      <p className="mt-2 text-sm leading-relaxed text-body">
        Your current role ({ROLE_LABELS[role] ?? role}) does not have permission to view this page. Switch role or contact
        your administrator if you believe this is a mistake.
      </p>
      <div className="mt-6 flex items-center gap-2.5">
        <Link to={ROLE_HOME[role] ?? '/'}>
          <Button variant="primary" size="sm">
            Go to my dashboard
          </Button>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="sm">
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  )
}
