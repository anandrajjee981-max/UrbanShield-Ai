import { useEffect } from 'react'
import { CheckSquare, Inbox } from 'lucide-react'
import PageShell from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import ReportTable from '../../components/reports/ReportTable.jsx'
import ReportFilters from '../../components/reports/ReportFilters.jsx'
import { useReports } from '../../hooks/useReports.js'

/**
 * Verification queue.
 *
 * Reports that no officer has confirmed yet. The filter bar is locked to the
 * `reported` status so the queue cannot silently include work already done.
 */
export default function Verification() {
  const { reports, filters, pagination, loading, error, setFilters, clearFilters, goToPage, refetch } = useReports({ limit: 10 })

  useEffect(() => {
    document.title = 'Verification Queue · UbranShieldAI'
  }, [])

  useEffect(() => {
    if (filters.status !== 'reported') setFilters({ status: 'reported' })
    // Only on mount and whenever the page owns the status filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Queue"
        title="Verification Queue"
        subtitle="Confirm the location and evidence of a citizen report before it is assigned to a department."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
            <CheckSquare size={13} aria-hidden="true" />
            {pagination.total} awaiting verification
          </span>
        }
      />

      <ReportFilters
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        fields={['search', 'dateRange', 'ward', 'issueCategory', 'priority', 'sort']}
        total={pagination.total}
      />

      <ReportTable
        reports={reports}
        loading={loading}
        error={error}
        onRetry={() => refetch()}
        pagination={pagination}
        onPageChange={goToPage}
        columns={['report', 'issue', 'ward', 'priority', 'updated', 'actions']}
        emptyTitle="Nothing waiting for verification"
        emptyMessage="Every submitted report has been confirmed by an officer. New submissions appear here automatically."
      />

      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <Inbox size={12} aria-hidden="true" />
        Verification is the only gate a report must clear before a department is notified.
      </p>
    </PageShell>
  )
}
