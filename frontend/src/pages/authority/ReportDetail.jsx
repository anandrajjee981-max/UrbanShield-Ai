import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ArrowLeft,
  Building2,
  Camera,
  CalendarClock,
  MapPin,
  MessageSquarePlus,
  Phone,
  User,
} from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import Button from '../../components/common/Button.jsx'
import Badge from '../../components/common/Badge.jsx'
import ReportTimeline from '../../components/reports/ReportTimeline.jsx'
import StatusActions from '../../components/reports/StatusActions.jsx'
import { PriorityBadge, StatusBadge } from '../../components/reports/ReportStatusBadge.jsx'
import AiInsightCard from '../../components/ai/AiInsightCard.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import { Skeleton } from '../../components/common/Skeleton.jsx'
import RiskMap from '../../components/map/RiskMap.jsx'
import { useReportDetail, useReports } from '../../hooks/useReports.js'
import { MAP_LAYERS } from '../../utils/constants.js'
import { formatDateTime, formatRelativeTime } from '../../utils/formatDate.js'
import { useDispatch } from 'react-redux'
import { clearSelectedReport } from '../../redux/slices/reportSlice.js'

/**
 * Incident detail.
 *
 * Mounted by both the authority console and the citizen area - the only
 * difference is which action bar is shown. The body, timeline, notes and AI
 * insight are identical, so an officer and a resident always read the same
 * record.
 */
