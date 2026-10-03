import { ClipboardList } from 'lucide-react'
import EmptyState from '../../components/common/EmptyState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'

export default function AuthorityTasks() {
  return (
    <PageShell>
      <PageHeader title="Assigned Tasks" subtitle="Tasks will appear here when the assignment workflow is available." />
      <section className="mt-6 rounded-lg border border-line bg-white">
        <EmptyState title="No tasks assigned yet." message="There are no assigned civic tasks to show." icon={ClipboardList} />
      </section>
    </PageShell>
  )
}