import { useEffect, useState } from 'react'
import { ArrowLeft, Check, X } from 'lucide-react'
import { useLocation, useParams } from 'react-router-dom'
import Button, { ButtonLink } from '../../components/common/Button.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'
import IssueStatus from '../../components/reports/IssueStatus.jsx'
import { fetchAdminIssue, rejectIssue, verifyIssue } from '../../redux/api/issuesApi.js'
import { formatIssueDate, getIssueImage, getIssueStatus, getIssueTypeLabel } from '../../utils/issueFormatters.js'

function getCoordinates(issue) {
  const latitude = issue?.latitude ?? issue?.location?.latitude ?? issue?.location?.lat
  const longitude = issue?.longitude ?? issue?.location?.longitude ?? issue?.location?.lng
  return latitude != null && longitude != null ? { latitude, longitude } : null
}

function getAddress(issue) {
  const address = issue?.address ?? issue?.location?.address
  if (typeof address === 'string' && address.trim()) return address
  return typeof issue?.location === 'string' ? issue.location : ''
}

export default function AdminIssueDetail() {
  const { issueId } = useParams()
  const location = useLocation()
  const [issue, setIssue] = useState(location.state?.issue ?? null)
  const [loading, setLoading] = useState(!location.state?.issue)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (issue) return undefined
    let active = true
    fetchAdminIssue(issueId)
      .then((result) => {
        if (active) {
          if (result) setIssue(result)
          else setError('This report could not be found.')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.status === 403 ? "You don't have permission to access this page." : requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [issue, issueId])

  async function handleVerify() {
    setActionError('')
    setActionLoading(true)
    try {
      const result = await verifyIssue(issueId)
      setIssue((current) => ({ ...current, ...(result?.issue ?? result ?? {}), status: 'VERIFIED' }))
    } catch (requestError) {
      setActionError(requestError.status === 403 ? "You don't have permission to access this page." : requestError.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(event) {
    event.preventDefault()
    setActionError('')
    setActionLoading(true)
    try {
      const result = await rejectIssue(issueId, reason)
      setIssue((current) => ({ ...current, ...(result?.issue ?? result ?? {}), status: 'REJECTED' }))
      setRejectOpen(false)
      setReason('')
    } catch (requestError) {
      setActionError(requestError.status === 403 ? "You don't have permission to access this page." : requestError.message)
    } finally {
      setActionLoading(false)
    }
  }

  const status = getIssueStatus(issue)
  const imageUrl = getIssueImage(issue)
  const coordinates = getCoordinates(issue)
  const address = getAddress(issue)

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administration · Report review"
        title={issue?.issueTypeLabel ?? getIssueTypeLabel(issue?.issueType)}
        subtitle="Inspect the report details and record a verification decision."
        actions={<ButtonLink to="/admin/issues" variant="secondary" size="sm" icon={ArrowLeft}>Back to reports</ButtonLink>}
      />
      {loading ? <Loader label="Loading report" className="min-h-48" /> : null}
      {!loading && error ? <ErrorState title="Report unavailable" message={error} /> : null}
      {!loading && issue ? (
        <article className="mt-5 max-w-4xl rounded-lg border border-line bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <IssueStatus status={status} />
            <p className="text-xs text-muted">Created: {formatIssueDate(issue.createdAt ?? issue.created_at)}</p>
          </div>
          <section className="grid gap-5 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)]">
            <div className="min-w-0">
              <h2 className="text-xs font-semibold uppercase text-muted">Full Description</h2>
              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-ink">{issue.description || 'No description provided.'}</p>
              <h2 className="mt-6 text-xs font-semibold uppercase text-muted">Location</h2>
              {coordinates ? (
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted">Latitude</dt><dd className="mt-0.5 font-medium text-ink">{coordinates.latitude}</dd></div>
                  <div><dt className="text-xs text-muted">Longitude</dt><dd className="mt-0.5 font-medium text-ink">{coordinates.longitude}</dd></div>
                </dl>
              ) : <p className="mt-2 text-sm text-ink">{address || 'Location not provided.'}</p>}
              {coordinates && address ? <p className="mt-2 text-sm text-body">Address: {address}</p> : null}
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase text-muted">Image</h2>
              {imageUrl ? <a href={imageUrl} target="_blank" rel="noreferrer"><img src={imageUrl} alt={`${getIssueTypeLabel(issue.issueType)} report`} className="mt-2 max-h-96 w-full rounded-md border border-line object-contain" /></a> : <p className="mt-2 rounded-md bg-slate-50 px-3 py-8 text-center text-sm text-muted">No image attached.</p>}
            </div>
          </section>

          {actionError ? <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{actionError}</p> : null}
          {status === 'REPORTED' ? (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
              <Button icon={Check} loading={actionLoading} onClick={handleVerify}>Verify Issue</Button>
              <Button variant="danger" icon={X} disabled={actionLoading} onClick={() => setRejectOpen(true)}>Reject Issue</Button>
            </div>
          ) : null}
        </article>
      ) : null}

      {rejectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="reject-title" className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-2xl">
            <h2 id="reject-title" className="text-base font-bold text-ink">Reject this issue?</h2>
            <form className="mt-4 space-y-4" onSubmit={handleReject}>
              <div>
                <label htmlFor="reject-reason" className="text-xs font-semibold text-body">Reason <span className="font-normal text-muted">(optional)</span></label>
                <textarea id="reject-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} className="input mt-1.5 resize-y text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" disabled={actionLoading} onClick={() => setRejectOpen(false)}>Cancel</Button>
                <Button type="submit" variant="danger" loading={actionLoading}>Reject Issue</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </PageShell>
  )
}