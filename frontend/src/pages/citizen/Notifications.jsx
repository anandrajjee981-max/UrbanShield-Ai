import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { BellOff, BellRing, CheckCheck, Inbox, Radio, Trash2 } from 'lucide-react'
import PageShell from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Button from '../../components/common/Button.jsx'
import Badge from '../../components/common/Badge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import { TableSkeleton } from '../../components/common/Skeleton.jsx'
import {
  clearAll,
  loadNotifications,
  markAllRead,
  markRead,
  selectNotificationsByDay,
  selectNotificationsError,
  selectNotificationsLoading,
  selectRealtimeConnected,
  selectUnreadCount,
} from '../../redux/slices/notificationSlice.js'
import { formatRelativeTime } from '../../utils/formatDate.js'
import { selectIsAuthority } from '../../redux/selectors.js'

/**
 * Notifications.
 *
 * A role-aware feed: a citizen sees movement on their own reports, an officer
 * sees the verification and risk queue. Grouped by day so a busy morning reads
 * as one block rather than a wall of rows.
 */
export default function Notifications() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const groups = useSelector(selectNotificationsByDay)
  const unreadCount = useSelector(selectUnreadCount)
  const loading = useSelector(selectNotificationsLoading)
  const error = useSelector(selectNotificationsError)
  const connected = useSelector(selectRealtimeConnected)
  const isAuthority = useSelector(selectIsAuthority)

  const basePath = isAuthority ? '/authority/reports' : '/citizen/reports'

  useEffect(() => {
    document.title = 'Notifications · UbranShieldAI'
    dispatch(loadNotifications())
  }, [dispatch])

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      entries: filter === 'unread' ? group.entries.filter((entry) => !entry.read) : group.entries,
    }))
    .filter((group) => group.entries.length)

  return (
    <PageShell>
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        subtitle="Everything that changed in the system while you were away."
        actions={
          <>
            <Button variant="ghost" size="sm" icon={CheckCheck} onClick={() => dispatch(markAllRead())} disabled={!unreadCount}>
              Mark all read
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Trash2}
              onClick={() => dispatch(clearAll())}
              disabled={!groups.length}
            >
              Clear
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: `Unread${unreadCount ? ` · ${unreadCount}` : ''}` },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={filter === option.key}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                filter === option.key ? 'bg-brand-500 text-navy-900' : 'bg-white text-body ring-1 ring-line hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <Radio size={12} className={connected ? 'animate-pulse text-brand-600' : 'text-muted'} aria-hidden="true" />
          {connected ? 'Live updates on' : 'Reconnecting to live updates'}
        </span>
      </div>

      {error ? (
        <ErrorState title="Could not load notifications" message={error} onRetry={() => dispatch(loadNotifications())} />
      ) : loading && !groups.length ? (
        <div className="card p-5">
          <TableSkeleton rows={5} columns={2} />
        </div>
      ) : visibleGroups.length ? (
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <section key={group.day}>
              <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">{group.day}</h2>

              <ul className="card divide-y divide-line overflow-hidden">
                {group.entries.map((entry) => (
                  <li key={entry.id} className={entry.read ? '' : 'bg-brand-50/40'}>
                    <div className="flex flex-wrap items-start gap-3 px-4 py-3.5 sm:px-5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-body">
                        {entry.read ? <BellOff size={14} aria-hidden="true" /> : <BellRing size={14} aria-hidden="true" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-ink">{entry.title}</p>
                          <Badge tone={entry.severity ?? 'info'} size="sm" dot>
                            {entry.severity ?? 'info'}
                          </Badge>
                          {!entry.read ? <Badge tone="brand" size="sm">New</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-body">{entry.body}</p>
                        <p className="mt-1 text-[11px] text-muted">{formatRelativeTime(entry.createdAt)}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {entry.reportId ? (
                          <Link
                            to={`${basePath}/${entry.reportId}`}
                            className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-body transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                          >
                            Open report
                          </Link>
                        ) : null}
                        {!entry.read ? (
                          <button
                            type="button"
                            onClick={() => dispatch(markRead(entry.id))}
                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-brand-600 transition hover:bg-brand-50"
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
          message={
            filter === 'unread'
              ? 'You are fully caught up. New activity will appear here the moment it happens.'
              : 'Updates about your reports, assignments and risk alerts will land here.'
          }
          icon={Inbox}
          action={{ label: 'Go to my reports', onClick: () => navigate('/citizen/reports') }}
        />
      )}
    </PageShell>
  )
}
