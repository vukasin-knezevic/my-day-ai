// New versions of the app. The service worker downloads a new version in the background; this module
// turns that into a small state the UI can show: nothing / downloading (0-100%) / ready to restart.
import { create } from 'zustand'
import { registerSW } from 'virtual:pwa-register'
import { flushStorage } from './storage'

export type UpdatePhase = 'idle' | 'downloading' | 'ready'

interface UpdateState {
  phase: UpdatePhase
  /** 0-100. The browser does not report download bytes, so while downloading this is an honest estimate. */
  progress: number
  /** Applies the downloaded version: the app restarts. Set once the service worker is registered. */
  restart: () => void
}

export const useUpdate = create<UpdateState>()(() => ({
  phase: 'idle',
  progress: 0,
  restart: () => window.location.reload(),
}))

let timer: ReturnType<typeof setInterval> | undefined

/** Moves the bar towards 90% while the download runs; it never claims 100% before the worker is ready. */
function startProgress() {
  clearInterval(timer)
  useUpdate.setState({ phase: 'downloading', progress: 5 })
  timer = setInterval(() => {
    const { phase, progress } = useUpdate.getState()
    if (phase !== 'downloading') return clearInterval(timer)
    useUpdate.setState({ progress: Math.min(90, progress + (90 - progress) * 0.12 + 0.5) })
  }, 400)
}

function setReady() {
  clearInterval(timer)
  useUpdate.setState({ phase: 'ready', progress: 100 })
}

/** Test and UI helpers: the same transitions the service worker events cause. */
export const updateEvents = { startProgress, setReady }

/** Registers the service worker and watches for new versions. Call once at start. */
export function initUpdates(autoUpdate: () => boolean) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const update = registerSW({
    immediate: true,
    onNeedRefresh: setReady,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const watch = () => {
        // the very first install of the service worker also fires `updatefound`: that is not an update
        if (!navigator.serviceWorker.controller) return
        const worker = registration.installing
        if (!worker) return
        startProgress()
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) setReady()
        })
      }
      registration.addEventListener('updatefound', watch)
      // look for a new version now and then, and whenever the app comes back to the front
      const check = () => void registration.update().catch(() => {})
      setInterval(check, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
        // "automatic updates": once a downloaded version is waiting and the app is out of sight, switch to it
        else if (autoUpdate() && useUpdate.getState().phase === 'ready') void restart()
      })
    },
  })
  // a change made a moment ago may still be on its way to the database: wait for it, then restart
  const restart = () => flushStorage().then(() => update(true))
  useUpdate.setState({ restart: () => void restart() })
}
