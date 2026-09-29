import { useEffect, useState } from 'react'
import { Flame, Lightbulb, Sparkles, TrendingUp, Waves } from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import FilterBar from '../../components/common/FilterBar.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import Badge from '../../components/common/Badge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { DonutChart, PredictionChart, ReportsTrendChart, RiskTrendChart, WardRiskChart } from '../../components/analytics/Charts.jsx'
import { RecommendationList } from '../../components/ai/AiAssistant.jsx'
import { AiInsightList } from '../../components/ai/AiInsightCard.jsx'
import { useAnalytics } from '../../hooks/useAnalytics.js'
import { BRAND_MESSAGE, CITY } from '../../utils/constants.js'

/**
 * City analytics (citizen view).
 *
 * The same dataset the officers work with, framed for a resident: what is
 * happening in the city, which wards are hottest, and what the model expects
 * next. Filters are the same global ones, so the numbers always agree with the
 * map and the dashboards.
 */
export default function Analytics() {
  const analytics = useAnalytics()
  const [selectedWard, setSelectedWard] = useState(null)

  useEffect(() => {
    document.title = 'City Analytics · UbranShieldAI'
  }, [])

  if (analytics.error) {
    return (
      <PageShell>
        <PageHeader title="City Analytics" subtitle="Trends, forecasts and AI predictions for the city." />
        <ErrorState title="Analytics unavailable" message={analytics.error} onRetry={analytics.refetch} />
      </PageShell>
    )
  }

  const overview = analytics.overview
  const kpis = [
    { label: 'High heat risk zones', value: overview?.highHeatRiskZones, icon: Flame, tone: 'heat' },
    { label: 'Water stress areas', value: overview?.waterStressAreas, icon: Waves, tone: 'water' },
    { label: 'Open incidents', value: overview?.openIncidents, icon: TrendingUp, tone: 'medium' },
    { label: 'Resolution rate', value: overview?.resolutionRate, suffix: '%', icon: TrendingUp, tone: 'success' },
  ]

  return (
    <PageShell>
      <PageHeader
        eyebrow={`${CITY.name} · Open data`}
        title="City Analytics"
        subtitle={BRAND_MESSAGE}
      />

      <FilterBar />

      {/* KPIs */}
      <section aria-label="City key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value ?? 0}
            suffix={kpi.suffix}
            icon={kpi.icon}
            tone={kpi.tone}
            footer="current window"
          />
        ))}
      </section>

      {/* Trends */}
      <section className="grid gap-5 lg:grid-cols-2">
        <RiskTrendChart data={analytics.riskTrend} loading={analytics.loading} />
        <ReportsTrendChart data={analytics.reportsTrend} loading={analytics.loading} />
      </section>

      {/* Ward ranking - clickable, filters the rest of the page */}
      <section>
        <WardRiskChart
          data={selectedWard ? analytics.wardRisk.filter((ward) => ward.ward === selectedWard) : analytics.wardRisk}
          loading={analytics.loading}
          onSelectWard={(ward) => setSelectedWard((current) => (current === ward ? null : ward))}
        />

        {selectedWard ? (
          <p className="mt-2 flex items-center gap-2 text-[11px] text-body">
            <Badge tone="brand" size="sm" dot>
              {selectedWard}
            </Badge>
            Charts above are scoped to {selectedWard}. Clear it to see the whole city.
            <button type="button" onClick={() => setSelectedWard(null)} className="font-semibold text-brand-600 hover:underline">
              Reset
            </button>
          </p>
        ) : null}
      </section>

      {/* Forecast + distribution */}
      <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <PredictionChart data={analytics.predictions} loading={analytics.loading} />
        <DonutChart
          data={analytics.byCategory}
          loading={analytics.loading}
          title="What people report"
          description="Share of reports by issue category"
          centerLabel="Reports"
        />
      </section>

      {/* AI section */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="What the model is seeing"
          description="Signals derived from live city data"
          bodyClassName="px-4 pb-4"
          actions={
            <span className="flex items-center gap-1.5 text-[11px] text-violet-600">
              <Sparkles size={12} aria-hidden="true" />
              AI
            </span>
          }
        >
          <AiInsightList insights={analytics.insights} />
        </Panel>

        <Panel
          title="What the city can do"
          description="Actions the model recommends"
          bodyClassName="px-4 pb-4"
          actions={
            <span className="flex items-center gap-1.5 text-[11px] text-brand-600">
              <Lightbulb size={12} aria-hidden="true" />
              Recommendations
            </span>
          }
        >
          {analytics.recommendations.length ? (
            <RecommendationList recommendations={analytics.recommendations} loading={analytics.loading} />
          ) : (
            <EmptyState
              title="No recommendations yet"
              message="The model has nothing to flag for the selected filters."
              icon={Lightbulb}
            />
          )}
        </Panel>
      </section>
    </PageShell>
  )
}
