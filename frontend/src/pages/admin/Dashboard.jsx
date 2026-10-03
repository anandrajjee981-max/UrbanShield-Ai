import { ArrowRight, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'

export default function AdminDashboard() {
  return (
    <PageShell>
      <PageHeader eyebrow="Administration" title="Admin Dashboard" subtitle="Review citizen-submitted reports and record verification decisions." />
      <section className="mt-6 max-w-2xl rounded-lg border border-line bg-white p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <ClipboardCheck size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">Citizen report verification</h2>
            <p className="mt-1 text-sm leading-relaxed text-body">Open the reports queue to review details, images, and location before verifying or rejecting an issue.</p>
            <Link to="/admin/issues" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
              Open reports <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  )
}