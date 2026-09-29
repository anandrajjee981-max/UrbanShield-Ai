import { useState } from 'react'
import { Building2, Check, ShieldCheck, UserCheck, X } from 'lucide-react'
import Button from '../common/Button.jsx'
import Modal from '../common/Modal.jsx'
import Badge from '../common/Badge.jsx'
import { STATUS_ACTIONS } from '../../utils/constants.js'
import { useReports } from '../../hooks/useReports.js'
import { MOCK_DEPARTMENTS, MOCK_OFFICERS } from '../../mock/users.js'

/**
 * Officer action bar for a report.
 *
 * One component drives every transition in `STATUS_ACTIONS` so verification,
 * assignment, start and resolve behave identically everywhere. Assignment opens
 * a modal; rejection always asks for a reason, because the audit trail needs it.
 */
export default function StatusActions({ report, onReject }) {
  const { updateStatus, assign, reject, actionLoading } = useReports({ auto: false })
  const [assignOpen, setAssignOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [departmentId, setDepartmentId] = useState(MOCK_DEPARTMENTS[0]?.id ?? '')
  const [officerId, setOfficerId] = useState('')
  const [reason, setReason] = useState('')

  if (!report) return null

  const action = STATUS_ACTIONS[report.status]
  const busy = actionLoading

  async function handleAssign() {
    const department = MOCK_DEPARTMENTS.find((item) => item.id === departmentId)
    const officer = MOCK_OFFICERS.find((item) => item.id === officerId)

    await assign(report.id, {
      departmentId,
      departmentName: department?.name,
      officerId: officer?.id ?? null,
      assigneeName: officer?.name ?? department?.head,
      priority: report.priority,
      eta: department?.responseSlaHours ? `${department.responseSlaHours}h SLA` : null,
    })

    setAssignOpen(false)
  }

  async function handleReject() {
    if (!reason.trim()) return
    await (onReject ? onReject(reason) : reject(report.id, reason))
    setRejectOpen(false)
    setReason('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {action?.next ? (
        action.next === 'assigned' ? (
          <Button variant="primary" size="sm" icon={Building2} loading={busy} onClick={() => setAssignOpen(true)}>
            Assign department
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={ShieldCheck}
            loading={busy}
            onClick={() => updateStatus(report.id, action.next)}
          >
            {action.label}
          </Button>
        )
      ) : null}

      {report.status === 'reported' ? (
        <Button variant="outline" size="sm" icon={X} onClick={() => setRejectOpen(true)}>
          Reject
        </Button>
      ) : null}

      {report.status === 'resolved' ? (
        <Badge tone="success" size="md" icon={Check}>
          Closed
        </Badge>
      ) : null}

      {/* ------------------------------ assign modal ------------------------------ */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign this report"
        description="The department is notified immediately and an SLA clock starts."
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={UserCheck} loading={busy} onClick={handleAssign}>
              Assign report
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-ink">Department</legend>
            <div className="space-y-2">
              {MOCK_DEPARTMENTS.map((department) => (
                <label
                  key={department.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                    departmentId === department.id ? 'border-brand-400 bg-brand-50' : 'border-line hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="department"
                    value={department.id}
                    checked={departmentId === department.id}
                    onChange={() => {
                      setDepartmentId(department.id)
                      setOfficerId('')
                    }}
                    className="h-3.5 w-3.5 text-brand-500 focus:ring-brand-300"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">{department.name}</span>
                    <span className="block text-[11px] text-muted">
                      {department.categories.join(', ')} · {department.responseSlaHours}h SLA
                    </span>
                  </span>
                  {departmentId === department.id ? <Check size={15} className="text-brand-600" /> : null}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="officer" className="mb-1.5 block text-xs font-semibold text-ink">
              Field officer (optional)
            </label>
            <select
              id="officer"
              value={officerId}
              onChange={(event) => setOfficerId(event.target.value)}
              className="input"
            >
              <option value="">Assign to department queue</option>
              {MOCK_OFFICERS.filter((officer) => officer.departmentId === departmentId).map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.name} — {officer.role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ------------------------------ reject modal ------------------------------ */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this report"
        description="Rejection is recorded permanently and visible to the reporting citizen."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" disabled={!reason.trim()} loading={busy} onClick={handleReject}>
              Reject report
            </Button>
          </>
        }
      >
        <label htmlFor="reject-reason" className="mb-1.5 block text-xs font-semibold text-ink">
          Reason for rejection
        </label>
        <textarea
          id="reject-reason"
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Location could not be verified after two field checks, the issue reported is outside municipal limits…"
          className="input resize-none"
        />
        <p className="mt-2 text-[11px] text-muted">{reason.trim().length}/280 characters minimum 10</p>
      </Modal>
    </div>
  )
}
