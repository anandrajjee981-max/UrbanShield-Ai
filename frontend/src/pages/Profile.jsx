import { useSelector } from 'react-redux'
import PageHeader from '../components/common/PageHeader.jsx'
import PageShell from '../components/common/PageShell.jsx'
import { selectCurrentUser } from '../redux/selectors.js'

export default function Profile() {
  const user = useSelector(selectCurrentUser)

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="Profile" subtitle="Authenticated account details." />
      <dl className="mt-6 max-w-xl divide-y divide-line rounded-lg border border-line bg-white px-5">
        <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
          <dt className="text-xs font-semibold text-muted">Name</dt>
          <dd className="wrap-break-word text-sm text-ink">{user?.name ?? '—'}</dd>
        </div>
        <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
          <dt className="text-xs font-semibold text-muted">Email</dt>
          <dd className="wrap-break-word text-sm text-ink">{user?.email ?? '—'}</dd>
        </div>
        <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
          <dt className="text-xs font-semibold text-muted">Role</dt>
          <dd className="wrap-break-word text-sm text-ink">{user?.roleLabel ?? user?.role ?? '—'}</dd>
        </div>
      </dl>
    </PageShell>
  )
}