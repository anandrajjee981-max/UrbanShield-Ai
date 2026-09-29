import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Accessible dialog built on the native `<dialog>` element, so focus trapping
 * and `Esc` handling come from the platform.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-0 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)] backdrop:bg-navy-900/50 backdrop:backdrop-blur-sm"
    >
      <div className={`${widths[size] ?? widths.md} w-full`}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-body">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>

        {footer ? <div className="flex justify-end gap-3 border-t border-line bg-slate-50 px-6 py-4">{footer}</div> : null}
      </div>
    </dialog>
  )
}
