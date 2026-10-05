import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCurrentUser } from '../store/slices/authSlice';
import { homeForRole } from '../utils/roleHome';

/**
 * Reusable authentication-aware "back to home" navigation.
 *
 * - Unauthenticated            -> `/`
 * - Authenticated (any role)   -> `homeForRole(role)` — the single centralised
 *   dashboard resolver (`/dashboard` for CITIZEN, `/authority` for AUTHORITY,
 *   `/admin` for ADMIN).
 *
 * Auth status comes from the existing Redux session (restored via GET
 * `/auth/me`), never from URL params, localStorage flags or hardcoded values.
 * While the session is still resolving (`authReady === false`) `goHome` is a
 * no-op so callers can never mis-route an authenticated user to `/`.
 */
export function useAuthAwareHome() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, sessionChecked, sessionLoading } = useAppSelector(
    (s) => s.auth,
  );

  // Resolve the session on direct opens / refreshes / new tabs, mirroring
  // ProtectedRoute — never assume logged-out while this is in flight.
  useEffect(() => {
    if (!sessionChecked && !sessionLoading) dispatch(fetchCurrentUser());
  }, [dispatch, sessionChecked, sessionLoading]);

  const authReady = sessionChecked && !sessionLoading;
  const destination = isAuthenticated && user ? homeForRole(user.role) : '/';

  const goHome = useCallback(() => {
    if (!sessionChecked || sessionLoading) return;
    navigate(isAuthenticated && user ? homeForRole(user.role) : '/');
  }, [navigate, isAuthenticated, user, sessionChecked, sessionLoading]);

  return { destination, goHome, authReady, isAuthenticated };
}
