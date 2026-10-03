import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Incidents from './pages/Incidents';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import AiInsights from './pages/AiInsights';
import Emergency from './pages/Emergency';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchNotifications } from './store/slices/notificationsSlice';
import { fetchCurrentUser } from './store/slices/authSlice';

function App() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  useEffect(() => {
    // Restore the backend cookie session once per app boot.
    dispatch(fetchCurrentUser());
    dispatch(fetchNotifications());
  }, [dispatch]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return (
    <BrowserRouter>
      <Routes>
        {/* Public: landing + real backend auth */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Protected: session gate (GET /auth/me) wraps the app layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai" element={<AiInsights />} />
            <Route path="/emergency" element={<Emergency />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
