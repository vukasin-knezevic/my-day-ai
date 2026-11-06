import { useEffect, useRef } from 'react'
import { selectData, useStore } from '../store'
import { dueReminders } from './reminders'

export const notificationsSupported = () => typeof Notification !== 'undefined'

/** Asks the browser for permission. Returns true if granted. */
export async function requestNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

/** Checks once a minute while the app is open. Honest limit: no server -> no push when the app is closed. */
export function useReminders() {
  const enabled = useStore((s) => s.settings.reminders)
  const sent = useRef(new Set<string>())
  useEffect(() => {
    if (!enabled || !notificationsSupported() || Notification.permission !== 'granted') return
    const tick = () => {
      const data = selectData(useStore.getState())
      for (const r of dueReminders(data, new Date(), sent.current)) {
        sent.current.add(r.id)
        try {
          new Notification(r.title, { body: r.body, icon: '/icon.svg' })
        } catch {
          /* some mobile browsers only allow notifications via a service worker */
        }
      }
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [enabled])
}
