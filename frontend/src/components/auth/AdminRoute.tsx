import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import BrandLoader from '../common/BrandLoader';
import { homeForRole } from '../../utils/roleHome';

/**
 * AdminRoute — frontend gate for /admin/*.
 *
 * 1. Unauthenticated  -> /admin/login (carries `from` for post-login return).
 * 2. CITIZEN          -> citizen dashboard.
 * 3. AUTHORITY        -> authority dashboard.
 * 4. ADMIN            -> allowed.
 *
 * The backend remains the source of truth: every /api/admin/* request is
 * re-checked server-side (401/403), and those responses are surfaced as
 * inline permission states rather than silent redirects.
 */
export default function AdminRoute() {
  const location = useLocation();
  const { user, isAuthenticated, sessionChecked, sessionLoading } = useAppSelector(
    (s) => s.auth,
  );

  if (!sessionChecked || sessionLoading) return <BrandLoader />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}
