import { createSelector } from '@reduxjs/toolkit'
import { ROLES } from '../utils/constants.js'

/**
 * Cross-slice selectors.
 *
 * Anything that needs more than one slice lives here so components never reach
 * into two slices at once, and the derived values stay memoised.
 */

const selectUser = (state) => state.auth.user
const selectAuthStatus = (state) => state.auth.status
const selectGlobalFilters = (state) => state.ui.filters

export const selectCurrentUser = selectUser
export const selectIsAuthenticated = createSelector([selectAuthStatus], (status) => status === 'authenticated')
export const selectRole = createSelector([selectUser], (user) => user?.role ?? null)
export const selectIsAuthority = createSelector([selectRole], (role) => role === ROLES.AUTHORITY || role === ROLES.ADMIN)
export const selectIsAdmin = createSelector([selectRole], (role) => role === ROLES.ADMIN)

/** The filter object every data-driven page passes to its thunks. */
export const selectApiFilters = createSelector([selectGlobalFilters], (filters) => ({
  dateRange: filters.dateRange,
  customRange: filters.customRange,
  ward: filters.ward,
  issueCategory: filters.issueCategory,
  riskLevel: filters.riskLevel,
  status: filters.status,
  priority: filters.priority,
  search: filters.search,
  sort: filters.sort,
}))

/** Counts that feed the sidebar badges. */
export const selectSidebarBadges = createSelector(
  [
    (state) => state.reports.items,
    (state) => state.reports.pagination.total,
    (state) => state.notifications.items,
  ],
  (reports, totalReports, notifications) => {
    const fromList = reports.filter((report) => report.status === 'reported').length
    const fromTotal = Math.max(fromList, totalReports ? Math.round(totalReports * 0.1) : 0)

    return {
      pendingVerification: fromTotal,
      activeAssignments: reports.filter((report) => ['assigned', 'in_progress'].includes(report.status)).length,
      unreadNotifications: notifications.filter((item) => !item.read).length,
    }
  },
)

/** Active incidents used by the floating incident counter. */
export const selectOpenIncidentCount = createSelector(
  [(state) => state.reports.items],
  (reports) => reports.filter((report) => report.status !== 'resolved').length,
)
