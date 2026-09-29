import { useState } from 'react'
import { Bot, Eraser, Send, Sparkles, TrendingDown, TrendingUp, User } from 'lucide-react'
import Button from '../common/Button.jsx'
import Badge from '../common/Badge.jsx'
import { Skeleton } from '../common/Skeleton.jsx'
import { formatRelativeTime } from '../../utils/formatDate.js'

/**
 * AI assistant panel.
 *
 * A question box over the analytics bundle. The answer itself is produced by
 * `analyticsApi`; this component handles the conversation state, the
 * suggested prompts and the empty state.
 */

const SUGGESTIONS = [
  'Which ward has the highest composite risk?',
  'Summarise water stress in the last 7 days',
  'What should we prioritise this week?',
  'How many reports are awaiting verification?',
]

export function AiAssistant({ assistant, onAsk, onReset, disabled = false }) {
  const [question, setQuestion] = useState('')

  function submit(event) {
    event.preventDefault()
    const value = question.trim()
    if (!value || assistant?.loading) return
    onAsk(value)
    setQuestion('')
  }

  return (
    <section className="card flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-2.5 border-b border-violet-100 bg-violet-50/60 px-5 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <Bot size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-violet-900">AI Assistant</p>
          <p className="text-[10px] text-violet-600">Answers are generated from the live dataset</p>
        </div>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            aria-label="Clear conversation"
            className="rounded-lg p-1.5 text-violet-500 transition hover:bg-violet-100"
          >
            <Eraser size={15} />
          </button>
        ) : null}
      </header>

      <div className="scroll-area flex-1 space-y-3 px-5 py-4" style={{ maxHeight: 380 }}>
        {!assistant?.messages?.length ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-body">
              Ask anything about current risk levels, ward performance, open incidents or the recommended actions for
              this week.
            </p>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Try asking</p>
              <ul className="space-y-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => onAsk(suggestion)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-line px-3 py-2 text-left text-[12px] text-body transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {assistant.messages.map((message) => (
              <li key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex gap-2.5'}>
                {message.role === 'user' ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy-900 px-3.5 py-2 text-[12px] leading-relaxed text-white">
                    {message.content}
                  </p>
                ) : (
                  <>
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <Sparkles size={12} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="rounded-2xl rounded-tl-sm bg-slate-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink">
                        {message.content}
                      </p>
                      {message.followUps?.length ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {message.followUps.map((followUp) => (
                            <li key={followUp}>
                              <button
                                type="button"
                                onClick={() => onAsk(followUp)}
                                className="rounded-full border border-line px-2.5 py-1 text-[10px] font-medium text-body transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                              >
                                {followUp}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="mt-1.5 text-[10px] text-muted">{formatRelativeTime(message.createdAt)}</p>
                    </div>
                  </>
                )}
              </li>
            ))}

            {assistant.loading ? (
              <li className="flex gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Sparkles size={12} aria-hidden="true" />
                </span>
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </li>
            ) : null}
          </ol>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="ai-question" className="sr-only">
            Ask the AI assistant
          </label>
          <textarea
            id="ai-question"
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) submit(event)
            }}
            placeholder="Ask about risk, wards or incidents…"
            className="input max-h-28 min-h-[38px] resize-none py-2"
          />
          <Button type="submit" variant="primary" size="sm" disabled={!question.trim() || assistant?.loading} aria-label="Send question">
            <Send size={15} />
          </Button>
        </div>
      </form>
    </section>
  )
}

/** Headline AI prediction cards (heat, water, infrastructure, air quality). */
export function PredictionCards({ cards = [], loading = false }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card space-y-3 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const rising = card.trend > 0
        return (
          <article key={card.id} className="card card-interactive p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold text-body">{card.title}</p>
              <Badge tone={card.level} size="sm" dot>
                {card.level}
              </Badge>
            </div>

            <p className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink">{card.score}</span>
              <span className="text-[10px] text-muted">/100</span>
              <span className={`ml-auto inline-flex items-center gap-0.5 text-[10px] font-bold ${rising ? 'text-risk-high' : 'text-brand-600'}`}>
                {rising ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
                {Math.abs(card.trend)}%
              </span>
            </p>

            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${Math.min(100, card.score)}%`, backgroundColor: rising ? '#EF4444' : '#10B981' }}
              />
            </div>

            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">{card.summary}</p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">{card.metric}</p>
          </article>
        )
      })}
    </div>
  )
}

/** Recommendations list with impact and ownership. */
export function RecommendationList({ recommendations = [], loading = false }) {
  if (loading) {
    return (
      <ul className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="card space-y-2 p-4">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-2.5 w-full" />
          </li>
        ))}
      </ul>
    )
  }

  if (!recommendations.length) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
        No recommendations for this window.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {recommendations.map((item) => (
        <li key={item.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <User size={12} className="text-muted" aria-hidden="true" />
              {item.title}
            </p>
            <Badge tone={item.impact} size="sm">
              {item.impact} impact
            </Badge>
          </div>

          <p className="mt-1.5 text-[12px] leading-relaxed text-body">{item.description}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted">
            <span>{item.timeline}</span>
            <span>{item.owner}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default AiAssistant
