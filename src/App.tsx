import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import { applyTheme, watchSystemTheme } from './lib/theme'
import Layout from './components/Layout'
import Onboarding from './pages/Onboarding'
import Placeholder from './pages/Placeholder'
import Planner from './pages/Planner'
import Workout from './pages/Workout'
import Study from './pages/Study'
import Today from './pages/Today'
import More from './pages/More'
import Settings from './pages/Settings'

export default function App() {
  const hydrated = useStore((s) => s.hydrated)
  const onboarded = useStore((s) => s.settings.onboarded)
  const theme = useStore((s) => s.settings.theme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    return watchSystemTheme(() => applyTheme('system'))
  }, [theme])

  if (!hydrated) return <p className="p-6">Učitavanje…</p>
  if (!onboarded) return <Onboarding />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="faks" element={<Study />} />
          <Route path="planer" element={<Planner />} />
          <Route path="trening" element={<Workout />} />
          <Route path="zivot" element={<Placeholder title="💰 Život" phase="fazi 6" />} />
          <Route path="pregled" element={<Placeholder title="📊 Pregled" phase="fazi 9" />} />
          <Route path="ai" element={<Placeholder title="🤖 AI" phase="fazi 8" />} />
          <Route path="vise" element={<More />} />
          <Route path="podesavanja" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
