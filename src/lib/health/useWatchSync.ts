import { useEffect } from 'react'
import { isNative } from '../platform'
import { getHealthSource } from './index'
import { syncHealth } from './sync'

/** Sync on app start and when the app comes back to the front (at most every 15 minutes). No polling. */
export function useWatchSync() {
  useEffect(() => {
    if (!isNative()) return
    const run = () => void syncHealth(getHealthSource())
    run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}
