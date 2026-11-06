import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import { applyTheme, watchSystemTheme } from './lib/theme'
import Layout from './components/Layout'
import Onboarding from './pages/Onboarding'
import Planner from './pages/Planner'
import Ai from './pages/Ai'
import Shortcuts from './components/Shortcuts'
import { useReminders } from './lib/useReminders'
import Study from './pages/Study'
import Today from './pages/Today'
import More from './pages/More'
import Settings from './pages/Settings'

// Pages with charts are loaded on demand, so the chart library is not in the first download.
const Workout = lazy(() => import('./pages/Workout'))
const Life = lazy(() => import('./pages/Life'))
const Overview = lazy(() => import('./pages/Overview'))

export default function App() {
  const hydrated = useStore((s) => s.hydrated)
  const onboarded = useStore((s) => s.settings.onboarded)
  const theme = useStore((s) => s.settings.theme)

  useReminders()

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    return watchSystemTheme(() => applyTheme('system'))
  }, [theme])

  if (!hydrated) return <p className="p-6">Učitavanje…</p>
  if (!onboarded) return <Onboarding />

  return (
    <HashRouter>
      <Shortcuts />
      <Suspense fallback={<p className="p-6">Učitavanje…</p>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="faks" element={<Study />} />
            <Route path="planer" element={<Planner />} />
            <Route path="trening" element={<Workout />} />
            <Route path="zivot" element={<Life />} />
            <Route path="pregled" element={<Overview />} />
            <Route path="ai" element={<Ai />} />
            <Route path="vise" element={<More />} />
            <Route path="podesavanja" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
