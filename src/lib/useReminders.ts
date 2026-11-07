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

/**
 * Shows one notification. Chrome on Android forbids `new Notification(...)`, so the service worker
 * shows it; the constructor is only the fallback (laptops, or no service worker). Returns true if shown.
 */
export async function showNotification(title: string, body: string): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const icon = `${import.meta.env.BASE_URL}icon-192.png`
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, { body, icon })
      return true
    }
  } catch {
    /* fall through to the constructor */
  }
  try {
    new Notification(title, { body, icon })
    return true
  } catch {
    return false
  }
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
        void showNotification(r.title, r.body)
      }
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [enabled])
}
