import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

/**
 * The product's only button.
 *
 * `variant` maps to the token palette - no component should style its own
 * button colours inline.
 */

const VARIANTS = {
  primary:
    'bg-brand-500 text-navy-900 hover:bg-brand-600 disabled:bg-brand-200 shadow-[0_1px_2px_rgba(5,150,105,0.25)]',
  secondary:
    'bg-white text-ink border border-line hover:bg-slate-50 hover:border-brand-200 disabled:text-muted',
  outline:
    'border border-brand-500/40 bg-brand-500/10 text-brand-700 hover:bg-brand-500/20 disabled:text-brand-300',
  outlineMuted:
    'border border-line bg-transparent text-body hover:bg-slate-50 hover:text-ink disabled:text-muted',
  ghost: 'text-body hover:bg-slate-100 hover:text-ink disabled:text-muted',
  danger: 'bg-risk-high text-white hover:bg-red-600 disabled:bg-red-300',
  navy: 'bg-navy-700 text-white hover:bg-navy-800 disabled:text-navy-900/40',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:text-brand-300',
}

const SIZES = {
  xs: 'h-8 px-3 text-xs gap-1.5',
  sm: 'h-9 px-3.5 text-sm gap-2',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-8 w-8 justify-center',
}

const BASE =
  'inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-150 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-70'

/** Shared class recipe, so `Button` and `ButtonLink` can never drift apart. */
function buttonClass({ variant = 'primary', size = 'md', className = '' }) {
  return `${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`
}

function renderIcon(Icon, size) {
  return Icon ? <Icon size={size === 'xs' ? 14 : 16} aria-hidden="true" /> : null
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  type = 'button',
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        renderIcon(Icon, size)
      )}
      {children}
      {IconRight && !loading ? renderIcon(IconRight, size) : null}
    </button>
  )
}

/**
 * A router link that looks like a button.
 *
 * Use this instead of wrapping a `Button` in a `Link` - nesting a real
 * `<button>` inside an `<a>` is invalid and breaks keyboard and screen-reader
 * behaviour.
 */
export function ButtonLink({ to, children, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, className = '', ...rest }) {
  return (
    <Link to={to} className={buttonClass({ variant, size, className })} {...rest}>
      {renderIcon(Icon, size)}
      {children}
      {IconRight ? renderIcon(IconRight, size) : null}
    </Link>
  )
}
