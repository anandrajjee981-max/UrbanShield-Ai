import { createElement } from 'react'
import { ClipboardList, FilePlus2, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'

const ACTIONS = [
  { to: '/citizen/report', title: 'Report an Issue', description: 'Send a civic issue with its location and a photo.', icon: FilePlus2, tone: 'text-brand-700 bg-brand-50' },
  { to: '/citizen/reports', title: 'My Reports', description: 'Check the status of issues you have submitted.', icon: ClipboardList, tone: 'text-sky-700 bg-sky-50' },
  { to: '/citizen/profile', title: 'Profile', description: 'View your account details.', icon: UserRound, tone: 'text-amber-700 bg-amber-50' },
]

export default function CitizenDashboard() {
  return (
    <PageShell>
      <PageHeader eyebrow="Citizen workspace" title="Dashboard" subtitle="Report a local issue and follow its verification status." />
      <nav aria-label="Citizen dashboard actions" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ACTIONS.map((action) => (
          <Link key={action.to} to={action.to} className="group flex min-h-36 items-start gap-4 rounded-lg border border-line bg-white p-5 transition hover:border-brand-300 hover:shadow-raised">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.tone}`}>
              {createElement(action.icon, { size: 19, 'aria-hidden': true })}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink group-hover:text-brand-700">{action.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-body">{action.description}</span>
            </span>
          </Link>
        ))}
      </nav>
    </PageShell>
  )
}