import { useEffect } from 'react'
import { Bot, Lightbulb, Sparkles } from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import AiAssistant, { PredictionCards, RecommendationList } from '../../components/ai/AiAssistant.jsx'
import { AiInsightList } from '../../components/ai/AiInsightCard.jsx'
import { PredictionChart, WardRiskChart } from '../../components/analytics/Charts.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import { useAnalytics } from '../../hooks/useAnalytics.js'

/**
 * AI Assistant.
 *
 * A question box over the live dataset, framed by the forecasts and
 * recommendations the same model produced, so the officer can go from "what is
 * happening" to "why" to "what do I do" without leaving the page.
 */
export default function AIAssistant() {
  const analytics = useAnalytics()

  useEffect(() => {
    document.title = 'AI Assistant · UbranShieldAI'
  }, [])

  if (analytics.error) {
    return (
      <PageShell>
        <PageHeader title="AI Assistant" subtitle="Ask questions and get recommended actions." />
        <ErrorState title="Assistant unavailable" message={analytics.error} onRetry={analytics.refetch} />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Artificial Intelligence"
        title="AI Assistant"
        subtitle="Ask about current risk, ward performance or open incidents. Answers are generated from the live dataset, not a script."
      />

      <PredictionCards cards={analytics.predictionCards} loading={analytics.loading} />

      <section className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <AiAssistant
          assistant={analytics.assistant}
          onAsk={analytics.ask}
          onReset={analytics.resetAssistant}
          disabled={analytics.loading}
        />

        <div className="space-y-5">
          <PredictionChart data={analytics.predictions} loading={analytics.loading} />
          <WardRiskChart data={analytics.wardRisk} loading={analytics.loading} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="AI Insights"
          description="The signals behind the current picture"
          bodyClassName="px-4 pb-4"
          actions={
            <span className="flex items-center gap-1.5 text-[11px] text-violet-600">
              <Bot size={12} aria-hidden="true" />
              Model v4.2
            </span>
          }
        >
          <AiInsightList insights={analytics.insights} />
        </Panel>

        <Panel
          title="Recommended Actions"
          description="Ranked by expected impact"
          bodyClassName="px-4 pb-4"
          actions={
            <span className="flex items-center gap-1.5 text-[11px] text-brand-600">
              <Lightbulb size={12} aria-hidden="true" />
              {analytics.recommendations.length} suggestions
            </span>
          }
        >
          <RecommendationList recommendations={analytics.recommendations} loading={analytics.loading} />
        </Panel>
      </section>

      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <Sparkles size={12} aria-hidden="true" />
        Recommendations are advisory. Every suggested action still requires a human decision before anything is
        dispatched.
      </p>
    </PageShell>
  )
}
