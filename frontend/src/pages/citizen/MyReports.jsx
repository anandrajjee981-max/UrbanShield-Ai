import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Camera, Download, RefreshCw } from 'lucide-react'
import PageShell from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Button, { ButtonLink } from '../../components/common/Button.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import ReportTable from '../../components/reports/ReportTable.jsx'
import { StatBar } from '../../components/dashboard/StatCard.jsx'
import { useReports } from '../../hooks/useReports.js'
import { exportReportsToCsv } from '../../utils/exportCsv.js'
import { addToast } from '../../redux/slices/uiSlice.js'

/**
 * My reports.
 *
 * The resident's own register: every report they have filed, with the same
 * table the officers use so the lifecycle reads identically on both sides.
 */
export default function MyReports() {
  const dispatch = useDispatch()
  const { reports, filters, loading, error, setFilters, clearFilters, refetch, pagination, setPage, deleteReport } = useReports({ scope: 'mine', limit: 50 })

  useEffect(() => {
    document.title = 'My Reports · UbranShieldAI'
  }, [])

  const counts = useSelector((state) => {
    const mine = state.reports.items
    return {
      total: mine.length,
      open: mine.filter((report) => report.status !== 'resolved' && report.status !== 'rejected').length,
      resolved: mine.filter((report) => report.status === 'resolved').length,
    }
  })

  function handleExport() {
    const count = exportReportsToCsv(reports, 'urbanshield-my-reports')
    if (!count) {
      dispatch(addToast({ tone: 'info', title: 'Nothing to export' }))
      return
    }
    dispatch(addToast({ tone: 'success', title: 'Export ready', message: `${count} rows downloaded.` }))
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen workspace"
        title="My Reports"
        subtitle="Every issue you have reported, and exactly where each one stands."
        actions={
          <>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>
              Export
            </Button>
            <ButtonLink to="/citizen/report" variant="primary" size="sm" icon={Camera}>
              New report
            </ButtonLink>
          </>
        }
      />

      <section aria-label="Report summary" className="grid gap-4 sm:grid-cols-3">
        <StatBar label="Total reports" value={counts.total} total={Math.max(counts.total, 1)} tone="info" />
        <StatBar label="Still open" value={counts.open} total={Math.max(counts.total, 1)} tone="warning" />
        <StatBar label="Resolved" value={counts.resolved} total={Math.max(counts.total, 1)} tone="success" />
      </section>

      {error ? (
        <ErrorState title="Could not load your reports" message={error} onRetry={() => refetch()} />
      ) : (
        <ReportTable
          reports={reports}
          loading={loading}
          error={error}
          onRetry={() => refetch()}
          pagination={pagination}
          onPageChange={setPage}
          authority={false}
          onDelete={(id) => {
            dispatch(deleteReport(id))
              .then(() => refetch())
              .catch((err) => {
                console.error(err)
                dispatch(addToast({ tone: 'danger', title: 'Delete failed', message: 'Could not delete report.' }))
              })
          }}
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          authority={false}
          emptyMessage="You have not filed any reports yet. Once you do, they will appear here with a live status."
        />
      )}
    </PageShell>
  )
}