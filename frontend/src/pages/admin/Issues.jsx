import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'
import IssueStatus from '../../components/reports/IssueStatus.jsx'
import { fetchAdminIssues } from '../../redux/api/issuesApi.js'
import { formatIssueDate, getIssueImage, getIssueLocation, getIssueStatus, getIssueTypeLabel } from '../../utils/issueFormatters.js'

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'REPORTED', label: 'Reported' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

export default function AdminIssues() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedStatus = searchParams.get('status')?.toUpperCase()
  const activeStatus = FILTERS.some((filter) => filter.value === requestedStatus) ? requestedStatus : 'ALL'
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    fetchAdminIssues(activeStatus === 'ALL' ? undefined : activeStatus)
      .then((items) => {
        if (active) setIssues(items)
      })
      .catch((requestError) => {
        if (active) setError(requestError.status === 403 ? "You don't have permission to access this page." : requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [activeStatus, reloadKey])

  function selectFilter(status) {
    setIssues([])
    setError('')
    setLoading(true)
    setSearchParams(status === 'ALL' ? {} : { status })
    setReloadKey((value) => value + 1)
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Administration" title="Citizen Reports" subtitle="Review submissions and verify or reject reported issues." />
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter reports by status">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={activeStatus === filter.value}
            onClick={() => selectFilter(filter.value)}
            className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${activeStatus === filter.value ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-body hover:border-brand-300 hover:text-ink'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? <Loader label="Loading reports" className="min-h-48" /> : null}
      {!loading && error ? <ErrorState title="Could not load reports" message={error} onRetry={() => selectFilter(activeStatus)} /> : null}
      {!loading && !error && issues.length === 0 ? (
        <section className="mt-5 rounded-lg border border-line bg-white">
          <EmptyState title="No reports found" message="There are no citizen reports in this status filter." />
        </section>
      ) : null}
      {!loading && !error && issues.length > 0 ? (
        <ul className="mt-5 grid gap-3 xl:grid-cols-2">
          {issues.map((issue) => {
            const id = issue.id ?? issue._id
            const imageUrl = getIssueImage(issue)
            return (
              <li key={id} className="grid min-w-0 gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-[1fr_150px] sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="min-w-0 text-sm font-bold text-ink">{issue.issueTypeLabel ?? getIssueTypeLabel(issue.issueType)}</h2>
                    <IssueStatus status={getIssueStatus(issue)} />
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-body">{issue.description || 'No description provided.'}</p>
                  <p className="mt-3 truncate text-xs text-body">Location: {getIssueLocation(issue)}</p>
                  <p className="mt-1 text-xs text-muted">Created: {formatIssueDate(issue.createdAt ?? issue.created_at)}</p>
                  <Link to={`/admin/issues/${encodeURIComponent(id)}`} state={{ issue }} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800">
                    View report <ExternalLink size={13} aria-hidden="true" />
                  </Link>
                </div>
                {imageUrl ? <img src={imageUrl} alt={`${getIssueTypeLabel(issue.issueType)} evidence`} className="h-28 w-full rounded-md border border-line object-cover sm:h-full" /> : <div className="flex min-h-20 items-center justify-center rounded-md bg-slate-50 text-xs text-muted">No image</div>}
              </li>
            )
          })}
        </ul>
      ) : null}
    </PageShell>
  )
}