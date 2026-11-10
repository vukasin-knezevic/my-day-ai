import IosInstallHint from './IosInstallHint'
import UpdateBanner from './UpdateBanner'
import BackupNudge from './BackupNudge'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useToast } from '../lib/toast'
import UndoBar from './UndoBar'
import { useT } from '../i18n'
import type { BaseKey } from '../i18n'

const MAIN: { to: string; label: BaseKey; icon: string }[] = [
  { to: '/', label: 'nav.today', icon: '🌅' },
  { to: '/faks', label: 'nav.study', icon: '📚' },
  { to: '/trening', label: 'nav.workout', icon: '🏋️' },
  { to: '/zivot', label: 'nav.life', icon: '💰' },
  { to: '/vise', label: 'nav.more', icon: '☰' },
]
const EXTRA: { to: string; label: BaseKey; icon: string }[] = [
  { to: '/planer', label: 'nav.planner', icon: '🧠' },
  { to: '/pregled', label: 'nav.overview', icon: '📊' },
  { to: '/ai', label: 'nav.ai', icon: '🤖' },
  { to: '/podesavanja', label: 'nav.settings', icon: '⚙️' },
]

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
          {[...MAIN.filter((m) => m.to !== '/vise'), ...EXTRA].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkCls}>
              <span aria-hidden>{n.icon}</span> {t(n.label)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pb-8">
        <IosInstallHint />
        <UpdateBanner />
        <BackupNudge />
        <div key={pathname} className="anim-page">
          <Outlet />
        </div>
      </main>
      <nav
        aria-label={t('nav.bottom')}
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-900"
      >
        {MAIN.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center text-xs ${
                isActive
                  ? 'font-bold text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`
            }
          >
            <span aria-hidden className="text-lg">
              {n.icon}
            </span>
            {t(n.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export { EXTRA }
