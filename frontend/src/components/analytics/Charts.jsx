import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import ChartCard, { ChartTooltip } from './ChartCard.jsx'
import { AXIS_PROPS, GRID_PROPS } from './chartTheme.js'
import { CHART_COLORS, RISK_CATEGORY_COLORS, RISK_LEVEL_COLORS } from '../../utils/colors.js'

/**
 * The chart set used by the dashboards, the analytics page and the AI
 * assistant. Each one takes an already-shaped dataset from Redux and is
 * otherwise presentation only.
 */

/* ------------------------------ risk trend ------------------------------ */

export function RiskTrendChart({ data = [], loading }) {
  return (
    <ChartCard
      title="Risk Trend"
      description="Average risk score per category, last 30 days"
      loading={loading}
      height={280}
      legend={[
        { label: 'Heat', color: RISK_CATEGORY_COLORS.heat },
        { label: 'Water', color: RISK_CATEGORY_COLORS.water },
        { label: 'Infrastructure', color: RISK_CATEGORY_COLORS.infrastructure },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {['heat', 'water', 'infrastructure'].map((key) => (
              <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={RISK_CATEGORY_COLORS[key]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={RISK_CATEGORY_COLORS[key]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={22} />
          <YAxis {...AXIS_PROPS} domain={[0, 100]} width={44} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#CBD5E1' }} />

          <Area type="monotone" dataKey="heat" name="Heat" stroke={RISK_CATEGORY_COLORS.heat} strokeWidth={2} fill="url(#fill-heat)" />
          <Line type="monotone" dataKey="water" name="Water" stroke={RISK_CATEGORY_COLORS.water} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="infrastructure" name="Infrastructure" stroke={RISK_CATEGORY_COLORS.infrastructure} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ------------------------------ report volume ------------------------------ */

export function ReportsTrendChart({ data = [], loading }) {
  return (
    <ChartCard
      title="Report Volume"
      description="Daily reports received vs resolved"
      loading={loading}
      height={280}
      legend={[
        { label: 'Reported', color: CHART_COLORS.series[0] },
        { label: 'Verified', color: CHART_COLORS.series[1] },
        { label: 'Resolved', color: CHART_COLORS.series[2] },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={18} />
          <YAxis {...AXIS_PROPS} width={36} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />

          <Bar dataKey="reported" name="Reported" fill={CHART_COLORS.series[0]} radius={[4, 4, 0, 0]} barSize={12} />
          <Bar dataKey="verified" name="Verified" fill={CHART_COLORS.series[1]} radius={[4, 4, 0, 0]} barSize={12} />
          <Line type="monotone" dataKey="resolved" name="Resolved" stroke={CHART_COLORS.series[2]} strokeWidth={2} dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ------------------------------ donut ------------------------------ */

export function DonutChart({ data = [], loading, title = 'Issue Distribution', description, centerLabel = 'Total', centerValue }) {
  const total = data.reduce((sum, item) => sum + (item.value ?? 0), 0)

  return (
    <ChartCard title={title} description={description} loading={loading} height={280}>
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill ?? CHART_COLORS.series[data.indexOf(entry) % CHART_COLORS.series.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-ink">{centerValue ?? total}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">{centerLabel}</span>
        </div>
      </div>

      <ul className="mt-1 space-y-1.5 px-3">
        {data.slice(0, 6).map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill ?? CHART_COLORS.series[0] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-body">{entry.name}</span>
            <span className="font-semibold text-ink">{entry.value}</span>
            <span className="w-10 text-right text-muted">{total ? Math.round((entry.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}

/* ------------------------------ horizontal bars ------------------------------ */

export function TopIssueBarChart({ data = [], loading }) {
  return (
    <ChartCard title="Top Issue Types" description="Ranked by report volume in the selected window" loading={loading} height={280}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
          <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
          <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={128} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Bar dataKey="value" name="Reports" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill ?? CHART_COLORS.series[0]} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ------------------------------ ward risk ------------------------------ */

export function WardRiskChart({ data = [], loading, onSelectWard }) {
  const ranked = [...data].sort((a, b) => a.score - b.score)

  return (
    <ChartCard
      title="Ward Risk Ranking"
      description="Composite score from heat, water, infrastructure and report load"
      loading={loading}
      height={300}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={ranked} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="ward" {...AXIS_PROPS} interval={0} angle={-35} textAnchor="end" height={54} />
          <YAxis {...AXIS_PROPS} domain={[0, 100]} width={44} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Bar
            dataKey="score"
            name="Risk score"
            radius={[4, 4, 0, 0]}
            barSize={22}
            onClick={(entry) => onSelectWard?.(entry.ward ?? entry.payload?.ward)}
            className={onSelectWard ? 'cursor-pointer' : ''}
          >
            {ranked.map((entry) => (
              <Cell key={entry.ward} fill={RISK_LEVEL_COLORS[entry.level] ?? CHART_COLORS.series[0]} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

/* ------------------------------ prediction ------------------------------ */

export function PredictionChart({ data = [], loading }) {
  return (
    <ChartCard
      title="7-Day Risk Forecast"
      description="Projected heat risk with the model's confidence band"
      loading={loading}
      height={280}
      legend={[
        { label: 'Predicted heat risk', color: CHART_COLORS.series[0] },
        { label: 'Confidence band', color: '#BFDBFE' },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} domain={[0, 100]} width={44} />
          <Tooltip content={<ChartTooltip />} />

          <Area dataKey="upper" name="Upper bound" stroke="none" fill="url(#band)" />
          <Area dataKey="lower" name="Lower bound" stroke="none" fill="#ffffff" fillOpacity={0.9} />
          <Line dataKey="heat" name="Predicted heat risk" stroke={CHART_COLORS.series[0]} strokeWidth={2.5} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
