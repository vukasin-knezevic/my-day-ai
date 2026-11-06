import { NavLink, Outlet } from 'react-router-dom'

const MAIN = [
  { to: '/', label: 'Danas', icon: '🌅' },
  { to: '/faks', label: 'Faks', icon: '📚' },
  { to: '/trening', label: 'Trening', icon: '🏋️' },
  { to: '/zivot', label: 'Život', icon: '💰' },
  { to: '/vise', label: 'Više', icon: '☰' },
]
const EXTRA = [
  { to: '/planer', label: 'Planer', icon: '🧠' },
  { to: '/pregled', label: 'Pregled', icon: '📊' },
  { to: '/ai', label: 'AI', icon: '🤖' },
  { to: '/podesavanja', label: 'Podešavanja', icon: '⚙️' },
]

function linkCls({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`
}

export default function Layout() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 p-3 md:block dark:border-slate-800">
        <div className="mb-4 px-3 text-lg font-bold">🌅 My Day AI</div>
        <nav aria-label="Glavna navigacija" className="space-y-1">
          {[...MAIN.filter((m) => m.to !== '/vise'), ...EXTRA].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkCls}>
              <span aria-hidden>{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <Outlet />
      </main>
      <nav
        aria-label="Donja navigacija"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-900"
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
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export { EXTRA }
