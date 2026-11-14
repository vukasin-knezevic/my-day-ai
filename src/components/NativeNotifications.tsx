import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocalNotifications } from '@capacitor/local-notifications'
import { App as CapApp } from '@capacitor/app'
import { selectData, useStore } from '../store'
import { isNative } from '../lib/platform'
import { ensureChannels, rescheduleAll } from '../lib/nativeNotify'
import { handleRoutineAction } from '../lib/routineNotify'

const whenHydrated = () =>
  new Promise<void>((resolve) => {
    if (useStore.getState().hydrated) return resolve()
    const off = useStore.subscribe((s) => {
      if (s.hydrated) {
        off()
        resolve()
      }
    })
  })

/**
 * Android only (renders nothing): keeps the system's scheduled notifications in step with the data
 * (on start, on return to the app, after every change), and opens the right screen on a tap.
 */
export default function NativeNotifications() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isNative()) return
    void ensureChannels()
    const tap = LocalNotifications.addListener('localNotificationActionPerformed', async (e) => {
      const extra = (e.notification.extra ?? {}) as { key?: string; route?: string }
      await whenHydrated()
      if (e.actionId === 'done' && extra.key) return void handleRoutineAction(extra.key, 'done')
      if (extra.route) navigate(extra.route)
    })
    return () => {
      void tap.then((h) => h.remove())
    }
  }, [navigate])

  useEffect(() => {
    if (!isNative()) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const plan = () => {
      clearTimeout(timer)
      // data changes come in bursts (a sync writes many days): plan once, a moment later
      timer = setTimeout(() => {
        const st = useStore.getState()
        if (st.hydrated) void rescheduleAll(selectData(st))
      }, 1500)
    }
    plan()
    const unsub = useStore.subscribe((s, prev) => {
      if (
        s.hydrated &&
        (s.settings !== prev.settings ||
          s.days !== prev.days ||
          s.activities !== prev.activities ||
          s.assessments !== prev.assessments)
      )
        plan()
    })
    const resume = CapApp.addListener('resume', plan)
    return () => {
      clearTimeout(timer)
      unsub()
      void resume.then((h) => h.remove())
    }
  }, [])

  return null
}
