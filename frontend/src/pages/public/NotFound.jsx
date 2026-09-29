import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Home, MapPin, ShieldCheck } from 'lucide-react'
import { ButtonLink } from '../../components/common/Button.jsx'
import { APP_NAME, ROLE_HOME } from '../../utils/constants.js'
import { selectIsAuthenticated, selectRole } from '../../redux/selectors.js'

/**
 * 404. Keeps the visitor inside the product by offering the destinations that
 * are actually reachable from their role.
 */
export default function NotFound() {
  const location = useLocation()
  const role = useSelector(selectRole)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  useEffect(() => {
    document.title = `Page not found · ${APP_NAME}`
  }, [])

  const homeHref = isAuthenticated ? ROLE_HOME[role] ?? '/citizen' : '/'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass size={30} aria-hidden="true" />
      </span>

      <p className="mt-6 text-5xl font-bold tracking-tight text-ink">404</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">This page does not exist</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-body">
        <code className="rounded bg-white px-1.5 py-0.5 text-[12px] text-ink">{location.pathname}</code> is not a route in{' '}
        {APP_NAME}. It may have been moved, or the link may be out of date.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        <ButtonLink to={homeHref} variant="primary" size="sm" icon={Home}>
          {isAuthenticated ? 'My dashboard' : 'Go to home'}
        </ButtonLink>
        <ButtonLink to="/citizen/map" variant="secondary" size="sm" icon={MapPin}>
          City map
        </ButtonLink>
        <ButtonLink to="/about" variant="ghost" size="sm" icon={ShieldCheck}>
          About {APP_NAME}
        </ButtonLink>
      </div>
    </div>
  )
}
