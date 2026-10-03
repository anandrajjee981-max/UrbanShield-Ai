import { ClipboardList } from 'lucide-react'
import { ButtonLink } from '../../components/common/Button.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'

export default function AuthorityDashboard() {
  return (
    <PageShell>
      <PageHeader eyebrow="Authority workspace" title="Authority Dashboard" subtitle="Assigned civic work will appear here when task assignments are available." />
      <section className="mt-6 rounded-lg border border-line bg-white">
        <EmptyState title="No tasks assigned yet." message="Your assigned civic tasks will appear here." icon={ClipboardList} />
      </section>
      <ButtonLink to="/authority/tasks" variant="secondary" size="sm" icon={ClipboardList} className="mt-4">
        Assigned Tasks
      </ButtonLink>
    </PageShell>
  )
}