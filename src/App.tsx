import { initUpdates } from './lib/updates'
import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import { applyTheme, watchSystemTheme } from './lib/theme'
import Layout from './components/Layout'
import LoadError from './components/LoadError'
import IosInstallFirst from './components/IosInstallFirst'
import { currentEnv, isIos } from './lib/ios'
import { requestPersistentStorage } from './lib/storage'
import Shortcuts from './components/Shortcuts'
import BackController from './components/BackController'
import { useReminders } from './lib/useReminders'
import Today from './pages/Today'
import Splash from './components/Splash'
import { BootScreen } from './components/SunLogo'
import { useNotificationActions } from './lib/routineNotify'

// Pages with charts are loaded on demand, so the chart library is not in the first download.
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Planner = lazy(() => import('./pages/Planner'))
const Ai = lazy(() => import('./pages/Ai'))
const Study = lazy(() => import('./pages/Study'))
const More = lazy(() => import('./pages/More'))
const Settings = lazy(() => import('./pages/Settings'))
const Workout = lazy(() => import('./pages/Workout'))
const Life = lazy(() => import('./pages/Life'))
const Overview = lazy(() => import('./pages/Overview'))
const Achievements = lazy(() => import('./pages/Achievements'))

export default function App() {
  const hydrated = useStore((s) => s.hydrated)
  const hydrationError = useStore((s) => s.hydrationError)
  const onboarded = useStore((s) => s.settings.onboarded)
  const theme = useStore((s) => s.settings.theme)
  const [stayInSafari, setStayInSafari] = useState(false)

  // once the app is in use, ask the browser to keep the data even when the device runs low on space
  useEffect(() => {
    if (hydrated && onboarded) void requestPersistentStorage()
  }, [hydrated, onboarded])

  useReminders()
  useNotificationActions()
  useEffect(() => {
    if (import.meta.env.PROD) initUpdates(() => useStore.getState().settings.autoUpdate)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    return watchSystemTheme(() => applyTheme('system'))
  }, [theme])

  if (hydrationError) return <LoadError />
  if (!hydrated) return <BootScreen />
  if (!onboarded) {
    // iPhone in Safari: installing comes first, because what is typed in Safari stays in Safari
    const env = currentEnv()
    if (isIos(env) && !env.standalone && !stayInSafari)
      return <IosInstallFirst onContinue={() => setStayInSafari(true)} />
    return (
      <Suspense fallback={<BootScreen />}>
        <Onboarding />
      </Suspense>
    )
  }

  return (
    <HashRouter>
      <Shortcuts />
      <Splash />
      <BackController />
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="faks" element={<Study />} />
            <Route path="planer" element={<Planner />} />
            <Route path="trening" element={<Workout />} />
            <Route path="zivot" element={<Life />} />
            <Route path="pregled" element={<Overview />} />
            <Route path="dostignuca" element={<Achievements />} />
            <Route path="ai" element={<Ai />} />
            <Route path="vise" element={<More />} />
            <Route path="podesavanja" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
