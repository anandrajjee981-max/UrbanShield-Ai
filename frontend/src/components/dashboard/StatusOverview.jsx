import { AlertCircle, CheckCircle, Info, Link, Clock, Truck, MapPin } from 'lucide-react'

const STATUS_ITEMS = [
  {
    key: 'active',
    label: 'Active Incidents',
    count: 24,
    icon: AlertCircle,
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#FECACA',
    description: 'Requires immediate attention',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    count: 156,
    icon: CheckCircle,
    color: '#16A34A',
    bg: '#D1FAE5',
    border: '#A3E6CF',
    description: 'Successfully handled',
  },
  {
    key: 'pending',
    label: 'Pending',
    count: 8,
    icon: Clock,
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FEF3C7',
    description: 'Awaiting assignment',
  },
  {
    key: 'info',
    label: 'Info Reports',
    count: 42,
    icon: Info,
    color: '#0284C7',
    bg: '#BFDBFE',
    border: '#93C5FD',
    description: 'Informational only',
  },
  {
    key: 'fleet',
    label: 'Fleet Status',
    count: 12,
    icon: Truck,
    color: '#2563EB',
    bg: '#DBEAFE',
    border: '#BFDBFE',
    description: 'Vehicle tracking',
  },
  {
    key: 'coverage',
    label: 'Coverage',
    count: 5,
    icon: MapPin,
    color: '#8B5CF6',
    bg: '#E9D8FD',
    border: '#C4B5FD',
    description: 'Area coverage',
  },
]

export default function StatusOverview() {
  return (
    <section className="p-6" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATUS_ITEMS.map((item) => (
          <div
            key={item.key}
            className="p-4 rounded-lg border border-slate-200 hover:shadow-lg transition-shadow"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <item.icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" style={{ color: item.color }} />
                <span className="text-sm font-medium text-slate-900">{item.label}</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{item.count}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}