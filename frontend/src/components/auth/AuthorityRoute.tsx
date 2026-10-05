import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import BrandLoader from '../common/BrandLoader';
import { homeForRole } from '../../utils/roleHome';

/**
 * AuthorityRoute — frontend gate for authority-candidate pages
 * (/authority/apply, /authority/profile).
 *
 * 1. Unauthenticated  -> /login (carries `from` for post-login return).
 * 2. CITIZEN          -> citizen dashboard.
 * 3. ADMIN            -> admin console.
 * 4. AUTHORITY        -> allowed (verified or not — verification gates API
 *    data, not these pages; the apply page is exactly where candidates go).
 *
 * The backend remains the source of truth (401/403 per endpoint).
 */
export default function AuthorityRoute() {
  const location = useLocation();
  const { user, isAuthenticated, sessionChecked, sessionLoading } = useAppSelector(
    (s) => s.auth,
  );

  if (!sessionChecked || sessionLoading) return <BrandLoader />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== 'AUTHORITY') {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}
