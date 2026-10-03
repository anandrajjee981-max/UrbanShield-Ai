import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Button from '../../components/common/Button.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'
import IssueStatus from '../../components/reports/IssueStatus.jsx'
import { fetchMyIssues } from '../../redux/api/issuesApi.js'
import { formatIssueDate, getIssueImage, getIssueLocation, getIssueStatus, getIssueTypeLabel } from '../../utils/issueFormatters.js'

export default function MyIssues() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchMyIssues()
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
  }, [])

  function refreshIssues() {
    setLoading(true)
    setError('')
    fetchMyIssues()
      .then(setIssues)
      .catch((requestError) => setError(requestError.status === 403 ? "You don't have permission to access this page." : requestError.message))
      .finally(() => setLoading(false))
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen workspace"
        title="My Reports"
        subtitle="Issues submitted from your account and their latest status."
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={refreshIssues}>Refresh</Button>}
      />
      {loading ? <Loader label="Loading your reports" className="min-h-48" /> : null}
      {!loading && error ? <ErrorState title="Could not load your reports" message={error} onRetry={refreshIssues} /> : null}
      {!loading && !error && issues.length === 0 ? (
        <section className="mt-5 rounded-lg border border-line bg-white">
          <EmptyState title="No reports yet" message="Issues you submit will appear here with their verification status." />
        </section>
      ) : null}
      {!loading && !error && issues.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {issues.map((issue) => {
            const id = issue.id ?? issue._id
            const imageUrl = getIssueImage(issue)
            const status = getIssueStatus(issue)
            return (
              <li key={id} className="grid gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-[1fr_180px] sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-ink">{issue.issueTypeLabel ?? getIssueTypeLabel(issue.issueType)}</h2>
                    <IssueStatus status={status} />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-body">{issue.description || 'No description provided.'}</p>
                  <p className="mt-3 text-xs text-body">Location: {getIssueLocation(issue)}</p>
                  <p className="mt-1 text-xs text-muted">Created: {formatIssueDate(issue.createdAt ?? issue.created_at)}</p>
                </div>
                {imageUrl ? <img src={imageUrl} alt={`${getIssueTypeLabel(issue.issueType)} evidence`} className="h-36 w-full rounded-md border border-line object-cover sm:h-28" /> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </PageShell>
  )
}