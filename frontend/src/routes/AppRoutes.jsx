import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute, { AccessDenied } from './ProtectedRoute.jsx'
import { AdminArea, AuthorityArea, CitizenArea } from './RoleArea.jsx'
import RoleHome from './RoleHome.jsx'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'

/**
 * The route table.
 *
 * Public routes render bare. Everything else sits behind `ProtectedRoute`
 * (session) plus a role area, so access control lives in exactly one place
 * instead of being repeated per page.
 *
 * Every screen is code split - the landing page must not pay for Leaflet,
 * Recharts and the report tables.
 */

const Landing = lazy(() => import('../pages/public/Landing.jsx'))
const About = lazy(() => import('../pages/public/About.jsx'))
const NotFound = lazy(() => import('../pages/public/NotFound.jsx'))

const CitizenHome = lazy(() => import('../pages/citizen/Home.jsx'))
const ReportIssue = lazy(() => import('../pages/citizen/ReportIssue.jsx'))
const LiveReport = lazy(() => import('../pages/citizen/LiveReport.jsx'))
const MyReports = lazy(() => import('../pages/citizen/MyReports.jsx'))
const CitizenReportDetail = lazy(() => import('../pages/citizen/ReportDetail.jsx'))
const Notifications = lazy(() => import('../pages/citizen/Notifications.jsx'))
const HowItWorks = lazy(() => import('../pages/citizen/HowItWorks.jsx'))
const CitizenAnalytics = lazy(() => import('../pages/citizen/Analytics.jsx'))

const AuthorityDashboard = lazy(() => import('../pages/authority/Dashboard.jsx'))
const CityMap = lazy(() => import('../pages/map/CityMap.jsx'))
const AuthorityReports = lazy(() => import('../pages/authority/Reports.jsx'))
const ReportDetail = lazy(() => import('../pages/authority/ReportDetail.jsx'))
const Verification = lazy(() => import('../pages/authority/Verification.jsx'))
const Assignments = lazy(() => import('../pages/authority/Assignments.jsx'))
const Departments = lazy(() => import('../pages/authority/Departments.jsx'))
const AuthorityAnalytics = lazy(() => import('../pages/authority/Analytics.jsx'))
const AuthorityAI = lazy(() => import('../pages/authority/AIAssistant.jsx'))
const Settings = lazy(() => import('../pages/authority/Settings.jsx'))
const UserManagement = lazy(() => import('../pages/authority/UserManagement.jsx'))

export default function AppRoutes() {
  return (
    <Routes>
      {/* ------------------------------ public ------------------------------ */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* One neutral URL that resolves to whichever home the role owns. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<RoleHome />} />
      </Route>

      {/* ------------------------------ citizen ------------------------------ */}
      <Route element={<ProtectedRoute />}>
        <Route element={<CitizenArea />}>
          <Route path="/citizen">
            <Route index element={<CitizenHome />} />
            <Route path="map" element={<CityMap />} />
            <Route path="report" element={<ReportIssue />} />
            <Route path="live-report" element={<LiveReport />} />
            <Route path="reports" element={<MyReports />} />
            <Route path="reports/:id" element={<CitizenReportDetail />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="analytics" element={<CitizenAnalytics />} />
          </Route>
        </Route>
      </Route>

      {/* ----------------------------- authority ----------------------------- */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthorityArea />}>
          <Route path="/authority">
            <Route index element={<Navigate to="/authority/dashboard" replace />} />
            <Route path="dashboard" element={<AuthorityDashboard />} />
            <Route path="map" element={<CityMap />} />
            <Route path="reports" element={<AuthorityReports />} />
            <Route path="reports/:id" element={<ReportDetail />} />
            <Route path="verification" element={<Verification />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="departments" element={<Departments />} />
            <Route path="analytics" element={<AuthorityAnalytics />} />
            <Route path="ai" element={<AuthorityAI />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      {/* ---------------------------- admin only ---------------------------- */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthorityArea />}>
          <Route element={<AdminArea />}>
            <Route path="/authority/users" element={<UserManagement />} />
          </Route>
        </Route>
      </Route>

      <Route path="/403" element={<AccessDenied />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}