import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  addNote,
  assignReport,
  changeReportStatus,
  loadReportById,
  loadReports,
  loadMyReports,
  rejectReport,
  resetFilters,
  setFilters as setReportFilters,
  setPage,
  submitReport,
  deleteReport as deleteReportThunk,
} from '../redux/slices/reportSlice.js'
import { addToast } from '../redux/slices/uiSlice.js'
import { selectCurrentUser, selectIsAuthority } from '../redux/selectors.js'
import {
  selectActionLoading,
  selectPendingVerificationCount,
  selectActiveAssignmentCount,
  selectReportDetail,
  selectReportFilters,
  selectReportPagination,
  selectReports,
  selectReportsError,
  selectReportsLoading,
  selectSubmitting,
} from '../redux/slices/reportSlice.js'

/**
 * The single entry point for report data.
 *
 * Pages never dispatch a report thunk or touch `state.reports` directly - they
 * call this hook, which owns fetching, filtering, pagination and the toast
 * feedback for every mutation.
 *
 * @param {{ scope?: 'all' | 'mine', limit?: number, auto?: boolean }} options
 */
export function useReports({ scope = 'all', limit = 10, auto = true } = {}) {
  const dispatch = useDispatch()

  const reports = useSelector(selectReports)
  const filters = useSelector(selectReportFilters)
  const pagination = useSelector(selectReportPagination)
  const loading = useSelector(selectReportsLoading)
  const error = useSelector(selectReportsError)
  const submitting = useSelector(selectSubmitting)
  const actionLoading = useSelector(selectActionLoading)
  const user = useSelector(selectCurrentUser)
  const isAuthority = useSelector(selectIsAuthority)

  const fetchReports = useCallback(
    (override = {}) => {
      const params = { ...filters, page: pagination.page, limit, scope, ...override }
      return dispatch(scope === 'mine' ? loadMyReports(params) : loadReports(params))
    },
    [dispatch, filters, pagination.page, limit, scope],
  )

  useEffect(() => {
    if (auto) fetchReports()
    // Filters and page drive the refetch; `fetchReports` is recreated with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, scope, limit])

  /** Applies one or more filters and resets to page 1. */
  const setFilters = useCallback(
    (patch) => {
      dispatch(setReportFilters(patch))
    },
    [dispatch],
  )

  const clearFilters = useCallback(() => dispatch(resetFilters()), [dispatch])

  const goToPage = useCallback((page) => dispatch(setPage(page)), [dispatch])

  const createReport = useCallback(
    async (payload) => {
      const result = await dispatch(submitReport({ ...payload }))
      if (submitReport.fulfilled.match(result)) {
        dispatch(addToast({ tone: 'success', title: 'Report submitted', message: result.payload.trackingId }))
      } else {
        dispatch(addToast({ tone: 'danger', title: 'Submission failed', message: result.payload ?? 'Please try again.' }))
      }
      return result
    },
    [dispatch],
  )

  const updateStatus = useCallback(
    async (id, status) => {
      const result = await dispatch(changeReportStatus({ id, status }))
      dispatch(
        addToast(
          result.status === 'fulfilled'
            ? { tone: 'success', title: 'Status updated', message: `Report is now ${status.replace('_', ' ')}.` }
            : { tone: 'danger', title: 'Update failed', message: result.payload ?? 'Please try again.' },
        ),
      )
      return result
    },
    [dispatch],
  )

  const assign = useCallback(
    async (id, payload) => {
      const result = await dispatch(assignReport({ id, ...payload }))
      dispatch(
        addToast(
          result.status === 'fulfilled'
            ? { tone: 'success', title: 'Report assigned', message: 'The department has been notified.' }
            : { tone: 'danger', title: 'Assignment failed', message: result.payload ?? 'Please try again.' },
        ),
      )
      return result
    },
    [dispatch],
  )

  const note = useCallback(
    async (id, body) => {
      const result = await dispatch(addNote({ id, body, author: user }))
      dispatch(
        addToast(
          result.status === 'fulfilled'
            ? { tone: 'success', title: 'Note added' }
            : { tone: 'danger', title: 'Could not add the note', message: result.payload },
        ),
      )
      return result
    },
    [dispatch, user],
  )

const reject = useCallback(
    async (id, reason) => {
      const result = await dispatch(rejectReport({ id, reason }))
      dispatch(
        addToast(
          result.status === 'fulfilled'
            ? { tone: 'success', title: 'Report rejected' }
            : { tone: 'danger', title: 'Could not reject', message: result.payload },
        )
      )
      return result
    },
    [dispatch],
  )

  const deleteReport = useCallback(
    async (id) => {
      const result = await dispatch(deleteReportThunk({ id }))
      dispatch(
        addToast(
          result.status === 'fulfilled'
            ? { tone: 'success', title: 'Report deleted' }
            : { tone: 'danger', title: 'Could not delete', message: result.payload },
        )
      )
      return result
    },
    [dispatch],
  )

  return {
    reports,
    filters,
    pagination,
    loading,
    error,
    submitting,
    actionLoading,
    isAuthority,
    refetch: fetchReports,
    setFilters,
    clearFilters,
    goToPage,
    createReport,
    updateStatus,
    assign,
    note,
    reject,
    deleteReport,
  }
}

/**
 * Detail-view hook. Loads one report by id and exposes the derived
 * verification/assignment/resolution capabilities.
 */
export function useReportDetail(id) {
  const dispatch = useDispatch()
  const { report, nextAction, canVerify, canAssign, canStart, canResolve } = useSelector(selectReportDetail)
  const detailLoading = useSelector((state) => state.reports.detailLoading)
  const actionLoading = useSelector(selectActionLoading)

  useEffect(() => {
    if (id) dispatch(loadReportById(id))
  }, [dispatch, id])

  return { report, nextAction, canVerify, canAssign, canStart, canResolve, detailLoading, actionLoading }
}

/** Badge counters consumed by the sidebar. */
export function useReportBadges() {
  const pendingVerification = useSelector(selectPendingVerificationCount)
  const activeAssignments = useSelector(selectActiveAssignmentCount)
  return { pendingVerification, activeAssignments }
}

export default useReports
