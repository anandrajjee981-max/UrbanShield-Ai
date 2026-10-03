import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectRole } from '../redux/selectors.js'
import { ROLES, ROLE_HOME } from '../utils/constants.js'

/**
 * Role gates.
 *
 * A blocked visitor is sent to *their own* home, never back into the area that
 * refused them - redirecting a citizen to `/authority/dashboard` would only
 * re-enter this same guard and loop.
 */
function useRoleRedirect() {
  const role = useSelector(selectRole)
  const location = useLocation()
  return { role, fallback: ROLE_HOME[role] ?? '/', from: location.pathname }
}

/** Authority-only pages. Admin tools live in their own role area. */
export function AuthorityArea() {
  const { role, fallback, from } = useRoleRedirect()

  if (role !== ROLES.AUTHORITY) {
    return <Navigate to={fallback} replace state={{ from }} />
  }

  return <Outlet />
}

/** Admin-only management pages (user management, department editing, ...). */
export function AdminArea() {
  const { role, fallback, from } = useRoleRedirect()

  if (role !== ROLES.ADMIN) {
    return <Navigate to={fallback} replace state={{ from }} />
  }

  return <Outlet />
}

/** The citizen area. */
export function CitizenArea() {
  const { role, fallback } = useRoleRedirect()

  if (role !== ROLES.CITIZEN) {
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
