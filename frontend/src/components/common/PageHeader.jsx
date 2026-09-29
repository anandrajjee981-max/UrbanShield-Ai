import { useEffect } from 'react'

/**
 * Consistent page header: title, supporting copy, optional actions and a
 * date-range chip. Used by every data-driven page so headings never drift.
 */
export default function PageHeader({ title, subtitle, actions, eyebrow, children, className = '' }) {
  useEffect(() => {
    if (title) document.title = `${title} · UbranShieldAI`
  }, [title])

  return (
    <div className={`flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p> : null}
        <h1 className={`text-xl font-bold tracking-tight text-ink sm:text-2xl ${eyebrow ? 'mt-1.5' : ''}`}>{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-body">{subtitle}</p> : null}
        {children}
      </div>

      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  )
}
