import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCurrentUser } from '../../store/slices/authSlice';
import Loader from '../common/Loader';

// Session gate backed by the real backend (GET /api/auth/me).
// Unauthenticated visits bounce to /login, carrying the original path.
export default function ProtectedRoute() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isAuthenticated, sessionChecked, sessionLoading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!sessionChecked && !sessionLoading) dispatch(fetchCurrentUser());
  }, [dispatch, sessionChecked, sessionLoading]);

  if (!sessionChecked || sessionLoading) return <Loader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
