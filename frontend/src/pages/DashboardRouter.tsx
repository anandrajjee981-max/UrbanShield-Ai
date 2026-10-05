import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { homeForRole } from '../utils/roleHome';
import Dashboard from './Dashboard';
import Loader from '../components/common/Loader';

/**
 * Keeps the legacy /dashboard URL working: citizens see the city overview,
 * while AUTHORITY / ADMIN are bounced to their own homes (/authority,
 * /admin). Sidebar + post-login navigation use homeForRole
 * directly; this is only the fallback for bookmarked /dashboard links.
 */
export default function DashboardRouter() {
  const { user, sessionChecked } = useAppSelector((s) => s.auth);
  if (!sessionChecked) return <Loader />;
  const home = homeForRole(user?.role ?? 'CITIZEN');
  if (home !== '/dashboard') return <Navigate to={home} replace />;
  return <Dashboard />;
}
