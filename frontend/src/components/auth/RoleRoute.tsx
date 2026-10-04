import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import Loader from '../common/Loader';

/**
 * Role gate inside the authenticated layout: ADMIN-only and AUTHORITY-only
 * pages render here, everyone else bounces to the dashboard. Used for
 * /admin (Admin Review) and /tasks (Authority Tasks).
 */
export default function RoleRoute({ roles }: { roles: ('CITIZEN' | 'AUTHORITY' | 'ADMIN')[] }) {
  const { user, sessionChecked } = useAppSelector((s) => s.auth);

  if (!sessionChecked) return <Loader />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
