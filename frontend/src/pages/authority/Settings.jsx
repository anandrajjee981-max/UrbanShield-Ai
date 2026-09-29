import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, Check, Palette, ShieldCheck, User, Wifi } from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Button from '../../components/common/Button.jsx'
import Badge from '../../components/common/Badge.jsx'
import RoleSwitcher from '../../components/layout/RoleSwitcher.jsx'
import { addToast } from '../../redux/slices/uiSlice.js'
import { selectCurrentUser, selectIsAdmin, selectRole } from '../../redux/selectors.js'
import { selectRealtimeConnected } from '../../redux/slices/notificationSlice.js'
import { ROLE_LABELS } from '../../utils/constants.js'
import { USE_MOCK, API_BASE_URL } from '../../services/api.js'

/**
 * Settings.
 *
 * Account, notification and platform connection settings. The demo role switcher
 * lives here as well, because in a real deployment role comes from the
 * identity provider rather than the UI.
 */
export default function Settings() {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const role = useSelector(selectRole)
  const isAdmin = useSelector(selectIsAdmin)
  const connected = useSelector(selectRealtimeConnected)

  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushAlerts, setPushAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [compactTables, setCompactTables] = useState(false)

  useEffect(() => {
    document.title = 'Settings · UbranShieldAI'
  }, [])

  const toggles = [
    { id: 'email', label: 'Email alerts', hint: 'Weekly digest of risk movement in your wards', value: emailAlerts, onChange: setEmailAlerts },
    { id: 'push', label: 'Push notifications', hint: 'Immediate alerts for high risk zones', value: pushAlerts, onChange: setPushAlerts },
    { id: 'sms', label: 'SMS escalation', hint: 'Only for critical incidents assigned to you', value: smsAlerts, onChange: setSmsAlerts },
    { id: 'compact', label: 'Compact tables', hint: 'Show more rows per page in report registers', value: compactTables, onChange: setCompactTables },
  ]

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="Settings" subtitle="Your profile, notification preferences and platform connection." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-5">
          <Panel title="Profile">
            <div className="flex items-center gap-3.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-lg font-bold text-navy-900">
                {user?.name?.charAt(0) ?? 'U'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">{user?.name ?? 'Guest'}</p>
                <p className="truncate text-[12px] text-body">{user?.email ?? 'no email on file'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={isAdmin ? 'ai' : 'brand'} size="sm">
                    {ROLE_LABELS[role] ?? role}
                  </Badge>
                  {user?.department ? (
                    <Badge tone="neutral" size="sm">
                      {user.department}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[12px]">
              {[
                ['User ID', user?.id],
                ['Phone', user?.phone],
                ['Ward coverage', user?.ward ?? 'All wards'],
                ['Last sign in', user?.lastLogin],
              ]
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="truncate font-semibold text-ink">{value}</dd>
                  </div>
                ))}
            </dl>
          </Panel>

          <Panel title="Role" description="Demo role switcher — a stand-in for real identity management">
            <RoleSwitcher />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Notifications" description="How you want to be reached">
            <ul className="space-y-1">
              {toggles.map((toggle) => (
                <li key={toggle.id}>
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{toggle.label}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{toggle.hint}</span>
                    </span>
                    <span className="relative mt-0.5 inline-flex shrink-0">
                      <input
                        type="checkbox"
                        checked={toggle.value}
                        onChange={(event) => toggle.onChange(event.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-brand-500" />
                      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Platform" description="Connection and data source">
            <dl className="space-y-3 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted">
                  <Wifi size={13} aria-hidden="true" />
                  Realtime connection
                </dt>
                <dd>
                  <Badge tone={connected ? 'success' : 'muted'} size="sm" dot>
                    {connected ? 'Connected' : 'Reconnecting'}
                  </Badge>
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted">
                  <Palette size={13} aria-hidden="true" />
                  Data source
                </dt>
                <dd>
                  <Badge tone={USE_MOCK ? 'warning' : 'info'} size="sm">
                    {USE_MOCK ? 'Mock dataset' : 'Live API'}
                  </Badge>
                </dd>
              </div>

              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">API base URL</dt>
                <dd className="truncate font-mono text-[11px] text-ink">{API_BASE_URL}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl border border-line bg-slate-50 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
                <ShieldCheck size={12} className="text-brand-600" aria-hidden="true" />
                Access control
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-body">
                Route guards restrict every screen to the signed-in role. Admin-only pages are additionally gated and
                every mutation is recorded against your user id.
              </p>
            </div>
          </Panel>

          <Panel title="Danger zone">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">Reset local preferences</p>
                <p className="mt-0.5 text-[11px] text-muted">Clears cached filters and notification state on this device.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={Check}
                onClick={() => {
                  localStorage.removeItem('urbanshield.preferences')
                  dispatch(addToast({ tone: 'success', title: 'Preferences cleared' }))
                }}
              >
                Clear
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">Sign out</p>
                <p className="mt-0.5 text-[11px] text-muted">Ends the session on this device.</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={Bell}
                onClick={() => dispatch(addToast({ tone: 'info', title: 'Demo mode', message: 'Authentication is mocked in this build.' }))}
              >
                Sign out
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  )
}
