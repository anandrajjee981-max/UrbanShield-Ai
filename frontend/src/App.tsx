import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import AdminReview from './pages/AdminReview';
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
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
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