export default function ReportDetail({ authority = true }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const reporterId = useSelector((state) => state.auth.user?.id)
  const { report, detailLoading, actionLoading } = useReportDetail(id)
  const { note } = useReports({ auto: false })
  const [noteBody, setNoteBody] = useState('')
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    if (report) document.title = `${report.trackingId} · UbranShieldAI`
    return () => dispatch(clearSelectedReport())
  }, [dispatch, report])

  if (detailLoading && !report) {
    return (
      <PageShell>
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </PageShell>
    )
  }

  if (!report) {
    return (
      <PageShell>
        <ErrorState
          title="Report not found"
          message="This report may have been removed, or the link is out of date."
          onRetry={() => navigate(authority ? '/authority/reports' : '/citizen/reports')}
        />
      </PageShell>
    )
  }

  // A resident may only open a report they filed. The route is guarded, but the
  // id is user supplied, so ownership is checked here as well.
  if (!authority && reporterId && report.reporter?.id && report.reporter.id !== reporterId) {
    return (
      <PageShell>
        <ErrorState
          title="Report not available"
          message="You can only open reports that you submitted yourself."
          onRetry={() => navigate('/citizen/reports')}
        />
      </PageShell>
    )
  }

  const basePath = authority ? '/authority/reports' : '/citizen/reports'
  const overdue = new Date(report.dueDate) < new Date() && report.status !== 'resolved'

  async function submitNote(event) {
    event.preventDefault()
    const value = noteBody.trim()
    if (!value) return
    await note(report.id, value)
    setNoteBody('')
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={basePath} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-body transition hover:text-brand-700">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to reports
        </Link>

        {authority ? <StatusActions report={report} /> : null}
      </div>

      {/* Title block */}
      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-muted">{report.trackingId}</span>
              <StatusBadge status={report.status} size="md" />
              <PriorityBadge priority={report.priority} size="md" />
              {overdue ? (
                <Badge tone="danger" size="md" icon={CalendarClock}>
                  SLA breached
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-2 text-xl font-bold tracking-tight text-ink">{report.issueLabel}</h1>
            <p className="mt-1 text-[13px] text-body">{report.title}</p>
          </div>

          <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
            <div>
              <dt className="text-muted">Ward</dt>
              <dd className="font-semibold text-ink">{report.ward}</dd>
            </div>
            <div>
              <dt className="text-muted">Category</dt>
              <dd className="font-semibold capitalize text-ink">{report.category}</dd>
            </div>
            <div>
              <dt className="text-muted">Reported</dt>
              <dd className="font-semibold text-ink">{formatRelativeTime(report.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted">Due</dt>
              <dd className={`font-semibold ${overdue ? 'text-risk-high' : 'text-ink'}`}>{formatDateTime(report.dueDate)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Panel title="Description">
            <p className="text-[13px] leading-relaxed text-body">{report.description}</p>

            <dl className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <User size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] text-muted">Reported by</dt>
                  <dd className="text-[13px] font-semibold text-ink">{report.reporter?.name ?? 'Citizen'}</dd>
                  {report.reporter?.phone ? (
                    <dd className="mt-0.5 flex items-center gap-1 text-[11px] text-body">
                      <Phone size={10} aria-hidden="true" />
                      {report.reporter.phone}
                    </dd>
                  ) : null}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building2 size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] text-muted">Assigned department</dt>
                  <dd className="text-[13px] font-semibold text-ink">{report.department?.name ?? 'Not yet assigned'}</dd>
                  {report.assignee ? (
                    <dd className="mt-0.5 text-[11px] text-body">Officer: {report.assignee.name}</dd>
                  ) : null}
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:col-span-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] text-muted">Location</dt>
                  <dd className="text-[13px] font-semibold text-ink">{report.address}</dd>
                  <dd className="mt-0.5 text-[11px] text-muted">
                    {report.latitude}, {report.longitude}
                  </dd>
                </div>
              </div>
            </dl>
          </Panel>

          {/* Evidence */}
          {report.photos?.length ? (
            <Panel
              title={`Evidence (${report.photos.length})`}
              actions={
                <span className="flex items-center gap-1 text-[11px] text-muted">
                  <Camera size={12} aria-hidden="true" />
                  {activePhoto + 1}/{report.photos.length}
                </span>
              }
              bodyClassName="p-3"
            >
              <img
                src={report.photos[activePhoto]?.url}
                alt={`Evidence photo ${activePhoto + 1} for ${report.issueLabel}`}
                className="h-72 w-full rounded-lg object-cover"
                loading="lazy"
              />
              {report.photos.length > 1 ? (
                <ul className="mt-3 flex gap-2 overflow-x-auto">
                  {report.photos.map((photo, index) => (
                    <li key={photo.id}>
                      <button
                        type="button"
                        onClick={() => setActivePhoto(index)}
                        className={`h-12 w-12 overflow-hidden rounded-lg border-2 transition ${
                          index === activePhoto ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        aria-label={`Show photo ${index + 1}`}
                      >
                        <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          ) : null}

          {/* Mini map */}
          <Panel title="Location" description="Where this incident sits in the city" bodyClassName="p-0">
            <RiskMap
              height="h-64"
              riskZones={[]}
              reports={[]}
              layers={MAP_LAYERS.filter((layer) => layer.key === 'boundaries').map((layer) => ({ ...layer, active: false }))}
              showLegend={false}
              interactive={false}
              focus={[report.latitude, report.longitude]}
            />
          </Panel>

          {/* Internal notes are authority-only; a resident gets the explanation instead. */}
          {authority ? (
            <Panel title={`Internal notes (${report.notes?.length ?? 0})`} bodyClassName="p-5 pt-0">
              {report.notes?.length ? (
                <ul className="mb-4 space-y-3">
                  {report.notes.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-line bg-slate-50/70 p-3.5">
                      <p className="text-[13px] leading-relaxed text-ink">{entry.body}</p>
                      <p className="mt-1.5 text-[11px] text-muted">
                        {entry.author} · {entry.authorRole} · {formatRelativeTime(entry.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-center text-[12px] text-muted">No notes yet.</p>
              )}

              <form onSubmit={submitNote} className="border-t border-line pt-4">
                <label htmlFor="note" className="mb-1.5 block text-[11px] font-semibold text-ink">
                  Add a note
                </label>
                <textarea
                  id="note"
                  rows={2}
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="Site visit update, material requirement, escalation…"
                  className="input resize-none"
                />
                <div className="mt-2 flex justify-end">
                  <Button type="submit" variant="secondary" size="sm" icon={MessageSquarePlus} loading={actionLoading} disabled={!noteBody.trim()}>
                    Add note
                  </Button>
                </div>
              </form>
            </Panel>
          ) : null}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <Panel title="Progress" description="Full lifecycle of this report">
            <ReportTimeline timeline={report.timeline} status={report.status} />
          </Panel>

          {report.aiInsight ? <AiInsightCard insight={report.aiInsight} /> : null}

          {!authority ? (
            <Panel title="What happens next" bodyClassName="p-5 pt-0">
              <ol className="space-y-2.5 text-[12px] leading-relaxed text-body">
                {[
                  'An officer verifies the location and evidence.',
                  'The report is assigned to the department responsible.',
                  'Field work begins and progress is shared here.',
                  'You are notified the moment it is resolved.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[11px] text-muted">
                  Working notes from the field team are internal. You will get a notification at every status change
                  instead.
                </p>
              </div>
            </Panel>
          ) : null}

          {!report.aiInsight ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[12px] text-muted">
              No AI insight was generated for this report yet.
            </p>
          ) : null}
        </div>
      </div>
    </PageShell>
  )
}
