import { useMemo, useState } from 'react'
import { Search, ShieldCheck, UserCog, Users } from 'lucide-react'
import PageShell from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Badge from '../../components/common/Badge.jsx'
import Button from '../../components/common/Button.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { MOCK_DEPARTMENTS, MOCK_OFFICERS, MOCK_USERS } from '../../mock/users.js'
import { ROLE_LABELS } from '../../utils/constants.js'
import { addToast } from '../../redux/slices/uiSlice.js'
import { useDispatch } from 'react-redux'

/**
 * User management (admin only).
 *
 * Who has access, which department they belong to and what they can do. The
 * route is already wrapped in `AdminArea`, so this page only renders for
 * administrators.
 */
export default function UserManagement() {
  const dispatch = useDispatch()
  const [query, setQuery] = useState('')

  const users = useMemo(() => {
    const everyone = [
      { ...MOCK_USERS.citizen, role: 'citizen', department: null, status: 'active' },
      ...MOCK_OFFICERS.map((officer) => ({ ...officer, role: 'authority', status: 'active' })),
      { ...MOCK_USERS.authority, role: 'admin', department: 'Control Room', status: 'active' },
    ]

    const needle = query.trim().toLowerCase()
    if (!needle) return everyone

    return everyone.filter((user) =>
      [user.name, user.email, user.role, user.department].filter(Boolean).some((field) => String(field).toLowerCase().includes(needle)),
    )
  }, [query])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administration"
        title="User Management"
        subtitle="Accounts, roles and department membership across the platform."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={UserCog}
            onClick={() => dispatch(addToast({ tone: 'info', title: 'Demo mode', message: 'User provisioning is disabled in this build.' }))}
          >
            Invite user
          </Button>
        }
      />

      <div className="card p-3.5">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, role or department…"
            aria-label="Search users"
            className="input h-9 w-full pl-8 text-[12px]"
          />
        </div>
      </div>

      {users.length ? (
        <div className="card overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-muted">
                  <th scope="col" className="px-4 py-3">User</th>
                  <th scope="col" className="px-4 py-3">Role</th>
                  <th scope="col" className="px-4 py-3">Department</th>
                  <th scope="col" className="px-4 py-3">Contact</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
                          {user.name?.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
                          <p className="truncate text-[11px] text-muted">{user.role === 'citizen' ? 'Resident' : user.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.role === 'admin' ? 'ai' : user.role === 'authority' ? 'brand' : 'neutral'} size="sm">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-body">{user.department ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="truncate text-[12px] text-body">{user.email}</p>
                      {user.phone ? <p className="truncate text-[11px] text-muted">{user.phone}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.status === 'active' ? 'success' : 'muted'} size="sm" dot>
                        {user.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {users.map((user) => (
              <li key={user.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-[11px] text-muted">{user.email}</p>
                  </div>
                  <Badge tone={user.role === 'admin' ? 'ai' : user.role === 'authority' ? 'brand' : 'neutral'} size="sm">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                </div>
                {user.department ? <p className="mt-1 text-[11px] text-body">{user.department}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState title="No users found" message={`Nothing matches "${query}".`} icon={Users} />
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <ShieldCheck size={12} aria-hidden="true" />
        {MOCK_DEPARTMENTS.length} departments · role changes take effect on the user's next navigation.
      </p>
    </PageShell>
  )
}
