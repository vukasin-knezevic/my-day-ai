import IosInstallHint from './IosInstallHint'
import UpdateBanner from './UpdateBanner'
import BackupNudge from './BackupNudge'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useToast } from '../lib/toast'
import UndoBar from './UndoBar'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
const Tutorial = lazy(() => import('./Tutorial'))
import { useT } from '../i18n'
import type { BaseKey } from '../i18n'

/** Every section, most used first. All of them live in the one scrollable strip of the bottom bar. */
export const SECTIONS: { to: string; label: BaseKey; icon: string }[] = [
  { to: '/', label: 'nav.today', icon: '🌅' },
  { to: '/study', label: 'nav.study', icon: '📚' },
  { to: '/workout', label: 'nav.workout', icon: '🏋️' },
  { to: '/zivot', label: 'nav.life', icon: '💰' },
  { to: '/planer', label: 'nav.planner', icon: '🧠' },
  { to: '/pregled', label: 'nav.overview', icon: '📊' },
  { to: '/dostignuca', label: 'nav.achievements', icon: '🏆' },
  { to: '/ai', label: 'nav.ai', icon: '🤖' },
]
/** Settings is not in the strip: it is a static button in the right corner of the bar. */
export const SETTINGS = { to: '/settings', label: 'nav.settings' as BaseKey, icon: '⚙️' }

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const tabCls = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 min-w-11 flex-col items-center justify-center text-xs ${
    isActive ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'
  }`

/** The bottom bar: a swipeable strip (4 sections visible at once) + Settings pinned on the right. */
function BottomNav() {
  const { t } = useT()
  const { pathname } = useLocation()
  const strip = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const [edges, setEdges] = useState({ left: false, right: true })

  const measure = () => {
    const el = strip.current
    if (!el) return
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }))
  }

  // the active tab comes into view: instantly on the first render, smoothly after that
  useEffect(() => {
    const el = strip.current?.querySelector('[aria-current="page"]')
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: first.current || reducedMotion() ? 'auto' : 'smooth',
      })
    }
    first.current = false
    measure()
  }, [pathname])

  return (
    <nav
      aria-label={t('nav.bottom')}
      className="fixed inset-x-0 bottom-0 z-10 flex border-t pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="relative min-w-0 flex-1">
        <div
          ref={strip}
          data-nav-strip
          onScroll={measure}
          onFocusCapture={(e) => e.target.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })}
          className="nav-strip flex snap-x snap-proximity overflow-x-auto overscroll-x-contain"
        >
          {SECTIONS.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={(s) => `${tabCls(s)} w-1/4 flex-none snap-start`}
            >
              <span aria-hidden className="text-lg">
                {n.icon}
              </span>
              <span className="block max-w-full truncate px-1">{t(n.label)}</span>
            </NavLink>
          ))}
        </div>
        <div
          aria-hidden
          data-fade="left"
          className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent transition-opacity dark:from-slate-900 ${edges.left ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          aria-hidden
          data-fade="right"
          className={`pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent transition-opacity dark:from-slate-900 ${edges.right ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      <NavLink
        to={SETTINGS.to}
        className={(s) =>
          `${tabCls(s)} w-[4.5rem] flex-none border-l border-slate-200 dark:border-slate-800`
        }
      >
        <span aria-hidden className="text-lg">
          {SETTINGS.icon}
        </span>
        <span className="block max-w-full truncate px-1">{t(SETTINGS.label)}</span>
      </NavLink>
    </nav>
  )
}

function linkCls({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`
}

function Toasts() {
  const messages = useToast((s) => s.messages)
  if (!messages.length) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="anim-toast fixed inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 mx-auto max-w-sm space-y-1 rounded-2xl bg-slate-900 p-3 text-sm text-white shadow-lg"
    >
      {messages.map((m) => (
        <p key={m}>{m}</p>
      ))}
    </div>
  )
}

export default function Layout() {
  const { t } = useT()
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen md:flex">
      <Toasts />
      <UndoBar />
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 p-3 md:block dark:border-slate-800">
        <div className="mb-4 px-3 text-lg font-bold">🌅 My Day AI</div>
        <nav aria-label={t('nav.main')} className="space-y-1">
          {[...SECTIONS, SETTINGS].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkCls}>
              <span aria-hidden>{n.icon}</span> {t(n.label)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main
        className={`mx-auto w-full max-w-3xl flex-1 ${pathname === '/' ? 'lg:max-w-6xl' : ''} p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pb-8`}
      >
        <IosInstallHint />
        <UpdateBanner />
        <Suspense fallback={null}>
          <Tutorial />
        </Suspense>
        <BackupNudge />
        <div key={pathname} className="anim-page" data-tour-page>
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
