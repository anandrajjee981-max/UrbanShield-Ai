import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import AdminReview from './pages/AdminReview';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AuthorityDashboard from './pages/AuthorityDashboard';
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
          <Route element={<RoleRoute roles={['ADMIN']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>
          <Route path="/map" element={<MapPage />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/ai" element={<AiInsights />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route element={<RoleRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminReview />} />
          </Route>
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
    </BrowserRouter>
  );
}
