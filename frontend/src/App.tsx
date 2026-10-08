import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import GlobalAISearch from './components/ai-search/GlobalAISearch';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import AdminRoute from './components/auth/AdminRoute';
import AuthorityRoute from './components/auth/AuthorityRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminIssuesPage from './pages/admin/AdminIssuesPage';
import AdminIssueDetailsPage from './pages/admin/AdminIssueDetailsPage';
import AuthorityApplicationsPage from './pages/admin/AuthorityApplicationsPage';
import AuthorityApplicationDetailsPage from './pages/admin/AuthorityApplicationDetailsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminCreateUserPage from './pages/admin/AdminCreateUserPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminNotFoundPage from './pages/admin/AdminNotFoundPage';
import AuthorityDashboard from './pages/AuthorityDashboard';
import AuthorityApplyPage from './pages/authority/AuthorityApplyPage';
import AuthorityProfilePage from './pages/authority/AuthorityProfilePage';
import DashboardRouter from './pages/DashboardRouter';
import AiInsights from './pages/AiInsights';
import Analytics from './pages/Analytics';
import AuthorityTasks from './pages/AuthorityTasks';
import Dashboard from './pages/Dashboard';
import Emergency from './pages/Emergency';
import Home from './pages/Home';
import Incidents from './pages/Incidents';
import Login from './pages/Login';
import MapPage from './pages/MapPage';
import Register from './pages/Register';
import Reports from './pages/Reports';
import WeatherPage from './pages/WeatherPage';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchCurrentUser } from './store/slices/authSlice';
import { fetchNotifications } from './store/slices/notificationsSlice';

function AppRoutes() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  useEffect(() => {
    dispatch(fetchCurrentUser());
    dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/weather" element={<WeatherPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Dedicated admin entry — public, but enforces role === 'ADMIN' after login. */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin operations console — ADMIN only, own layout + sidebar. */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminOverviewPage />} />
          <Route path="/admin/issues" element={<AdminIssuesPage />} />
          <Route path="/admin/issues/:issueId" element={<AdminIssueDetailsPage />} />
          <Route path="/admin/authority-applications" element={<AuthorityApplicationsPage />} />
          <Route
            path="/admin/authority-applications/:applicationId"
            element={<AuthorityApplicationDetailsPage />}
          />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/users/new" element={<AdminCreateUserPage />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/*" element={<AdminNotFoundPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Legacy URL: citizens see the overview, staff bounce to their home. */}
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route element={<RoleRoute roles={['CITIZEN']} />}>
            <Route path="/citizen" element={<Dashboard />} />
          </Route>
          <Route element={<RoleRoute roles={['AUTHORITY']} />}>
            <Route path="/authority" element={<AuthorityDashboard />} />
          </Route>
          {/* Authority verification doorway — AUTHORITY role only (any status).
              No layout here: the outer AppLayout above already provides the
              single sidebar + header; AuthorityRoute only gates by role. */}
          <Route element={<AuthorityRoute />}>
            <Route path="/authority/apply" element={<AuthorityApplyPage />} />
            <Route path="/authority/profile" element={<AuthorityProfilePage />} />
          </Route>
          {/* Legacy admin home — redirects into the new console. */}
          <Route element={<RoleRoute roles={['ADMIN']} />}>
            <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route path="/map" element={<MapPage />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/ai" element={<AiInsights />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route element={<RoleRoute roles={['AUTHORITY']} />}>
            <Route path="/tasks" element={<AuthorityTasks />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      {/* Floating global AI search — mounted once, available on every page. */}
      <GlobalAISearch />
    </BrowserRouter>
  );
}
