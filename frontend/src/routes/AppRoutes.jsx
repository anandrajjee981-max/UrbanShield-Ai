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

const CitizenHome = lazy(() => import('../pages/citizen/CitizenDashboard.jsx'))
const ReportIssue = lazy(() => import('../pages/citizen/IssueReport.jsx'))
const MyReports = lazy(() => import('../pages/citizen/MyIssues.jsx'))
const Profile = lazy(() => import('../pages/Profile.jsx'))
const AuthorityDashboard = lazy(() => import('../pages/authority/AuthorityDashboard.jsx'))
const AuthorityTasks = lazy(() => import('../pages/authority/Tasks.jsx'))
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard.jsx'))
const AdminIssues = lazy(() => import('../pages/admin/Issues.jsx'))
const AdminIssueDetail = lazy(() => import('../pages/admin/IssueDetail.jsx'))

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
            <Route index element={<Navigate to="/citizen/dashboard" replace />} />
            <Route path="dashboard" element={<CitizenHome />} />
            <Route path="report" element={<ReportIssue />} />
            <Route path="reports" element={<MyReports />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Route>

      {/* ----------------------------- authority ----------------------------- */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthorityArea />}>
          <Route path="/authority">
            <Route index element={<Navigate to="/authority/dashboard" replace />} />
            <Route path="dashboard" element={<AuthorityDashboard />} />
            <Route path="tasks" element={<AuthorityTasks />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Route>

      {/* ---------------------------- admin only ---------------------------- */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminArea />}>
          <Route path="/admin">
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="issues" element={<AdminIssues />} />
            <Route path="issues/:issueId" element={<AdminIssueDetail />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Route>

      <Route path="/403" element={<AccessDenied />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}