import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Bell,
  ChevronDown,
  CloudSun,
  FileText,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Thermometer,
  User as UserIcon,
  X,
} from 'lucide-react'
import { APP_NAME } from '../../utils/constants.js'
import { performSearch, setMobileNavOpen, setSearchOpen, setSearchQuery } from '../../redux/slices/uiSlice.js'
import { markAllRead, markRead } from '../../redux/slices/notificationSlice.js'
import { selectWeather } from '../../redux/slices/dashboardSlice.js'
import { selectCurrentUser, selectIsAuthority } from '../../redux/selectors.js'
import { selectNotifications, selectUnreadCount } from '../../redux/slices/notificationSlice.js'
import { switchRole } from '../../redux/slices/authSlice.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { formatRelativeTime } from '../../utils/formatDate.js'
import Badge from '../common/Badge.jsx'

/**
 * Application header.
 *
 * Search, live weather, the notification centre and the profile menu all read
 * from Redux - there is no local placeholder state anywhere in this file.
 */

const WEATHER_ICONS = { sun: Sun, 'cloud-sun': CloudSun }

function GlobalSearch() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAuthority = useSelector(selectIsAuthority)
  const { results, loading, open } = useSelector((state) => state.ui.search)
  const [local, setLocal] = useState('')
  const containerRef = useRef(null)
  const debounced = useDebounce(local, 350)

  useEffect(() => {
    dispatch(setSearchQuery(debounced))
    if (debounced.trim().length >= 2) dispatch(performSearch(debounced))
  }, [debounced, dispatch])

  useEffect(() => {
    function handleOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) dispatch(setSearchOpen(false))
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dispatch])

  // Departments are hidden from citizens, so they must not count as a match.
  const hasResults =
    results.reports.length + results.wards.length + (isAuthority ? results.departments.length : 0) > 0
  const showPanel = open && local.trim().length >= 2

  const go = (path) => {
    setLocal('')
    dispatch(setSearchQuery(''))
    navigate(path)
  }

  // Search results are city wide, so every link has to land in the viewer's own
  // area - a citizen has no `/authority` routes to open.
  const reportPath = (id) => `${isAuthority ? '/authority' : '/citizen'}/reports/${id}`
  const mapPath = `${isAuthority ? '/authority' : '/citizen'}/map`

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={local}
          onChange={(event) => setLocal(event.target.value)}
          placeholder="Search reports, locations, wards, issues…"
          aria-label="Search reports, locations, wards and issues"
          className="h-10 w-full rounded-lg border border-line bg-slate-50 pl-9 pr-9 text-sm text-ink transition placeholder:text-muted focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        {local ? (
          <button
            type="button"
            onClick={() => setLocal('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-ink"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          {loading ? (
            <p className="px-4 py-3 text-xs text-body">Searching…</p>
          ) : hasResults ? (
            <div className="max-h-80 overflow-y-auto py-1.5">
              {results.reports.length ? (
                <div className="px-4 pb-1 pt-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Reports</p>
                </div>
              ) : null}
              {results.reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => go(reportPath(report.id))}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-slate-50"
                >
                  <FileText size={14} className="shrink-0 text-brand-600" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-ink">{report.issueLabel}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {report.trackingId} · {report.ward}
                    </span>
                  </span>
                </button>
              ))}

              {results.wards.length ? (
                <div className="border-t border-line px-4 pb-1 pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Locations</p>
                </div>
              ) : null}
              {results.wards.map((ward) => (
                <button
                  key={ward}
                  type="button"
                  onClick={() => {
                    dispatch(setSearchQuery(''))
                    navigate(mapPath)
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-body transition hover:bg-slate-50"
                >
                  <ShieldCheck size={14} className="shrink-0 text-muted" aria-hidden="true" />
                  {ward}
                </button>
              ))}
              {/* Departments are an internal directory - citizens never get this group. */}
              {isAuthority && results.departments.length ? (
                <>
                  <div className="border-t border-line px-4 pb-1 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Departments</p>
                  </div>
                  {results.departments.map((department) => (
                    <button
                      key={department.id}
                      type="button"
                      onClick={() => go('/authority/departments')}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-body transition hover:bg-slate-50"
                    >
                      <ShieldCheck size={14} className="shrink-0 text-muted" aria-hidden="true" />
                      {department.name}
                    </button>
                  ))}
                </>
              ) : null}
            </div>
          ) : (
            <p className="px-4 py-3 text-xs text-body">No matches for “{local.trim()}”.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function WeatherChip() {
  const weather = useSelector(selectWeather)

  if (!weather) return null
  const Icon = WEATHER_ICONS[weather.icon] ?? Sun

  return (
    <div
      className="hidden items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-1.5 md:flex"
      title={`Humidity ${weather.humidity}% · Wind ${weather.windSpeed} km/h`}
    >
      <Icon size={18} className="text-risk-medium" aria-hidden="true" />
      <div className="leading-tight">
        <p className="flex items-center gap-1 text-sm font-semibold text-ink">
          <Thermometer size={12} className="text-risk-high" aria-hidden="true" />
          {weather.temperature}°C
        </p>
        <p className="text-[11px] text-muted">{weather.condition}</p>
      </div>
    </div>
  )
}

const SEVERITY_TONE = { high: 'danger', medium: 'warning', low: 'success', info: 'info' }

function NotificationBell() {
  const dispatch = useDispatch()
  const isAuthority = useSelector(selectIsAuthority)
  const notifications = useSelector(selectNotifications)
  const unread = useSelector(selectUnreadCount)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-body transition hover:bg-slate-50 hover:text-ink"
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-high px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => dispatch(markAllRead())}
                className="text-xs font-semibold text-brand-600 transition hover:text-brand-700"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length ? (
              notifications.slice(0, 12).map((item) => (
                <Link
                  key={item.id}
                  to={
                    item.reportId
                      ? `${isAuthority ? '/authority' : '/citizen'}/reports/${item.reportId}`
                      : '/citizen/notifications'
                  }
                  onClick={() => {
                    dispatch(markRead(item.id))
                    setOpen(false)
                  }}
                  className={`flex gap-3 border-b border-line px-4 py-3 transition last:border-0 hover:bg-slate-50 ${
                    item.read ? '' : 'bg-brand-50/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                      {item.title}
                      {!item.read ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-label="Unread" /> : null}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-body">{item.body}</p>
                    <p className="mt-1 text-[10px] text-muted">{formatRelativeTime(item.createdAt)}</p>
                  </div>
                  <Badge tone={SEVERITY_TONE[item.severity] ?? 'neutral'} size="sm" dot>
                    {item.severity}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-xs text-body">You are all caught up.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ProfileMenu() {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const isAuthority = useSelector(selectIsAuthority)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-lg border border-transparent px-1.5 py-1 transition hover:border-line hover:bg-white"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-brand-300">
          {initials}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold text-ink">{user?.name}</span>
          <span className="block text-[11px] text-muted">{user?.roleLabel}</span>
        </span>
        <ChevronDown size={14} className="hidden text-muted sm:block" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-pop"
        >
          <div className="border-b border-line px-4 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
            <div className="mt-2">
              <Badge tone="brand" size="sm">
                {user?.roleLabel}
              </Badge>
            </div>
          </div>

          <Link
            to={isAuthority ? '/authority/settings' : '/citizen/reports'}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-body transition hover:bg-slate-50 hover:text-ink"
          >
            {isAuthority ? <Settings size={15} /> : <UserIcon size={15} />}
            {isAuthority ? 'Account settings' : 'My reports'}
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              dispatch(switchRole('citizen'))
              setOpen(false)
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-body transition hover:bg-slate-50 hover:text-ink"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function Header() {
  const dispatch = useDispatch()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={() => dispatch(setMobileNavOpen(true))}
        aria-label="Open navigation"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-body transition hover:bg-slate-50 lg:hidden"
      >
        <Menu size={18} />
      </button>

      <Link to="/" className="hidden shrink-0 items-center gap-2 xl:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-navy-900">
          <ShieldCheck size={17} aria-hidden="true" />
        </span>
        <span className="text-sm font-bold tracking-tight text-ink">{APP_NAME}</span>
      </Link>

      <div className="flex flex-1 justify-center">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <WeatherChip />
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  )
}
