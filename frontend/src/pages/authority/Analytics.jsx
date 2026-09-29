import { useEffect } from 'react'
import { Activity, AlertTriangle, Droplet, Flame, Leaf, RefreshCw, TrendingUp } from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import FilterBar from '../../components/common/FilterBar.jsx'
import Button from '../../components/common/Button.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import { StatCardSkeleton } from '../../components/common/Skeleton.jsx'
import { DonutChart, PredictionChart, ReportsTrendChart, RiskTrendChart, TopIssueBarChart, WardRiskChart } from '../../components/analytics/Charts.jsx'
import { PredictionCards, RecommendationList } from '../../components/ai/AiAssistant.jsx'
import { AiInsightList } from '../../components/ai/AiInsightCard.jsx'
import { useAnalytics } from '../../hooks/useAnalytics.js'
import { CITY } from '../../utils/constants.js'

/**
 * Risk Analytics.
 *
 * The authority's analytical view: headline KPIs, category trends, ward ranking,
 * the 7-day forecast, AI insights and recommended interventions - all for the
 * same filter window.
 */
export default function Analytics() {
  const analytics = useAnalytics()
  const overview = analytics.overview

  useEffect(() => {
    document.title = 'Risk Analytics · UbranShieldAI'
  }, [])

  if (analytics.error) {
    return (
      <PageShell>
        <PageHeader title="Risk Analytics" subtitle="Trends, forecasts and AI recommendations for the city." />
        <ErrorState
          title="Analytics unavailable"
          message={analytics.error}
          onRetry={analytics.refetch}
        />
      </PageShell>
    )
  }

  const kpis = [
    { key: 'highHeatRiskZones', label: 'High Heat Risk Zones', value: overview?.highHeatRiskZones, icon: Flame, tone: 'heat' },
    { key: 'waterStressAreas', label: 'Water Stress Areas', value: overview?.waterStressAreas, icon: Droplet, tone: 'water' },
    { key: 'infrastructureRisks', label: 'Infrastructure Risks', value: overview?.infrastructureRisks, icon: Activity, tone: 'infrastructure' },
    { key: 'totalGreenCover', label: 'Green Cover', value: overview?.totalGreenCover, suffix: ' km²', icon: Leaf, tone: 'low' },
    { key: 'openIncidents', label: 'Open Incidents', value: overview?.openIncidents, icon: AlertTriangle, tone: 'medium' },
    { key: 'resolutionRate', label: 'Resolution Rate', value: overview?.resolutionRate, suffix: '%', icon: TrendingUp, tone: 'success' },
  ]

  return (
    <PageShell>
      <PageHeader
        eyebrow={`${CITY.name} · Analytics`}
        title="Risk Analytics"
        subtitle="City-wide risk trends, ward ranking, AI forecasts and the actions they imply."
        actions={
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={analytics.refetch}>
            Refresh
          </Button>
        }
      />

      <FilterBar />

      {/* KPI row */}
      <section aria-label="Analytics key metrics">
        {analytics.loading && !overview ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi) => (
              <StatCard key={kpi.key} label={kpi.label} value={kpi.value ?? 0} suffix={kpi.suffix} icon={kpi.icon} tone={kpi.tone} />
            ))}
          </div>
        )}
      </section>

      {/* AI predictions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">AI Predictions</h2>
        <PredictionCards cards={analytics.predictionCards} loading={analytics.loading} />
      </section>

      {/* Trends */}
      <section className="grid gap-5 lg:grid-cols-2">
        <RiskTrendChart data={analytics.riskTrend} loading={analytics.loading} />
        <ReportsTrendChart data={analytics.reportsTrend} loading={analytics.loading} />
      </section>

      {/* Distributions */}
      <section className="grid gap-5 lg:grid-cols-3">
        <DonutChart
          data={analytics.byCategory}
          loading={analytics.loading}
          title="Category Distribution"
          description="Share of reports by risk category"
        />
        <DonutChart
          data={analytics.byStatus}
          loading={analytics.loading}
          title="Lifecycle Split"
          description="Where every report currently sits"
        />
        <TopIssueBarChart data={analytics.topIssueTypes} loading={analytics.loading} />
      </section>

      {/* Ward ranking + forecast */}
      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <WardRiskChart data={analytics.wardRisk} loading={analytics.loading} />
        <PredictionChart data={analytics.predictions} loading={analytics.loading} />
      </section>

      {/* Insights + recommendations */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="AI Insights" description="What the model is seeing right now" bodyClassName="px-4 pb-4">
          <AiInsightList insights={analytics.insights} />
        </Panel>

        <Panel title="Recommended Actions" description="Derived from the highest scoring risks" bodyClassName="px-4 pb-4">
          <RecommendationList recommendations={analytics.recommendations} loading={analytics.loading} />
        </Panel>
      </section>
    </PageShell>
  )
}
