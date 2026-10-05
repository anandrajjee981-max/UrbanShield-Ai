import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { homeForRole } from '../../utils/roleHome';
import Loader from '../common/Loader';

/**
 * Role gate inside the authenticated layout: ADMIN-only and AUTHORITY-only
 * pages render here, everyone else bounces to their own role home
 * (citizen /dashboard, authority /authority, admin /admin-dashboard).
 */
export default function RoleRoute({ roles }: { roles: ('CITIZEN' | 'AUTHORITY' | 'ADMIN')[] }) {
  const { user, sessionChecked } = useAppSelector((s) => s.auth);

  if (!sessionChecked) return <Loader />;
  if (!user || !roles.includes(user.role)) return <Navigate to={homeForRole(user?.role ?? 'CITIZEN')} replace />;
  return <Outlet />;
}
