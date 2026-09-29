/**
 * Standard page frame: title block, filter slot, body and a consistent gap
 * scale. Keeps every screen's vertical rhythm identical.
 */
export default function PageShell({ children, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-[1600px] space-y-5 animate-[var(--animate-fade-in)] ${className}`}>
      {children}
    </div>
  )
}

/** Titled white panel - the workhorse container for charts and tables. */
export function Panel({ title, description, actions, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`card flex flex-col ${className}`}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-body">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
