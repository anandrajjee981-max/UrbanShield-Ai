import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectRole } from '../redux/selectors.js'
import { ROLE_HOME } from '../utils/constants.js'

/**
 * Role redirect.
 *
 * Lets one neutral URL (`/dashboard`) resolve to whichever home belongs to the
 * signed-in role, instead of duplicating that knowledge in the nav, the header
 * and every deep link.
 */
export default function RoleHome() {
  const role = useSelector(selectRole)
  return <Navigate to={ROLE_HOME[role] ?? '/403'} replace />
}
