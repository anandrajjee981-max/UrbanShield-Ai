import { useEffect, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import PageShell from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import ReportTable from '../../components/reports/ReportTable.jsx'
import ReportFilters from '../../components/reports/ReportFilters.jsx'
import Button from '../../components/common/Button.jsx'
import { useReports } from '../../hooks/useReports.js'
import { exportReportsToCsv } from '../../utils/exportCsv.js'
import { useDispatch } from 'react-redux'
import { addToast } from '../../redux/slices/uiSlice.js'

/**
 * Authority report register.
 *
 * Filtering, sorting, pagination and CSV export all operate on the same
 * `state.reports` list, so the export always matches exactly what is on screen.
 */
export default function Reports() {
  const dispatch = useDispatch()
  const { reports, filters, pagination, loading, error, setFilters, clearFilters, goToPage, refetch } = useReports({ limit: 10 })
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    document.title = 'Reports · UbranShieldAI'
  }, [])

  function exportCsv() {
    const count = exportReportsToCsv(reports, 'urbanshield-authority-reports')
    if (!count) {
      dispatch(addToast({ tone: 'warning', title: 'Nothing to export', message: 'No reports match the current filters.' }))
      return
    }
    dispatch(addToast({ tone: 'success', title: 'Export ready', message: `${count} rows downloaded.` }))
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Register"
        title="All Reports"
        subtitle="Every citizen submission with its verification, assignment and resolution state."
        actions={
          <>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
          </>
        }
      />

      <ReportFilters
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        total={pagination.total}
        right={
          selectedIds.length ? (
            <span className="text-[11px] font-semibold text-brand-700">{selectedIds.length} selected</span>
          ) : null
        }
      />

      <ReportTable
        reports={reports}
        loading={loading}
        error={error}
        onRetry={() => refetch()}
        pagination={pagination}
        onPageChange={goToPage}
        selectable
        selectedIds={selectedIds}
        onToggleSelect={(id) => setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))}
        onToggleAll={(ids) => setSelectedIds((current) => (ids.every((id) => current.includes(id)) ? [] : ids))}
        emptyTitle="No reports match these filters"
        emptyMessage="Widen the date range, clear the ward or category filter, or search for something else."
      />

      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <FileText size={12} aria-hidden="true" />
        Showing the filtered register. Bulk actions appear once rows are selected.
      </p>
    </PageShell>
  )
}
