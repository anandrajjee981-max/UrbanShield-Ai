import { Layers, Sun, Droplet, ShieldAlert, Building2, Cpu } from 'lucide-react'
import { MAP_LAYERS } from '../../utils/constants.js'

/**
 * Layer switcher overlay.
 *
 * Reads and writes `map.layers` through Redux, so a toggle made here is
 * immediately visible to every map instance in the app (dashboard preview,
 * full city map, report location picker).
 */

const ICONS = {
  heat: Sun,
  water: Droplet,
  reports: ShieldAlert,
  infrastructure: Cpu,
  boundaries: Layers,
  departments: Building2,
}

const LAYER_COLORS = {
  heat: '#EF4444',
  water: '#3B82F6',
  reports: '#F59E0B',
  infrastructure: '#8B5CF6',
  boundaries: '#64748B',
  departments: '#10B981',
}

export default function MapControls({ layers, onToggle, className = '' }) {
  return (
    <div className={`rounded-xl border border-line bg-white/95 p-3 shadow-raised backdrop-blur ${className}`}>
      <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-body">
        <Layers size={13} aria-hidden="true" />
        Layers
      </p>
      <ul className="space-y-1.5">
        {MAP_LAYERS.map((layer) => {
          const Icon = ICONS[layer.key] ?? Layers
          const active = layers.find((item) => item.key === layer.key)?.active

          return (
            <li key={layer.key}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs text-body transition hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggle(layer.key)}
                  className="h-3.5 w-3.5 rounded border-line text-brand-500 focus:ring-brand-300"
                />
                <span style={{ color: LAYER_COLORS[layer.key] }} className="flex items-center">
                  <Icon size={13} aria-hidden="true" />
                </span>
                <span className={active ? 'font-medium text-ink' : ''}>{layer.label}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
